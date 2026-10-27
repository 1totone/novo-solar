"""Radiação direta incidente na janela contra o EnergyPlus (F3.5), com e sem as placas.

Uso:
  ENERGYPLUS_DIR=/caminho/do/EnergyPlus-26.2.0 python3 -I docs/validacao/scripts/energyplus_indicadores.py
Saída: docs/validacao/casos/energyplus/indicadores.json; saídas brutas em .cache/energyplus-f35/.
Dependências: as de energyplus_fracao_ensolarada.py (numpy, pandas, pvlib, shapely), pythermalcomfort
(classes do F3.4), o EnergyPlus 26.2.0 e os EPWs de .cache/epw/.

Usa os modelos do F3.8 (energyplus_fracao_ensolarada.modelo), cada um em duas versões: com as placas e
sem nenhuma placa (sem proteção e sem recuo). Saídas por passo de tempo (6 por hora): Surface Outside
Face Incident Beam Solar Radiation Rate per Area da janela (DNI do passo · fração ensolarada · cos θ,
HeatBalanceSurfaceManager.cc), Site Direct Solar Radiation Rate per Area (a DNI do passo, interpolada
pelo WeatherManager.cc), a fração ensolarada e o cos θ da janela.

Conferência da contabilidade:
1. a DNI do passo é a interpolação da spec 09, seção 9.6 (pesos SolarInterpolation), zerada nos passos
   em que o EnergyPlus dá o sol abaixo do horizonte;
2. a radiação incidente de saída é DNI do passo · fração ensolarada · cos θ, com os valores de saída.

Passos da comparação, do EnergyPlus ao método da aplicação (a fração ensolarada de S1 em diante é a
do shapely, e o cos θ é o do sol de cada passo):
- S0: EnergyPlus (DNI interpolada, sol do SUN3/SUN4 no fim do passo, fração do EnergyPlus);
- S1: DNI interpolada (saída do EnergyPlus) com o sol do EnergyPlus e a fração do shapely: geometria;
- S2: DNI constante na hora (EPW), sol do EnergyPlus no fim do passo: interpolação da DNI;
- S3: DNI constante, sol do SPA no fim do passo: modelo do sol;
- S4: DNI constante, sol do SPA no meio do passo: instante das amostras (o método da aplicação).
"""

import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import classificacao_horas as ch  # noqa: E402
import energyplus_fracao_ensolarada as ef  # noqa: E402
import fracao_ensolarada_horaria as feh  # noqa: E402
import mascara_geometria as mg  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "energyplus" / "indicadores.json"
TRABALHO = ROOT / ".cache" / "energyplus-f35"
P = ef.PASSOS
LIMITE = ef.LIMITE
INCIDENTE = "Surface Outside Face Incident Beam Solar Radiation Rate per Area"
DNI_PASSO = "Site Direct Solar Radiation Rate per Area"

# Pesos (anterior, atual, seguinte) da DNI de cada passo, 6 passos por hora (WeatherManager.cc).
PESOS = np.array([[2, 4, 0], [1, 5, 0], [0, 6, 0], [0, 5, 1], [0, 4, 2], [0, 3, 3]]) / 6.0


def modelo(cena):
    texto = ef.modelo(cena)
    return texto + (f"Output:Variable, JANELA, {INCIDENTE}, Timestep;\n"
                    f"Output:Variable, Environment, {DNI_PASSO}, Timestep;\n")


def simular(cena, ep_dir):
    pasta = TRABALHO / cena["id"]
    pasta.mkdir(parents=True, exist_ok=True)
    idf = pasta / "modelo.idf"
    idf.write_text(modelo(cena), encoding="utf-8")
    epw = ef.EPW_DIR / ef.LOCAIS[cena["local"]]
    r = subprocess.run([str(Path(ep_dir) / "energyplus"), "-w", str(epw), "-d", str(pasta), str(idf)],
                       capture_output=True, text=True)
    err = (pasta / "eplusout.err").read_text(encoding="utf-8", errors="replace")
    if r.returncode != 0 or "EnergyPlus Completed Successfully" not in err:
        raise RuntimeError(f"{cena['id']}: EnergyPlus falhou\n{err[-3000:]}")
    passos, series = ef.ler_eso(pasta / "eplusout.eso")
    assert len(passos) == 8760 * P
    return {k[1]: np.array([float(v) for v in vs]) for k, vs in series.items() if k[0] in ("JANELA", "Environment")}


def dni_interpolada(dni_h):
    """DNI de cada passo pela interpolação do EnergyPlus (ano cíclico nas pontas)."""
    ant, prox = np.roll(dni_h, 1), np.roll(dni_h, -1)
    return (ant[:, None] * PESOS[:, 0] + dni_h[:, None] * PESOS[:, 1] + prox[:, None] * PESOS[:, 2]).ravel()


def sol_spa(local, orientacao, at):
    el, az = feh.posicoes(local, P, at)
    er, pr = np.radians(el), np.radians(az - orientacao)
    return np.stack([np.cos(er) * np.sin(pr), np.cos(er) * np.cos(pr), np.sin(er)], axis=1)


def fracao(cena, s):
    """Fração ensolarada (shapely), 0 com o sol fora da janela."""
    j = cena["janela"]
    pls = mg.placas(cena)
    f = np.zeros(len(s))
    for i in np.flatnonzero((s[:, 2] >= LIMITE) & (s[:, 1] >= LIMITE)):
        f[i] = 1.0 - mg.fracao_shapely(j["width"], j["height"], pls, tuple(s[i]))
    return f


def cos_janela(s):
    return np.where((s[:, 2] >= LIMITE) & (s[:, 1] >= LIMITE), s[:, 1], 0.0)


def resumo(e0_passo, e_passo, classes):
    """Somas anuais (kWh/m²) por classe e percentuais, a partir dos valores por passo (W/m²)."""
    e0 = e0_passo.reshape(-1, P).mean(axis=1)  # Wh/m² na hora
    e = e_passo.reshape(-1, P).mean(axis=1)
    out, somas = {}, {}
    for nome, cod in (("quentes", "q"), ("frias", "f"), ("todas", None)):
        sel = np.ones(8760, bool) if cod is None else np.array([c == cod for c in classes])
        somas[nome] = (float(e0[sel].sum()), float(e[sel].sum()))
        out[nome] = {"incidente": round(somas[nome][0] / 1000, 6), "admitida": round(somas[nome][1] / 1000, 6)}
    (q0, q1), (f0, f1) = somas["quentes"], somas["frias"]
    out["bloqueado_nas_quentes"] = round(1 - q1 / q0, 8) if q0 > 0 else None
    out["admitido_nas_frias"] = round(f1 / f0, 8) if f0 > 0 else None
    return out


def classes_padrao(epw):
    tbs = ch.ler_tbs(epw)
    cfg = ch.CONFIGURACOES[0]
    tpma = ch.media_predominante(ch.medias_diarias(tbs), cfg["metodo"]["running"])
    _, lo, up = ch.limites_adaptativos(tpma, 80)
    return ch.classificar(ch.temperatura_hora(tbs, "mean"), np.repeat(lo, 24), np.repeat(up, 24))[0]


def ler_dni_h(epw):
    linhas = epw.read_text(encoding="utf-8", errors="replace").splitlines()[8:]
    return np.array([float(x.split(",")[14]) for x in linhas if x.strip()])


def main():
    ep_dir = os.environ.get("ENERGYPLUS_DIR")
    if not ep_dir:
        sys.exit("Defina ENERGYPLUS_DIR com a pasta do EnergyPlus 26.2.0.")
    cenas = []
    for c in ef.CENAS:
        cenas.append(c)
        cenas.append({**c, "id": c["id"] + "-sem-placas", "dispositivos": [],
                      "janela": {**c["janela"], "setback": 0.0}})
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 2) as ex:
        saidas = dict(zip([c["id"] for c in cenas], ex.map(lambda c: simular(c, ep_dir), cenas)))

    resultado = []
    for cena in ef.CENAS:
        com, sem = saidas[cena["id"]], saidas[cena["id"] + "-sem-placas"]
        epw = ef.EPW_DIR / ef.LOCAIS[cena["local"]]
        local = ef.cabecalho_epw(epw)
        classes = classes_padrao(epw)
        dni_h = ler_dni_h(epw)
        dni_ep = com[DNI_PASSO]

        # 1. DNI do passo: interpolação reproduzida, nos passos em que o EnergyPlus tem DNI.
        interp = dni_interpolada(dni_h)
        com_dni = dni_ep > 0
        dif_dni = float(np.abs(interp[com_dni] - dni_ep[com_dni]).max())
        zerados = int(np.sum((interp > 0) & ~com_dni))
        # 2. Radiação incidente = DNI · fração · cos θ, com as saídas.
        dif_cont = max(float(np.abs(dni_ep * com["Surface Outside Face Sunlit Fraction"]
                                    * com["Surface Outside Face Beam Solar Incident Angle Cosine Value"]
                                    - com[INCIDENTE]).max()),
                       float(np.abs(dni_ep * sem["Surface Outside Face Sunlit Fraction"]
                                    * sem["Surface Outside Face Beam Solar Incident Angle Cosine Value"]
                                    - sem[INCIDENTE]).max()))
        # Sem placas, a fração do EnergyPlus é 1 com o sol na janela (0 com o sol atrás, cos θ < 0).
        sem_frac = sem["Surface Outside Face Sunlit Fraction"][sem["Surface Outside Face Beam Solar Incident Angle Cosine Value"] > LIMITE]
        assert np.all(sem_frac == 1.0), cena["id"]

        s_ep = ef.sol_energyplus(local, cena["orientacao"])
        s_fim = sol_spa(local, cena["orientacao"], "end")
        s_meio = sol_spa(local, cena["orientacao"], "middle")
        dni_const = np.repeat(dni_h, P)
        passos = {"S0": (sem[INCIDENTE], com[INCIDENTE])}
        f_ep, c_ep = fracao(cena, s_ep), cos_janela(s_ep)
        passos["S1"] = (dni_ep * c_ep, dni_ep * c_ep * f_ep)
        passos["S2"] = (dni_const * c_ep, dni_const * c_ep * f_ep)
        f_fim, c_fim = fracao(cena, s_fim), cos_janela(s_fim)
        passos["S3"] = (dni_const * c_fim, dni_const * c_fim * f_fim)
        f_meio, c_meio = fracao(cena, s_meio), cos_janela(s_meio)
        passos["S4"] = (dni_const * c_meio, dni_const * c_meio * f_meio)
        item = {"cena": cena["id"], "local": cena["local"], "orientacao": cena["orientacao"],
                "dni_interpolacao_dif_max_w_m2": round(dif_dni, 6), "passos_com_dni_zerada_pelo_sol": zerados,
                "contabilidade_dif_max_w_m2": round(dif_cont, 6),
                "passos": {k: resumo(a, b, classes) for k, (a, b) in passos.items()}}
        resultado.append(item)
        print(f"{cena['id']:24s} DNI interpolada: dif. máx. {dif_dni:.2e} W/m² ({zerados} passos zerados); "
              f"contabilidade: {dif_cont:.2e} W/m²")
        for k, v in item["passos"].items():
            print(f"   {k}: E0 {v['todas']['incidente']:8.3f}  E {v['todas']['admitida']:8.3f} kWh/m²  "
                  f"P_q {v['bloqueado_nas_quentes']}  P_f {v['admitido_nas_frias']}")
    OUT.write_text(json.dumps({"gerado_por": "docs/validacao/scripts/energyplus_indicadores.py",
                               "energyplus": "26.2.0", "passos_por_hora": P, "cenas": resultado},
                              ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"gravado {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

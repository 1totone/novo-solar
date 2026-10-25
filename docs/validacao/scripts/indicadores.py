"""Referência independente para os indicadores de sombreamento (F3.5).

Uso: python3 docs/validacao/scripts/indicadores.py
Entrada: EPWs de teste em .cache/epw (baixar_epw.py).
Saída: docs/validacao/casos/indicadores/indicadores.json
Dependências: requirements.txt (pvlib, numpy, pandas, shapely, pythermalcomfort).

Definições da spec 09: para cada hora do ano (ano de referência 2026, N = 6 amostras no meio de
subintervalos de 10 min), C = média de c_k e C_e = média de c_k · f_e,k, com c_k = cos θ_k quando o sol
está na janela (seno da altura e cos θ de pelo menos 10⁻⁵) e 0 caso contrário; f_e,k pelo shapely
(mascara_geometria.fracao_shapely). Radiação direta incidente sem e com a proteção: E₀ = DNI · C e
E = DNI · C_e, com a DNI do EPW (Wh/m²). Opção "whileSunUp": C e C_e divididos pela fração das amostras
com o seno da altura de pelo menos 10⁻⁵, em vez de N. Classes das horas: as da referência do F3.4
(classificacao_horas.py), na configuração padrão (faixa adaptativa da ASHRAE 55, 80%, média
exponencial com α = 0,8 e 30 dias, temperatura da hora pela média do início e do fim).
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

sys.path.insert(0, str(Path(__file__).resolve().parent))
import classificacao_horas as ch  # noqa: E402
import fracao_ensolarada_horaria as feh  # noqa: E402
import mascara_geometria as mg  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
EPW_DIR = ROOT / ".cache" / "epw"
OUT = ROOT / "docs" / "validacao" / "casos" / "indicadores" / "indicadores.json"
N = 6
LIMITE = 1e-5
AUSENTE_DNI = 9999.0
N_HORAS_AMOSTRA = 60

ARQUIVOS = {
    "florianopolis": "BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw",
    "manaus": "BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.epw",
    "porto-alegre": "BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.epw",
}

CENAS_F33 = {c["id"]: c for c in feh.CENAS}
BRISE = CENAS_F33["brise-norte"]
CENAS = [
    {**BRISE, "id": "sem-protecao-norte", "dispositivos": []},
    BRISE,
    {**BRISE, "id": "brise-norte-profundo",
     "dispositivos": [{**BRISE["dispositivos"][0], "depth": 1.2, "extendLeft": 0.8, "extendRight": 0.8}]},
    CENAS_F33["grelha-oeste"],
    CENAS_F33["laminas-sudeste-recuo"],
]

# (local, cena, DNI na hora)
COMBINACOES = [
    ("florianopolis", "sem-protecao-norte", "constant"),
    ("florianopolis", "brise-norte", "constant"),
    ("florianopolis", "brise-norte-profundo", "constant"),
    ("florianopolis", "grelha-oeste", "constant"),
    ("manaus", "grelha-oeste", "constant"),
    ("porto-alegre", "laminas-sudeste-recuo", "constant"),
    ("florianopolis", "brise-norte", "whileSunUp"),
    ("manaus", "grelha-oeste", "whileSunUp"),
    ("porto-alegre", "laminas-sudeste-recuo", "whileSunUp"),
    ("porto-alegre", "grelha-oeste", "constant"),
    ("porto-alegre", "grelha-oeste", "whileSunUp"),
]
CLASSES = {"q": "hot", "f": "cold", "n": "neutral", "s": "none"}


def cabecalho(caminho):
    campos = caminho.open(encoding="utf-8", errors="replace").readline().strip().split(",")
    return {"latitude": float(campos[6]), "longitude": float(campos[7]), "timeZone": float(campos[8]),
            "elevation": float(campos[9])}


def ler_dni(caminho):
    linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()[8:]
    out = []
    for linha in linhas:
        if linha.strip():
            v = float(linha.split(",")[14])
            out.append(math.nan if v >= AUSENTE_DNI else v)
    return np.array(out)


def classes_padrao(caminho):
    tbs = ch.ler_tbs(caminho)
    cfg = ch.CONFIGURACOES[0]
    tpma = ch.media_predominante(ch.medias_diarias(tbs), cfg["metodo"]["running"])
    _, low_d, up_d = ch.limites_adaptativos(tpma, 80)
    classes, _ = ch.classificar(ch.temperatura_hora(tbs, "mean"), np.repeat(low_d, 24), np.repeat(up_d, 24))
    return classes


def posicoes(local):
    t = pd.DatetimeIndex(feh.instantes_utc(local["timeZone"], N, "middle")).tz_localize("UTC")
    sp = pvlib.solarposition.spa_python(t, local["latitude"], local["longitude"], altitude=local["elevation"],
                                        delta_t=feh.DELTA_T, how="numpy")
    return sp["elevation"].to_numpy(), sp["azimuth"].to_numpy()


def incidencias(el, az, cena):
    j = cena["janela"]
    pls = mg.placas(cena)
    er, pr = np.radians(el), np.radians(az - cena["orientacao"])
    sx, sy, sz = np.cos(er) * np.sin(pr), np.cos(er) * np.cos(pr), np.sin(er)
    exposto = (sy >= LIMITE) & (sz >= LIMITE)
    f = np.zeros(len(el))
    for i in np.flatnonzero(exposto):
        f[i] = 1.0 - mg.fracao_shapely(j["width"], j["height"], pls, (sx[i], sy[i], sz[i]))
    c = np.where(exposto, sy, 0.0)
    soma = lambda v: v.reshape(-1, N).sum(axis=1)  # noqa: E731
    acima = soma((sz >= LIMITE).astype(float))
    return soma(c), soma(c * f), acima


def main():
    locais = {k: cabecalho(EPW_DIR / v) for k, v in ARQUIVOS.items()}
    dni = {k: ler_dni(EPW_DIR / v) for k, v in ARQUIVOS.items()}
    classes = {k: classes_padrao(EPW_DIR / v) for k, v in ARQUIVOS.items()}
    for k in ARQUIVOS:
        assert len(dni[k]) == 8760 and len(classes[k]) == 8760
    cenas = {c["id"]: c for c in CENAS}
    sol = {k: posicoes(v) for k, v in locais.items()}
    cache = {}
    rnd = np.random.default_rng(20261025)
    saida = []
    for loc, cena_id, modo in COMBINACOES:
        if (loc, cena_id) not in cache:
            cache[(loc, cena_id)] = incidencias(*sol[loc], cenas[cena_id])
        soma_c, soma_ce, acima = cache[(loc, cena_id)]
        div = np.full(8760, float(N)) if modo == "constant" else np.where(acima > 0, acima, 1.0)
        e0 = dni[loc] * soma_c / div
        e = dni[loc] * soma_ce / div
        por_classe = {}
        for cod, nome in CLASSES.items():
            sel = np.array([c == cod for c in classes[loc]]) & ~np.isnan(dni[loc])
            por_classe[nome] = {"incident": float(e0[sel].sum()), "admitted": float(e[sel].sum()),
                                "blocked": float((e0 - e)[sel].sum()), "hours": int(sel.sum())}
        q, f = por_classe["hot"], por_classe["cold"]
        item = {
            "local": loc, "cena": cena_id, "dni_na_hora": modo,
            "por_classe": por_classe,
            "bloqueado_nas_quentes": q["blocked"] / q["incident"] if q["incident"] > 0 else None,
            "admitido_nas_frias": f["admitted"] / f["incident"] if f["incident"] > 0 else None,
            "dni_ausente": int(np.isnan(dni[loc]).sum()),
        }
        horas = sorted(rnd.choice(np.flatnonzero(e0 > 0), N_HORAS_AMOSTRA, replace=False).tolist())
        item["horas"] = [[i, float(e0[i]), float(e[i])] for i in horas]
        saida.append(item)
        print(f"{loc:14s} {cena_id:22s} {modo:10s} quentes: E0 = {q['incident'] / 1000:7.2f} kWh/m², "
              f"bloqueado {100 * (item['bloqueado_nas_quentes'] or 0):6.2f}% | frias: E0 = {f['incident'] / 1000:7.2f}"
              f" kWh/m², admitido {100 * (item['admitido_nas_frias'] or 0):6.2f}%")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"gerado_por": "docs/validacao/scripts/indicadores.py", "amostras_por_hora": N,
                               "locais": locais, "arquivos": ARQUIVOS, "cenas": CENAS,
                               "combinacoes": saida}, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"gravado {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()

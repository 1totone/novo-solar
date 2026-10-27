"""Verificação da correção do vento para a altura e o terreno contra o EnergyPlus (F4.4).

Uso:
  ENERGYPLUS_DIR=/caminho/do/EnergyPlus-26.2.0 python3 -I docs/validacao/scripts/energyplus_vento.py
Saída: docs/validacao/casos/energyplus/vento.json e o modelo em
docs/validacao/casos/energyplus/modelos/vento.idf; saídas brutas em .cache/energyplus/vento-*/
(não versionadas).
Dependências: o EnergyPlus 26.2.0 (https://github.com/NREL/EnergyPlus/releases/tag/v26.2.0, pacote
Linux) e o EPW de Florianópolis em .cache/epw/ (baixar_epw.py). Só a biblioteca padrão do Python.

Modelo (o arranjo do F3.8, spec 07, seção 7.10, com o vento no lugar da sombra): uma zona em caixa de
2 × 2 m e 41 m de altura, com a parede da frente dividida em faixas horizontais cujos centroides
ficam a 1,5, 4,5, 7,5, 10, 15, 20, 30 e 40 m. O EnergyPlus calcula, para cada superfície, o vento
local na altura do centroide (Engineering Reference, seção 3.5.4.2, equação 3.84):

  V_z = V_met · (δ_met / z_met)^α_met · (z / δ)^α

com a estação no padrão do Site:WeatherStation (z_met = 10 m, α_met = 0,14, δ_met = 270 m) e α e δ
do campo Terrain do objeto Building. Uma simulação por terreno (Country, Suburbs, City, Ocean e
Urban), com 1 passo por hora, no ano de 2026. Saídas horárias: Site Wind Speed (o vento da estação,
o do EPW) e Surface Outside Face Outdoor Air Wind Speed de cada faixa.

Referência gravada (tests/referencia/ventoAvancado.test.ts): para cada terreno e altura, a razão
entre o vento da faixa e o da estação (a mesma em todas as horas com vento) e 48 horas de valores; e
a conferência de que o Site Wind Speed é o vento do EPW.
"""

import json
import os
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "energyplus" / "vento.json"
MODELO = ROOT / "docs" / "validacao" / "casos" / "energyplus" / "modelos" / "vento.idf"
TRABALHO = ROOT / ".cache" / "energyplus"
EPW = ROOT / ".cache" / "epw" / "BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw"
ANO = 2026
TERRENOS = ["Country", "Suburbs", "City", "Ocean", "Urban"]
# Faixas da parede da frente: (z inferior, z superior); centroides de 1,5 a 40 m.
FAIXAS = [(0, 3), (3, 6), (6, 9), (9, 11), (11, 19), (19, 21), (21, 39), (39, 41)]
LARGURA = 2.0
ALTURA = 41.0
AMOSTRA = 48  # horas gravadas por faixa (as primeiras com vento)


def retangulo_vertical(x0, x1, y, z0, z1, frente=True):
    """Parede vertical no plano y, do x0 ao x1 e do z0 ao z1, com os vértices no sentido anti-horário
    visto de fora (normal −y na frente, +y no fundo), a partir do canto superior esquerdo."""
    if frente:  # normal −y: de fora, x cresce para a esquerda
        return [(x1, y, z1), (x1, y, z0), (x0, y, z0), (x0, y, z1)]
    return [(x0, y, z1), (x0, y, z0), (x1, y, z0), (x1, y, z1)]


def vertices(vs):
    linhas = []
    for i, (x, y, z) in enumerate(vs):
        fim = ";" if i == len(vs) - 1 else ","
        linhas.append(f"    {x!r}, {y!r}, {z!r}{fim}")
    return "\n".join(linhas)


def modelo(terreno):
    W, D, H = LARGURA, LARGURA, ALTURA
    partes = [f"""Version, 26.2;
SimulationControl, No, No, No, No, Yes, No, 1;
Building, Verificacao F4.4 vento {terreno}, 0, {terreno}, 0.04, 0.4, MinimalShadowing, 25, 6;
Timestep, 1;
RunPeriod, Ano, 1, 1, {ANO}, 12, 31, {ANO}, , No, No, No, No, No, No, Hour24;
GlobalGeometryRules, UpperLeftCorner, Counterclockwise, World;
Material:NoMass, PAREDE, MediumRough, 1.0, 0.9, 0.7, 0.7;
Construction, PAREDE, PAREDE;
Zone, TORRE;
Output:Variable, Environment, Site Wind Speed, Hourly;
"""]

    def sup(nome, tipo, contorno, vs):
        sol = "SunExposed" if contorno == "Outdoors" else "NoSun"
        vento = "WindExposed" if contorno == "Outdoors" else "NoWind"
        partes.append(f"BuildingSurface:Detailed, {nome}, {tipo}, PAREDE, TORRE, , {contorno}, , {sol}, {vento}, "
                      f"autocalculate, {len(vs)},\n{vertices(vs)}\n")

    for k, (z0, z1) in enumerate(FAIXAS):
        nome = f"FRENTE_{k + 1}"
        sup(nome, "Wall", "Outdoors", retangulo_vertical(0.0, W, 0.0, float(z0), float(z1), frente=True))
        partes.append(f"Output:Variable, {nome}, Surface Outside Face Outdoor Air Wind Speed, Hourly;\n")
    sup("FUNDO", "Wall", "Outdoors", retangulo_vertical(0.0, W, D, 0.0, H, frente=False))
    # Laterais: normal −x (x = 0) e +x (x = W).
    sup("ESQUERDA", "Wall", "Outdoors", [(0.0, D, H), (0.0, D, 0.0), (0.0, 0.0, 0.0), (0.0, 0.0, H)])
    sup("DIREITA", "Wall", "Outdoors", [(W, 0.0, H), (W, 0.0, 0.0), (W, D, 0.0), (W, D, H)])
    sup("COBERTURA", "Roof", "Outdoors", [(0.0, D, H), (0.0, 0.0, H), (W, 0.0, H), (W, D, H)])
    sup("PISO", "Floor", "Adiabatic", [(W, D, 0.0), (W, 0.0, 0.0), (0.0, 0.0, 0.0), (0.0, D, 0.0)])
    return "".join(partes)


def ler_eso(caminho):
    """Séries horárias de cada (chave, variável) do ESO."""
    codigos, series = {}, {}
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            if linha.startswith("End of Data Dictionary"):
                break
            p = linha.strip().split(",")
            if len(p) >= 4 and p[0].isdigit() and int(p[0]) > 6:
                chave = (p[2].strip(), p[3].split("[")[0].strip())
                codigos[p[0]] = chave
                series[chave] = []
        for linha in f:
            if linha.startswith("End of Data"):
                break
            p = linha.strip().split(",")
            if p[0] in codigos:
                series[codigos[p[0]]].append(float(p[1]))
    return series


def vento_epw():
    linhas = EPW.read_text(encoding="utf-8", errors="replace").splitlines()[8:]
    return [float(l.split(",")[21]) for l in linhas]


def main():
    ep = Path(os.environ["ENERGYPLUS_DIR"])
    epw = vento_epw()
    MODELO.parent.mkdir(parents=True, exist_ok=True)
    MODELO.write_text(modelo("City"), encoding="utf-8")
    saida = {
        "gerado_por": "docs/validacao/scripts/energyplus_vento.py",
        "energyplus": "26.2.0-4bd7a1f26f",
        "epw": EPW.name,
        "estacao": {"z_met": 10.0, "alfa_met": 0.14, "delta_met": 270.0},
        "alturas": [(z0 + z1) / 2 for z0, z1 in FAIXAS],
        "terrenos": {},
    }
    for terreno in TERRENOS:
        pasta = TRABALHO / f"vento-{terreno.lower()}"
        pasta.mkdir(parents=True, exist_ok=True)
        idf = pasta / "modelo.idf"
        idf.write_text(modelo(terreno), encoding="utf-8")
        r = subprocess.run([str(ep / "energyplus"), "-w", str(EPW), "-d", str(pasta), str(idf)],
                           capture_output=True, text=True)
        err = (pasta / "eplusout.err").read_text(encoding="utf-8", errors="replace")
        if r.returncode != 0 or "EnergyPlus Completed Successfully" not in err:
            raise RuntimeError(f"{terreno}: EnergyPlus falhou\n{err[-3000:]}")
        s = ler_eso(pasta / "eplusout.eso")
        site = s[("Environment", "Site Wind Speed")]
        assert len(site) == 8760 == len(epw), (len(site), len(epw))
        # O vento da estação na simulação é o do EPW, hora a hora (1 passo por hora).
        dif_epw = max(abs(a - b) for a, b in zip(site, epw))
        faixas = []
        for k, z in enumerate(saida["alturas"]):
            local = s[(f"FRENTE_{k + 1}", "Surface Outside Face Outdoor Air Wind Speed")]
            razoes = [b / a for a, b in zip(site, local) if a > 0.5]
            amostra = [[i, site[i], local[i]] for i in range(8760) if site[i] > 0][:AMOSTRA]
            faixas.append({
                "z": z,
                "razao_media": sum(razoes) / len(razoes),
                "razao_min": min(razoes),
                "razao_max": max(razoes),
                "horas_com_vento": len(razoes),
                "amostra": amostra,
                "zero_com_estacao_zero": all(b == 0 for a, b in zip(site, local) if a == 0),
            })
        saida["terrenos"][terreno] = {"diferenca_site_epw": dif_epw, "faixas": faixas}
        print(f"{terreno:8s} site − EPW: {dif_epw:.2e}; razões por altura: "
              + ", ".join(f"{f['z']:g} m: {f['razao_media']:.6f}" for f in faixas))
    OUT.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(OUT)


if __name__ == "__main__":
    main()

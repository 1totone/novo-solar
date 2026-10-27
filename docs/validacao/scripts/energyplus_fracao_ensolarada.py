"""Verificação da fração ensolarada contra o EnergyPlus (F3.8): modelos, simulações e referência.

Uso:
  ENERGYPLUS_DIR=/caminho/do/EnergyPlus-26.2.0 python3 -I docs/validacao/scripts/energyplus_fracao_ensolarada.py
Saída: docs/validacao/casos/energyplus/fracao-ensolarada.json e os modelos em
docs/validacao/casos/energyplus/modelos/; saídas brutas do EnergyPlus em .cache/energyplus/ (não
versionadas).
Dependências: requirements.txt (numpy, shapely, pvlib), o EnergyPlus 26.2.0
(https://github.com/NREL/EnergyPlus/releases/tag/v26.2.0, pacote Linux) e os EPWs de .cache/epw/
(baixar_epw.py). Os EPWs só fornecem o local (latitude, longitude, fuso); a fração ensolarada não
depende dos dados do clima.

Cada cena (janela e proteções no formato de mascara_geometria.py, spec 07, seção 7.1) vira um
modelo do EnergyPlus: uma zona em caixa atrás da fachada, a janela na parede da frente e cada placa
como Shading:Building:Detailed, nas coordenadas do mundo (x Leste, y Norte, z para cima; Building
North Axis 0). A sombra é calculada pelo PolygonClipping (Sutherland e Hodgman), atualizada a cada
passo de tempo (ShadowCalculation, Timestep), com 6 passos por hora no ano de 2026. Saídas por passo
de tempo: Surface Outside Face Sunlit Fraction da janela e o cosseno do ângulo de incidência (Surface
Outside Face Beam Solar Incident Angle Cosine Value) na janela, na cobertura e nas paredes laterais.
Os três cossenos são as componentes, no referencial da fachada, da direção do sol que o EnergyPlus
usou na sombra daquele passo (HeatBalanceSurfaceManager.cc reporta SurfCosIncAng do passo, o mesmo
de FigureSolarBeamAtTimestep em SolarShading.cc).

Sol do EnergyPlus (SolarShading.cc, FigureSunCosines, SUN3 e SUN4, versão 26.2.0): com mais de um
passo por hora, o sol é calculado no fim de cada passo, com a declinação e a equação do tempo do dia
(séries de Fourier ajustadas por mínimos quadrados, SUN3) e o ângulo horário pelo meridiano do fuso.
O script reproduz esse cálculo e confere contra os cossenos de saída; também mede a diferença para o
NREL SPA (pvlib), que é o sol da aplicação.

Referência gravada para os testes (tests/referencia/energyplus.test.ts), por cena:
- a fração ensolarada horária do EnergyPlus (média dos 6 passos de cada hora, 8760 horas);
- a fração ensolarada de cada passo dos dias 1, 11 e 21 de cada mês (o teste reproduz o sol do
  EnergyPlus nesses passos);
- 24 passos com os cossenos de saída, para o teste conferir a sua reprodução do sol.
O resumo impresso e gravado (shapely e pvlib, ano inteiro) separa a diferença de geometria, com o
mesmo sol, da diferença de posição do sol (relatório do F3.8).
"""

import json
import math
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

sys.path.insert(0, str(Path(__file__).resolve().parent))
import fracao_ensolarada_horaria as feh  # noqa: E402
import mascara_geometria as mg  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "energyplus" / "fracao-ensolarada.json"
TRABALHO = ROOT / ".cache" / "energyplus"
EPW_DIR = ROOT / ".cache" / "epw"
ANO = 2026
PASSOS = 6
LIMITE = 1e-5  # DataEnvironment::SunIsUpValue
DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
DIAS_PASSOS = [sum(DIAS_MES[: m - 1]) + d for m in range(1, 13) for d in (1, 11, 21)]
MARGEM = 1.0  # margem da parede em torno da janela (m)
FUNDO = 4.0  # profundidade da zona (m)

LOCAIS = {
    "florianopolis": "BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw",
    "manaus": "BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.epw",
    "belem": "BRA_PA_Belem-Val.de.Cans.Intl.AP.821930_TMYx.2011-2025.epw",
    "porto-alegre": "BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.epw",
    "concepcion": "CHL_BI_Concepcion-Carriel.Sur.Intl.AP.856820_TMYx.2011-2025.epw",
}

CENAS = [
    {"id": "brise-norte", "local": "florianopolis", "orientacao": 0.0,
     "janela": {"width": 1.5, "height": 1.2, "setback": 0.0},
     "dispositivos": [{"kind": "overhang", "depth": 0.8, "above": 0.1, "gap": 0.0,
                       "extendLeft": 0.5, "extendRight": 0.5}]},
    {"id": "grelha-oeste", "local": "manaus", "orientacao": 270.0,
     "janela": {"width": 1.2, "height": 1.4, "setback": 0.0},
     "dispositivos": [
         {"kind": "overhang", "depth": 0.6, "above": 0.15, "gap": 0.0, "extendLeft": 0.3, "extendRight": 0.3},
         {"kind": "fin", "side": "right", "depth": 0.6, "offset": 0.3, "gap": 0.0, "extendAbove": 0.15,
          "extendBelow": 0.3},
         {"kind": "fin", "side": "left", "depth": 0.6, "offset": 0.3, "gap": 0.0, "extendAbove": 0.15,
          "extendBelow": 0.3}]},
    {"id": "laminas-sudeste-recuo", "local": "porto-alegre", "orientacao": 135.0,
     "janela": {"width": 1.2, "height": 1.5, "setback": 0.15},
     "dispositivos": [{"kind": "horizontalLouvers", "count": 4, "chord": 0.3, "pitch": 0.35, "angle": 20.0,
                       "gap": 0.05, "above": 0.0, "extendLeft": 0.2, "extendRight": 0.2}]},
    {"id": "laminas-verticais-leste", "local": "belem", "orientacao": 90.0,
     "janela": {"width": 1.8, "height": 1.2, "setback": 0.0},
     "dispositivos": [{"kind": "verticalLouvers", "count": 6, "chord": 0.25, "pitch": 0.3, "angle": 30.0,
                       "gap": 0.05, "start": 0.0, "extendAbove": 0.2, "extendBelow": 0.2}]},
    {"id": "brise-afastado-aletas", "local": "concepcion", "orientacao": 20.0,
     "janela": {"width": 1.0, "height": 1.6, "setback": 0.0},
     "dispositivos": [
         {"kind": "overhang", "depth": 0.5, "above": 0.3, "gap": 0.2, "extendLeft": 0.4, "extendRight": 0.4},
         {"kind": "fin", "side": "right", "depth": 0.4, "offset": 0.15, "gap": 0.1, "extendAbove": 0.3,
          "extendBelow": 0.0},
         {"kind": "fin", "side": "left", "depth": 0.4, "offset": 0.15, "gap": 0.1, "extendAbove": 0.3,
          "extendBelow": 0.0}]},
    {"id": "placas-livres-sul", "local": "florianopolis", "orientacao": 180.0,
     "janela": {"width": 1.4, "height": 1.1, "setback": 0.0},
     "dispositivos": [
         {"kind": "plate", "vertices": [[-0.3, 0.0, 1.4], [1.7, 0.0, 1.4], [1.7, 0.9, 1.0], [-0.3, 0.9, 1.0]]},
         {"kind": "plate", "vertices": [[1.6, 0.0, -0.2], [1.6, 0.0, 1.4], [1.6, 0.7, 1.05]]},
         {"kind": "plate", "vertices": [[-0.5, 0.3, 0.2], [-0.1, 0.8, 0.4], [-0.1, 0.8, 1.2], [-0.5, 0.3, 1.0]]}]},
    {"id": "grelha-laminas-nordeste", "local": "manaus", "orientacao": 45.0,
     "janela": {"width": 2.4, "height": 1.8, "setback": 0.0},
     "dispositivos": [
         {"kind": "overhang", "depth": 0.5, "above": 0.0, "gap": 0.0, "extendLeft": 0.2, "extendRight": 0.2},
         {"kind": "fin", "side": "right", "depth": 0.5, "offset": 0.0, "gap": 0.0},
         {"kind": "fin", "side": "left", "depth": 0.5, "offset": 0.0, "gap": 0.0},
         {"kind": "horizontalLouvers", "count": 3, "chord": 0.2, "pitch": 0.45, "angle": 45.0, "gap": 0.1,
          "above": -0.3}]},
    {"id": "recuo-noroeste", "local": "belem", "orientacao": 315.0,
     "janela": {"width": 1.0, "height": 1.0, "setback": 0.3},
     "dispositivos": []},
]


def eixos(orientacao):
    """Direita (de quem olha para fora) e normal externa da fachada, em (Leste, Norte)."""
    g = math.radians(orientacao)
    return (math.cos(g), -math.sin(g)), (math.sin(g), math.cos(g))


def mundo(p, orientacao):
    (rx, ry), (nx, ny) = eixos(orientacao)
    x, y, z = p
    return (x * rx + y * nx, x * ry + y * ny, z)


def retangulo(c, u, n, largura, altura):
    """Vértices de um retângulo a partir do canto superior esquerdo, no sentido anti-horário visto
    de fora (lado da normal n), com u o "para cima" do retângulo."""
    r = np.cross(u, n)  # direita de quem olha a face de fora
    c, u = np.asarray(c, float), np.asarray(u, float)
    return [tuple(c - r * largura / 2 + u * altura / 2), tuple(c - r * largura / 2 - u * altura / 2),
            tuple(c + r * largura / 2 - u * altura / 2), tuple(c + r * largura / 2 + u * altura / 2)]


def normal_newell(vs):
    n = np.zeros(3)
    for i, a in enumerate(vs):
        b = vs[(i + 1) % len(vs)]
        n += ((a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1]))
    return n / np.linalg.norm(n)


def superficies_da_zona(W, H):
    """Faces da caixa, no referencial da fachada: nome, tipo, condição externa, vértices, normal."""
    m, L = MARGEM, FUNDO
    largura, altura = W + 2 * m, H + 2 * m
    cx, cz = W / 2, H / 2
    z, y = (0.0, 0.0, 1.0), (0.0, 1.0, 0.0)
    faces = [
        ("PAREDE_FRENTE", "Wall", "Outdoors", retangulo((cx, 0, cz), z, y, largura, altura), y),
        ("PAREDE_FUNDO", "Wall", "Outdoors", retangulo((cx, -L, cz), z, (0, -1, 0), largura, altura), (0, -1, 0)),
        ("PAREDE_DIREITA", "Wall", "Outdoors", retangulo((W + m, -L / 2, cz), z, (1, 0, 0), L, altura), (1, 0, 0)),
        ("PAREDE_ESQUERDA", "Wall", "Outdoors", retangulo((-m, -L / 2, cz), z, (-1, 0, 0), L, altura), (-1, 0, 0)),
        ("COBERTURA", "Roof", "Outdoors", retangulo((cx, -L / 2, H + m), y, z, largura, L), z),
        ("PISO", "Floor", "Adiabatic", retangulo((cx, -L / 2, -m), y, (0, 0, -1), largura, L), (0, 0, -1)),
    ]
    for nome, _, _, vs, n in faces:
        assert np.allclose(normal_newell(vs), n), nome
    return faces


def fmt_vertices(vs, orientacao):
    linhas = []
    for i, p in enumerate(vs):
        x, y, z = mundo(p, orientacao)
        fim = ";" if i == len(vs) - 1 else ","
        linhas.append(f"    {float(x)!r}, {float(y)!r}, {float(z)!r}{fim}")
    return "\n".join(linhas)


def modelo(cena):
    """Texto do IDF de uma cena."""
    j = cena["janela"]
    W, H = j["width"], j["height"]
    gamma = cena["orientacao"]
    partes = [f"""Version, 26.2;
SimulationControl, No, No, No, No, Yes, No, 1;
Building, Verificacao F3.8 {cena['id']}, 0, Suburbs, 0.04, 0.4, FullExterior, 25, 6;
ShadowCalculation, PolygonClipping, Timestep, 1, 15000, SutherlandHodgman, 512, SimpleSkyDiffuseModeling, No, No, No;
Timestep, {PASSOS};
RunPeriod, Ano, 1, 1, {ANO}, 12, 31, {ANO}, , No, No, No, No, No, No, Hour24;
GlobalGeometryRules, UpperLeftCorner, Counterclockwise, World;
Material:NoMass, PAREDE, MediumRough, 1.0, 0.9, 0.7, 0.7;
Construction, PAREDE, PAREDE;
WindowMaterial:SimpleGlazingSystem, VIDRO, 5.8, 0.8, 0.85;
Construction, VIDRO, VIDRO;
Zone, SALA;
Output:Diagnostics, DisplayExtraWarnings;
"""]
    for nome, tipo, contorno, vs, _ in superficies_da_zona(W, H):
        sol = "SunExposed" if contorno == "Outdoors" else "NoSun"
        vento = "WindExposed" if contorno == "Outdoors" else "NoWind"
        partes.append(f"BuildingSurface:Detailed, {nome}, {tipo}, PAREDE, SALA, , {contorno}, , {sol}, {vento}, "
                      f"autocalculate, 4,\n{fmt_vertices(vs, gamma)}\n")
    janela = retangulo((W / 2, 0, H / 2), (0, 0, 1), (0, 1, 0), W, H)
    assert np.allclose(normal_newell(janela), (0, 1, 0))
    partes.append(f"FenestrationSurface:Detailed, JANELA, Window, VIDRO, PAREDE_FRENTE, , autocalculate, , 1, 4,\n"
                  f"{fmt_vertices(janela, gamma)}\n")
    for k, pl in enumerate(mg.placas(cena)):
        partes.append(f"Shading:Building:Detailed, PLACA_{k + 1}, , {len(pl)},\n{fmt_vertices(pl, gamma)}\n")
    for chave in ("JANELA", "COBERTURA", "PAREDE_DIREITA", "PAREDE_ESQUERDA"):
        partes.append(f"Output:Variable, {chave}, Surface Outside Face Beam Solar Incident Angle Cosine Value, Timestep;\n")
    partes.append("Output:Variable, JANELA, Surface Outside Face Sunlit Fraction, Timestep;\n")
    return "".join(partes)


def ler_eso(caminho):
    """Valores por passo de tempo de cada (chave, variável) do arquivo ESO, na ordem da simulação."""
    codigos, series, passos = {}, {}, []
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            if linha.startswith("End of Data Dictionary"):
                break
            partes = linha.strip().split(",")
            if len(partes) >= 4 and partes[0].isdigit() and int(partes[0]) > 6:
                variavel = partes[3].split("[")[0].strip()
                codigos[partes[0]] = (partes[2].strip(), variavel)
                series[(partes[2].strip(), variavel)] = []
        for linha in f:
            if linha.startswith("End of Data"):
                break
            partes = linha.strip().split(",")
            if partes[0] == "2":
                # dia da simulação, mês, dia, horário de verão, hora, minuto inicial, minuto final
                passos.append((int(partes[2]), int(partes[3]), int(partes[5]), float(partes[7])))
            elif partes[0] in codigos:
                series[codigos[partes[0]]].append(partes[1])
    return passos, series


def simular(cena, ep_dir):
    pasta = TRABALHO / cena["id"]
    pasta.mkdir(parents=True, exist_ok=True)
    idf = pasta / "modelo.idf"
    idf.write_text(modelo(cena), encoding="utf-8")
    epw = EPW_DIR / LOCAIS[cena["local"]]
    r = subprocess.run([str(Path(ep_dir) / "energyplus"), "-w", str(epw), "-d", str(pasta), str(idf)],
                       capture_output=True, text=True)
    err = (pasta / "eplusout.err").read_text(encoding="utf-8", errors="replace")
    if r.returncode != 0 or "EnergyPlus Completed Successfully" not in err:
        raise RuntimeError(f"{cena['id']}: EnergyPlus falhou\n{err[-3000:]}")
    return ler_eso(pasta / "eplusout.eso"), err


def cabecalho_epw(caminho):
    campos = caminho.open(encoding="utf-8", errors="replace").readline().strip().split(",")
    return {"latitude": float(campos[6]), "longitude": float(campos[7]), "timeZone": float(campos[8]),
            "elevation": float(campos[9])}


# SUN3 (SolarShading.cc): séries de Fourier do seno da declinação e da equação do tempo (horas).
COEF_DECLINACAO = (0.00561800, 0.0657911, -0.392779, 0.00064440, -0.00618495, -0.00010101, -0.00007951,
                   -0.00011691, 0.00002096)
COEF_EQ_TEMPO = (0.00021971, -0.122649, 0.00762856, -0.156308, -0.0530028, -0.00388702, -0.00123978,
                 -0.00270502, -0.00167992)


def sun3(dia):
    x = 0.017167 * dia
    s1, c1 = math.sin(x), math.cos(x)
    s2, c2 = s1 * c1 * 2.0, c1 * c1 - s1 * s1
    s3, c3 = s1 * c2 + c1 * s2, c1 * c2 - s1 * s2
    s4, c4 = 2.0 * s2 * c2, c2 * c2 - s2 * s2
    base = (1.0, s1, c1, s2, c2, s3, c3, s4, c4)
    return sum(a * b for a, b in zip(COEF_DECLINACAO, base)), sum(a * b for a, b in zip(COEF_EQ_TEMPO, base))


def sol_energyplus(local, orientacao):
    """Direção do sol do EnergyPlus (SUN3 e SUN4) no fim de cada passo do ano, no referencial da
    fachada; (0, 0, 0) com o seno da altura abaixo de SunIsUpValue, como no SUN4."""
    (rx, ry), (nx, ny) = eixos(orientacao)
    lat = math.radians(local["latitude"])
    meridiano = local["timeZone"] * 15.0
    out = np.zeros((365 * 24 * PASSOS, 3))
    i = 0
    for dia in range(1, 366):
        sd, et = sun3(dia)
        cd = math.sqrt(1.0 - sd * sd)
        for hora in range(1, 25):
            for passo in range(1, PASSOS + 1):
                t = (hora - 1) + passo / PASSOS
                h = math.radians(15.0 * (12.0 - (t + et)) + (meridiano - local["longitude"]))
                up = sd * math.sin(lat) + cd * math.cos(lat) * math.cos(h)
                if up >= LIMITE:
                    north = sd * math.cos(lat) - cd * math.sin(lat) * math.cos(h)
                    east = cd * math.sin(h)
                    out[i] = (east * rx + north * ry, east * nx + north * ny, up)
                i += 1
    return out


def sol_spa(local, orientacao):
    """NREL SPA (pvlib), fim de cada passo, no referencial da fachada (o sol da aplicação)."""
    el, az = feh.posicoes(local, PASSOS, "end")
    er, pr = np.radians(el), np.radians(az - orientacao)
    return np.stack([np.cos(er) * np.sin(pr), np.cos(er) * np.cos(pr), np.sin(er)], axis=1)


def ensolarada(cena, s):
    """Fração ensolarada (shapely) com as regras do EnergyPlus: 0 com o sol fora da janela
    (seno da altura ou cos θ abaixo de 10⁻⁵) e 0 abaixo de 10⁻⁵."""
    j = cena["janela"]
    W, H = j["width"], j["height"]
    pls = mg.placas(cena)
    f = np.zeros(len(s))
    for i in np.flatnonzero((s[:, 2] >= LIMITE) & (s[:, 1] >= LIMITE)):
        v = 1.0 - mg.fracao_shapely(W, H, pls, tuple(s[i]))
        f[i] = 0.0 if v < LIMITE else min(v, 1.0)
    return f


def por_hora(v):
    return v.reshape(-1, PASSOS).mean(axis=1)


def num(v, casas):
    """Número arredondado, com 0 e 1 como inteiros (arquivo menor)."""
    r = round(float(v), casas)
    return int(r) if r in (0.0, 1.0) else r


def componentes_do_sol(local):
    """Declinação e equação do tempo do SUN3 contra o SPA (pvlib), em cada passo do ano. A
    declinação do SPA sai da posição: sen δ = sen φ sen h + cos φ cos h cos A."""
    t = pd.DatetimeIndex(feh.instantes_utc(local["timeZone"], PASSOS, "end")).tz_localize("UTC")
    sp = pvlib.solarposition.spa_python(t, local["latitude"], local["longitude"], altitude=local["elevation"],
                                        delta_t=feh.DELTA_T, how="numpy")
    el, az, lat = np.radians(sp["elevation"].to_numpy()), np.radians(sp["azimuth"].to_numpy()), math.radians(local["latitude"])
    dec_spa = np.degrees(np.arcsin(np.sin(lat) * np.sin(el) + np.cos(lat) * np.cos(el) * np.cos(az)))
    dia = [sun3(d) for d in range(1, 366)]
    dec_ep = np.repeat([math.degrees(math.asin(sd)) for sd, _ in dia], 24 * PASSOS)
    eot_ep = np.repeat([et * 60.0 for _, et in dia], 24 * PASSOS)
    dd, de = dec_ep - dec_spa, eot_ep - sp["equation_of_time"].to_numpy()
    return {"declinacao_max_graus": round(float(np.abs(dd).max()), 3),
            "declinacao_desvio_padrao_graus": round(float(dd.std()), 3),
            "equacao_do_tempo_max_min": round(float(np.abs(de).max()), 2),
            "equacao_do_tempo_desvio_padrao_min": round(float(de.std()), 2)}


def versao(err):
    linha = err.splitlines()[0]
    return linha.split("Version ")[1].split(",")[0].strip()


def main() -> None:
    ep_dir = os.environ.get("ENERGYPLUS_DIR")
    if not ep_dir:
        sys.exit("Defina ENERGYPLUS_DIR com a pasta do EnergyPlus 26.2.0.")
    locais = {k: dict(cabecalho_epw(EPW_DIR / v), epw=v) for k, v in LOCAIS.items()}
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 2) as ex:
        resultados = list(ex.map(lambda c: simular(c, ep_dir), CENAS))
    dias = np.array(DIAS_PASSOS) - 1
    sel = (dias[:, None] * 24 * PASSOS + np.arange(24 * PASSOS)[None, :]).ravel()
    rnd = np.random.default_rng(20261024)
    cenas, resumo, sol_locais = [], {}, {}
    (ROOT / "docs" / "validacao" / "casos" / "energyplus" / "modelos").mkdir(parents=True, exist_ok=True)
    for cena, ((passos, series), err) in zip(CENAS, resultados):
        local = locais[cena["local"]]
        assert len(passos) == 365 * 24 * PASSOS
        cos = lambda k: np.array([float(v) for v in series[(k, "Surface Outside Face Beam Solar Incident Angle Cosine Value")]])  # noqa: E731
        rep = np.stack([cos("PAREDE_DIREITA"), cos("JANELA"), cos("COBERTURA")], axis=1)
        assert np.abs(cos("PAREDE_ESQUERDA") + rep[:, 0]).max() < 1e-12
        f_ep = np.array([float(v) for v in series[("JANELA", "Surface Outside Face Sunlit Fraction")]])
        s_ep = sol_energyplus(local, cena["orientacao"])
        s_spa = sol_spa(local, cena["orientacao"])
        reportado = np.any(rep != 0, axis=1)
        desvio_replica = float(np.abs(s_ep[reportado] - rep[reportado]).max())
        assert desvio_replica < 1e-12, (cena["id"], desvio_replica)

        # Geometria com o sol do EnergyPlus, ano inteiro (shapely).
        f_geo = ensolarada(cena, s_ep)
        d = np.abs(f_geo - f_ep)
        cos_t = np.where((s_ep[:, 2] >= LIMITE) & (s_ep[:, 1] >= LIMITE), s_ep[:, 1], 0.0)
        rasante = (cos_t > 0) & (cos_t < 1e-3)
        # Horária com o sol da aplicação (SPA, fim de cada passo).
        f_spa = ensolarada(cena, s_spa)
        exp_spa = (s_spa[:, 2] >= LIMITE) & (s_spa[:, 1] >= LIMITE)
        exp_ep = cos_t > 0
        h_ep, h_spa, h_geo = por_hora(f_ep), por_hora(f_spa), por_hora(f_geo)
        horas = (por_hora(exp_spa.astype(float)) > 0) | (por_hora(exp_ep.astype(float)) > 0)
        dh = h_spa[horas] - h_ep[horas]
        horas_rasantes = por_hora(rasante.astype(float)) > 0
        dg = np.abs(h_geo - h_ep)
        dsol = h_spa[horas] - h_geo[horas]  # só o efeito do sol: a mesma geometria com os dois sóis
        dgeo = h_geo[horas] - h_ep[horas]  # só o efeito da geometria: o mesmo sol nos dois programas

        ang = np.degrees(np.arccos(np.clip((s_ep * s_spa).sum(axis=1), -1.0, 1.0)))
        acima = (s_ep[:, 2] >= LIMITE) & (s_spa[:, 2] >= LIMITE)
        sol_locais[cena["local"]] = {
            "angulo_medio_graus": round(float(ang[acima].mean()), 4),
            "angulo_p95_graus": round(float(np.percentile(ang[acima], 95)), 4),
            "angulo_max_graus": round(float(ang[acima].max()), 4), **componentes_do_sol(local)}
        resumo[cena["id"]] = {
            "replica_do_sol_max": desvio_replica,
            "passos_com_sol_na_janela": int(exp_ep.sum()),
            "passos_cos_zerado_pelo_clima": int(((s_ep[:, 2] >= LIMITE) & ~reportado).sum()),
            "geometria_max_cos_ge_1e-3": float(d[cos_t >= 1e-3].max()),
            "geometria_p99_cos_ge_1e-3": float(np.percentile(d[cos_t >= 1e-3], 99)),
            "geometria_passos_dif_gt_1e-4": int((d > 1e-4).sum()),
            "geometria_cos_max_dif_gt_1e-4": float(cos_t[d > 1e-4].max()) if (d > 1e-4).any() else None,
            "geometria_max_dif_vezes_cos": float((d * cos_t).max()),
            "horaria_geometria_max_sem_rasantes": float(dg[~horas_rasantes].max()),
            "horaria_geometria_rmse": float(np.sqrt(np.mean(dgeo ** 2))),
            "horaria_so_sol_rmse": float(np.sqrt(np.mean(dsol ** 2))),
            "horaria_spa_horas": int(horas.sum()),
            "horaria_spa_rmse": float(np.sqrt(np.mean(dh ** 2))),
            "horaria_spa_vies": float(dh.mean()),
            "horaria_spa_max": float(np.abs(dh).max()),
            "horaria_spa_p99": float(np.percentile(np.abs(dh), 99)),
            "avisos_energyplus": err.count("** Warning **"),
        }
        amostra = np.sort(rnd.choice(np.flatnonzero(reportado), size=24, replace=False))
        cenas.append({
            "id": cena["id"], "local": cena["local"], "orientacao": cena["orientacao"],
            "janela": cena["janela"], "dispositivos": cena["dispositivos"],
            "horaria": [num(v, 5) for v in h_ep],
            "passos": [num(v, 7) for v in f_ep[sel]],
            "cossenos": [[int(i), float(rep[i, 0]), float(rep[i, 1]), float(rep[i, 2])] for i in amostra],
        })
        modelo_ref = ROOT / "docs" / "validacao" / "casos" / "energyplus" / "modelos" / f"{cena['id']}.idf"
        modelo_ref.write_text((TRABALHO / cena["id"] / "modelo.idf").read_text(encoding="utf-8"), encoding="utf-8")
        r = resumo[cena["id"]]
        print(f"{cena['id']:26s} geometria: máx {r['geometria_max_cos_ge_1e-3']:.2e} (cos θ ≥ 10⁻³), "
              f"{r['geometria_passos_dif_gt_1e-4']} passos > 10⁻⁴; horária SPA: RMSE {r['horaria_spa_rmse']:.4f}, "
              f"viés {r['horaria_spa_vies']:+.4f}, máx {r['horaria_spa_max']:.4f}; só o sol: RMSE {r['horaria_so_sol_rmse']:.4f}; "
              f"só a geometria: RMSE {r['horaria_geometria_rmse']:.1e}")
    for k, v in sol_locais.items():
        print(f"sol SPA x EnergyPlus em {k}: {v}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "gerado_por": "docs/validacao/scripts/energyplus_fracao_ensolarada.py",
        "energyplus": versao(resultados[0][1]),
        "ano": ANO,
        "passos_por_hora": PASSOS,
        "dias_passos": DIAS_PASSOS,
        "locais": locais,
        "cenas": cenas,
        "resumo": resumo,
        "sol_spa_x_energyplus": sol_locais,
    }, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

"""Referência independente para a fração ensolarada hora a hora e o mapa mês × hora (F3.3).

Uso: python3 docs/validacao/scripts/fracao_ensolarada_horaria.py
Saída: docs/validacao/casos/mascara/fracao-horaria.json
Dependências: requirements.txt (pvlib, pandas, numpy, shapely).

Definições da spec 07, seção 7.6: ano de referência 2026 (8760 horas); a hora h (1 a 24) é o
intervalo [h − 1, h] em hora legal, no fuso do local, dividido em N subintervalos; o sol é calculado
no meio de cada subintervalo (padrão, N = 6) ou no fim (opção "end", como o EnergyPlus). Posição do
sol: pvlib spa_python (NREL SPA), altura geométrica (sem refração), ΔT = 69 s. O sol está na janela
se o seno da altura e o cosseno do ângulo de incidência são de pelo menos 10⁻⁵. Percentual
sombreado: shapely (mascara_geometria.fracao_shapely), com as placas de mascara_geometria.placas.

Para cada hora: fração ensolarada F_e (média de e_k · (1 − f_s)), exposição E (média de e_k),
incidência ensolarada C_e (média de e_k · cos θ · (1 − f_s)) e incidência sem proteção C (média de
e_k · cos θ). Mapa mês × hora: médias de F_e e de E sobre os dias do mês e S = 1 − F̄_e / Ē.
"""

import json
import math
import random
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mascara_geometria as mg  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "mascara" / "fracao-horaria.json"
ANO = 2026
DELTA_T = 69.0
LIMITE = 1e-5
DIAS_MES = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
N_HORAS_AMOSTRA = 100

LOCAIS = {
    "florianopolis": {"latitude": -27.67, "longitude": -48.547, "elevation": 6.1, "timeZone": -3},
    "recife": {"latitude": -8.126, "longitude": -34.924, "elevation": 10.1, "timeZone": -3},
    "manaus": {"latitude": -3.039, "longitude": -60.05, "elevation": 80.5, "timeZone": -4},
}

CENAS = [
    {"id": "brise-norte", "orientacao": 0.0, "janela": {"width": 1.5, "height": 1.2, "setback": 0.0},
     "dispositivos": [{"kind": "overhang", "depth": 0.8, "above": 0.1, "gap": 0.0,
                       "extendLeft": 0.5, "extendRight": 0.5}]},
    {"id": "grelha-oeste", "orientacao": 270.0, "janela": {"width": 1.2, "height": 1.4, "setback": 0.0},
     "dispositivos": [
         {"kind": "overhang", "depth": 0.6, "above": 0.15, "gap": 0.0, "extendLeft": 0.3, "extendRight": 0.3},
         {"kind": "fin", "side": "right", "depth": 0.6, "offset": 0.3, "gap": 0.0, "extendAbove": 0.15,
          "extendBelow": 0.3},
         {"kind": "fin", "side": "left", "depth": 0.6, "offset": 0.3, "gap": 0.0, "extendAbove": 0.15,
          "extendBelow": 0.3}]},
    {"id": "laminas-sudeste-recuo", "orientacao": 135.0, "janela": {"width": 1.2, "height": 1.5, "setback": 0.15},
     "dispositivos": [{"kind": "horizontalLouvers", "count": 4, "chord": 0.3, "pitch": 0.35, "angle": 20.0,
                       "gap": 0.05, "above": 0.0, "extendLeft": 0.2, "extendRight": 0.2}]},
]

# (local, cena, amostras por hora, posição na hora)
COMBINACOES = [(loc, c["id"], 6, "middle") for loc in LOCAIS for c in CENAS] + [
    ("florianopolis", "brise-norte", 6, "end"),
    ("florianopolis", "brise-norte", 1, "middle"),
]


def instantes_utc(time_zone, n, at):
    """Instantes UTC (ns) das amostras, na ordem: dia, hora (1 a 24), amostra."""
    frac = (np.arange(n) + (0.5 if at == "middle" else 1.0)) / n
    horas = (np.arange(365 * 24)[:, None] + frac[None, :]).ravel()  # horas desde 00:00 de 1/1 (hora legal)
    base = np.datetime64(f"{ANO}-01-01T00:00:00", "ns") - np.timedelta64(int(round(time_zone * 3600)), "s")
    return base + np.round(horas * 3600e9).astype("int64").astype("timedelta64[ns]")


def posicoes(local, n, at):
    t = pd.DatetimeIndex(instantes_utc(local["timeZone"], n, at)).tz_localize("UTC")
    sp = pvlib.solarposition.spa_python(t, local["latitude"], local["longitude"], altitude=local["elevation"],
                                        delta_t=DELTA_T, how="numpy")
    return sp["elevation"].to_numpy(), sp["azimuth"].to_numpy()


def horario(local, cena, n, at):
    el, az = posicoes(local, n, at)
    j = cena["janela"]
    W, H = j["width"], j["height"]
    pls = mg.placas(cena)
    er, pr = np.radians(el), np.radians(az - cena["orientacao"])
    sx, sy, sz = np.cos(er) * np.sin(pr), np.cos(er) * np.cos(pr), np.sin(er)
    exposto = (sy >= LIMITE) & (sz >= LIMITE)
    ensolarada = np.zeros(len(el))
    for i in np.flatnonzero(exposto):
        ensolarada[i] = 1.0 - mg.fracao_shapely(W, H, pls, (sx[i], sy[i], sz[i]))
    cos_inc = np.where(exposto, sy, 0.0)
    m = lambda v: v.reshape(-1, n).mean(axis=1)  # noqa: E731
    return {"Fe": m(ensolarada), "E": m(exposto.astype(float)), "Ce": m(cos_inc * ensolarada), "C": m(cos_inc)}


def mapa(h):
    mes = np.repeat(np.arange(12), [d * 24 for d in DIAS_MES])
    hora = np.tile(np.arange(24), 365)
    Fe = np.zeros((12, 24))
    E = np.zeros((12, 24))
    for k in range(12):
        for hh in range(24):
            sel = (mes == k) & (hora == hh)
            Fe[k, hh] = h["Fe"][sel].mean()
            E[k, hh] = h["E"][sel].mean()
    S = [[None if E[k, hh] == 0 else round(1 - Fe[k, hh] / E[k, hh], 10) for hh in range(24)] for k in range(12)]
    return {
        "ensolarada": [[round(v, 10) for v in row] for row in Fe],
        "exposicao": [[round(v, 10) for v in row] for row in E],
        "sombreada_com_sol_na_janela": S,
    }


def main() -> None:
    rnd = random.Random(20261026)
    horas_amostra = sorted(rnd.sample(range(8760), N_HORAS_AMOSTRA))
    cenas = {c["id"]: c for c in CENAS}
    saida = []
    for loc_id, cena_id, n, at in COMBINACOES:
        local, cena = LOCAIS[loc_id], cenas[cena_id]
        h = horario(local, cena, n, at)
        saida.append({
            "local": loc_id,
            "cena": cena_id,
            "amostras_por_hora": n,
            "posicao": at,
            "mapa": mapa(h),
            "horas": [[i, round(h["Fe"][i], 10), round(h["E"][i], 10), round(h["Ce"][i], 10), round(h["C"][i], 10)]
                      for i in horas_amostra],
            "soma_anual": {k: round(float(v.sum()), 8) for k, v in h.items()},
        })
        print(f"{loc_id} / {cena_id} (N = {n}, {at}): soma anual F_e = {h['Fe'].sum():.4f} h, "
              f"E = {h['E'].sum():.4f} h, sombreada com sol na janela = {1 - h['Fe'].sum() / h['E'].sum():.4f}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "gerado_por": "docs/validacao/scripts/fracao_ensolarada_horaria.py",
        "ano": ANO,
        "delta_t_s": DELTA_T,
        "limite_sol_na_janela": LIMITE,
        "locais": LOCAIS,
        "cenas": CENAS,
        "colunas_horas": ["indice_da_hora", "ensolarada", "exposicao", "incidencia_ensolarada", "incidencia"],
        "combinacoes": saida,
    }, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

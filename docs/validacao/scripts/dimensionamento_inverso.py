"""Referência independente para os ângulos exigidos no dimensionamento inverso (F3.6).

Uso: python3 docs/validacao/scripts/dimensionamento_inverso.py
Saída: docs/validacao/casos/dimensionamento/angulos.json
Dependências: requirements.txt (pvlib, numpy, pandas).

Definições da spec 10: período de datas do ano de referência (2026, todos os dias, inclusive, podendo
passar pelo fim do ano) e de horas, em hora solar verdadeira ou legal, amostrado a cada 5 min com as
pontas. Hora solar: o instante em que o ângulo horário vale 15° · (hora − 12), com o ângulo horário
pela equação do tempo do pvlib (H = 15 · (UT + λ/15 + E/60 − 12)), por 4 iterações. Posição do sol:
pvlib spa_python, geométrica (sem refração), ΔT = 69 s. Sol na janela: seno da altura e cos θ de pelo
menos 10⁻⁵. Ângulos do sol (externos, spec 01, seção 1.3): perfil α = atan2(s_z, s_y), ψ e
γ = atan2(s_z, |s_x|). Ângulos exigidos: mín α; mín γ por lado (ψ > 0 direita, ψ < 0 esquerda); máx α
(fresta do brise afastado); mín |ψ| e máx γ por lado (aletas).
"""

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "dimensionamento" / "angulos.json"
ANO = 2026
DELTA_T = 69.0
LIMITE = 1e-5

BRASILIA = {"latitude": -15.863, "longitude": -47.913, "elevation": 1060.4, "timeZone": -3.0}
FLORIANOPOLIS = {"latitude": -27.67, "longitude": -48.547, "elevation": 6.1, "timeZone": -3.0}
MANAUS = {"latitude": -3.039, "longitude": -60.05, "elevation": 80.5, "timeZone": -4.0}

CASOS = [
    {"id": "tutorial-ufu-ano-todo", "local": BRASILIA, "orientacao": 30.0,
     "periodo": {"start": [1, 1], "end": [12, 31], "startHour": 9, "endHour": 15, "timeBase": "solar"}},
    {"id": "tutorial-ufu-inverno", "local": BRASILIA, "orientacao": 30.0,
     "periodo": {"start": [5, 21], "end": [7, 21], "startHour": 9, "endHour": 15, "timeBase": "solar"}},
    {"id": "florianopolis-norte-verao", "local": FLORIANOPOLIS, "orientacao": 0.0,
     "periodo": {"start": [10, 21], "end": [2, 21], "startHour": 9, "endHour": 15, "timeBase": "solar"}},
    {"id": "florianopolis-sul-manhas-de-verao", "local": FLORIANOPOLIS, "orientacao": 180.0,
     "periodo": {"start": [11, 21], "end": [1, 21], "startHour": 6.5, "endHour": 9, "timeBase": "solar"}},
    {"id": "manaus-oeste-tardes-legal", "local": MANAUS, "orientacao": 270.0,
     "periodo": {"start": [1, 1], "end": [12, 31], "startHour": 14, "endHour": 16, "timeBase": "legal"}},
]


def dias(periodo):
    d0 = pd.Timestamp(ANO, *periodo["start"]).day_of_year
    d1 = pd.Timestamp(ANO, *periodo["end"]).day_of_year
    seq = list(range(d0, d1 + 1)) if d0 <= d1 else list(range(d0, 366)) + list(range(1, d1 + 1))
    return [pd.Timestamp(ANO, 1, 1) + pd.Timedelta(days=d - 1) for d in seq]


def amostras(caso, passo_min):
    loc, per = caso["local"], caso["periodo"]
    n = int(round((per["endHour"] - per["startHour"]) * 60 / passo_min))
    horas = per["startHour"] + np.arange(n + 1) * passo_min / 60
    linhas = []
    for dia in dias(per):
        if per["timeBase"] == "legal":
            ut = horas - loc["timeZone"]
        else:
            ut = horas - loc["longitude"] / 15  # palpite: equação do tempo nula
            for _ in range(4):
                t = pd.DatetimeIndex(dia + pd.to_timedelta(ut, unit="h")).tz_localize("UTC")
                eot = pvlib.solarposition.spa_python(t, loc["latitude"], loc["longitude"], altitude=loc["elevation"],
                                                     delta_t=DELTA_T, how="numpy")["equation_of_time"].to_numpy()
                ut = horas - loc["longitude"] / 15 - eot / 60
        t = pd.DatetimeIndex(dia + pd.to_timedelta(ut, unit="h")).tz_localize("UTC")
        sp = pvlib.solarposition.spa_python(t, loc["latitude"], loc["longitude"], altitude=loc["elevation"],
                                            delta_t=DELTA_T, how="numpy")
        for h, el, az in zip(horas, sp["elevation"].to_numpy(), sp["azimuth"].to_numpy()):
            linhas.append((dia.month, dia.day, float(h), el, az))
    return linhas


def angulos(caso, passo_min):
    a = np.array(amostras(caso, passo_min))
    el, az = np.radians(a[:, 3]), a[:, 4]
    psi = (az - caso["orientacao"] + 180.0) % 360.0 - 180.0
    p = np.radians(psi)
    sx, sy, sz = np.cos(el) * np.sin(p), np.cos(el) * np.cos(p), np.sin(el)
    ok = (sy >= LIMITE) & (sz >= LIMITE)
    perfil = np.degrees(np.arctan2(sz, sy))
    gama = np.degrees(np.arctan2(sz, np.abs(sx)))
    dir_, esq = ok & (psi > 0), ok & (psi < 0)

    def extremo(valores, sel, fn):
        if not sel.any():
            return None
        idx = np.flatnonzero(sel)
        i = idx[fn(valores[idx])]
        return {"externo": float(valores[i]), "mes": int(a[i, 0]), "dia": int(a[i, 1]), "hora": float(a[i, 2])}

    return {
        "amostras": int(len(a)), "com_sol_na_janela": int(ok.sum()),
        "alfa_min": extremo(perfil, ok, np.argmin),
        "alfa_max": extremo(perfil, ok, np.argmax),
        "gama_direita_min": extremo(gama, dir_, np.argmin),
        "gama_esquerda_min": extremo(gama, esq, np.argmin),
        "beta_direita_min": extremo(np.abs(psi), dir_, np.argmin),
        "beta_esquerda_min": extremo(np.abs(psi), esq, np.argmin),
        "gama_aleta_direita_max": extremo(gama, dir_, np.argmax),
        "gama_aleta_esquerda_max": extremo(gama, esq, np.argmax),
    }


def main():
    saida = []
    for caso in CASOS:
        r5 = angulos(caso, 5)
        r1 = angulos(caso, 1)
        dif = {k: round(abs(r5[k]["externo"] - r1[k]["externo"]), 4)
               for k in r5 if isinstance(r5[k], dict) and r1.get(k)}
        saida.append({**caso, "passo_min": 5, "angulos": r5, "dif_contra_1_min": dif})
        txt = ", ".join(f"{k} {v['externo']:.2f}° ({v['dia']}/{v['mes']} {v['hora']:.2f} h)"
                        for k, v in r5.items() if isinstance(v, dict))
        print(f"{caso['id']}: {r5['com_sol_na_janela']}/{r5['amostras']} amostras com sol; {txt}")
        print(f"   diferença máxima contra 1 min: {max(dif.values()) if dif else 0:.4f}°")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"gerado_por": "docs/validacao/scripts/dimensionamento_inverso.py", "casos": saida},
                              ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"gravado {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

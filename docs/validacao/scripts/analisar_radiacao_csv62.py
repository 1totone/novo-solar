"""Convenção de tempo e coerência da radiação nos CSV do SOL-AR 6.2 (F2.7).

Uso: python3 docs/validacao/scripts/analisar_radiacao_csv62.py
Saída: docs/validacao/casos/solar-6.2/radiacao-csv.json
Dependências: requirements.txt (pvlib, numpy, pandas).

Os registros de origem das TRY não têm radiação (Goulart, Lamberts e Firmino, 1998, cap. 1 e
fig. 2.1); as colunas de radiação dos CSV foram geradas depois, por modelo. Este script descobre em
que instante e em que lugar o modelo pôs o sol:

1. A coluna de radiação extraterrestre horizontal é comparada com I0·cos z (pvlib, SPA, minuto a
   minuto, constante solar 1366,1 W/m²) integrada no intervalo [h − 1 + d, h + d] da hora legal do
   fuso do arquivo (−3; −4 em Concepción), nas coordenadas da estação (cabeçalho do TMYx, que
   coincide com o livro de 1998). O deslocamento d que minimiza o erro quadrático médio, com um
   fator de escala livre, diz quando o modelo pôs o sol: d = 0 é a convenção do EPW (hora que
   termina, na hora legal). A busca é em passos de 1 min, refinada por uma parábola nos três
   melhores pontos. A longitude equivalente do modelo é λ + d/4 (graus, leste positiva), porque 1°
   de longitude equivale a 4 min de tempo solar. O ajuste é repetido com a latitude de sinal
   trocado, para detectar um modelo que pôs a estação no hemisfério errado.
2. A radiação global é comparada com a extraterrestre do próprio arquivo: horas com global > 0 e
   extraterrestre nula (sol abaixo do horizonte), horas com global maior que a extraterrestre (k_t
   > 1, impossível) e a diferença média entre a primeira e a última hora com sol de cada dia.

"Atraso da radiação" = −d: minutos em que a radiação do arquivo vem depois do sol real.
"""

import csv
import json
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "docs" / "validacao" / "casos" / "solar-6.2"
CATALOG = ROOT / "docs" / "validacao" / "casos" / "epw" / "catalogo-cidades.json"
OUT = DIR / "radiacao-csv.json"
SHIFTS = range(-90, 91)


def load(path):
    rows = [r for r in csv.reader(path.open(encoding="utf-8")) if any(x.strip() for x in r)]
    return np.array([[float(x) if x.strip() else np.nan for x in r[:19]] for r in rows])


def extraterrestrial_minutes(lat, lon, tz):
    """I0·cos z em W/m², no meio de cada minuto, de 1/1 0h a 1/1 do ano seguinte 3h (hora legal)."""
    idx = pd.date_range("2001-01-01 00:00:30", "2002-01-01 03:00", freq="1min", tz=f"Etc/GMT{-int(tz):+d}", inclusive="left")
    zen = pvlib.solarposition.get_solarposition(idx, lat, lon, method="nrel_numpy")["zenith"].to_numpy()
    e0 = pvlib.irradiance.get_extra_radiation(idx, solar_constant=1366.1).to_numpy()
    cz = np.cos(np.radians(zen))
    return np.where(cz > 0, e0 * cz, 0.0)


def fit_shift(ext, minutes):
    """Erro e escala para cada deslocamento d (min) da integral horária [h - 1 + d, h + d]."""
    cum = np.concatenate([[0.0], np.cumsum(minutes) / 60.0])  # Wh/m² acumulado
    end = np.arange(1, 8761) * 60  # fim de cada hora, em minutos desde 1/1 0h
    good = ~np.isnan(ext)
    out = {}
    for d in SHIFTS:
        e = end + d
        start = e - 60
        valid = start >= 0
        model = np.where(valid, cum[np.clip(e, 0, None)] - cum[np.clip(start, 0, None)], np.nan)
        m = good & valid
        k = np.sum(ext[m] * model[m]) / np.sum(model[m] ** 2)
        out[d] = (float(np.sqrt(np.mean((ext[m] - k * model[m]) ** 2))), float(k))
    return out


def refine(errors, best):
    """Mínimo da parábola pelos erros em best - 1, best e best + 1 (min)."""
    if best - 1 not in errors or best + 1 not in errors:
        return float(best)
    a, b, c = errors[best - 1][0], errors[best][0], errors[best + 1][0]
    den = a - 2 * b + c
    return best + (a - c) / (2 * den) if den > 0 else float(best)


def sun_hours(ext, ghi):
    e = ext.reshape(365, 24)
    g = ghi.reshape(365, 24)
    first, last = [], []
    for day in range(365):
        he = np.nonzero(e[day] > 0)[0]
        hg = np.nonzero(g[day] > 0)[0]
        if len(he) and len(hg):
            first.append(hg[0] - he[0])
            last.append(hg[-1] - he[-1])
    return float(np.mean(first)), float(np.mean(last))


def main():
    cities = {c["solar_6_2"]["arquivo"]: c for c in json.loads(CATALOG.read_text(encoding="utf-8"))["cidades"] if c["solar_6_2"]}
    out = {"gerado_por": "docs/validacao/scripts/analisar_radiacao_csv62.py", "arquivos": {}}
    for name in sorted(cities):
        a = load(DIR / name)
        st = cities[name]["tmyx"]
        ext, ghi = a[:, 14], a[:, 15]
        errors = fit_shift(ext, extraterrestrial_minutes(st["latitude"], st["longitude"], st["fuso"]))
        best = min(errors, key=lambda d: errors[d][0])
        flipped = fit_shift(ext, extraterrestrial_minutes(-st["latitude"], st["longitude"], st["fuso"]))
        best_flipped = min(flipped, key=lambda d: flipped[d][0])
        d_fine = refine(errors, best)
        first, last = sun_hours(ext, ghi)
        present = ~np.isnan(ghi)
        out["arquivos"][name] = {
            "estacao": {"latitude": st["latitude"], "longitude": st["longitude"], "fuso": st["fuso"]},
            "extraterrestre": {
                "rmse_d0": round(errors[0][0], 2),
                "melhor_d_min": round(d_fine, 1),
                "rmse_melhor": round(errors[best][0], 2),
                "escala_melhor": round(errors[best][1], 4),
                "longitude_equivalente": round(st["longitude"] + d_fine / 4, 2),
                "rmse_latitude_de_sinal_trocado": round(flipped[best_flipped][0], 2),
            },
            "global": {
                "horas_com_global_sem_sol": int(np.sum(present & (ext == 0) & (ghi > 0))),
                "horas_com_global_maior_que_extra": int(np.sum(present & (ext > 0) & (ghi > ext))),
                "primeira_hora_com_sol_menos_extra_h": round(first, 2),
                "ultima_hora_com_sol_menos_extra_h": round(last, 2),
            },
            "atraso_radiacao_min": round(-d_fine, 1),
        }
        r = out["arquivos"][name]
        print(
            f"{name:20s} d={d_fine:+6.1f} min  rmse {r['extraterrestre']['rmse_d0']:7.2f} -> {r['extraterrestre']['rmse_melhor']:5.2f} (lat. trocada {r['extraterrestre']['rmse_latitude_de_sinal_trocado']:6.2f})"
            f"  lon. equiv. {r['extraterrestre']['longitude_equivalente']:7.2f}  global sem sol {r['global']['horas_com_global_sem_sol']:4d}"
            f"  global > extra {r['global']['horas_com_global_maior_que_extra']:4d}  1a/ult. hora {first:+.2f}/{last:+.2f}"
        )
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

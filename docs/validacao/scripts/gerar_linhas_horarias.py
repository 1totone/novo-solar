"""Gera pontos de referência das linhas horárias da carta solar (F1.3) com o pvlib.

Uso: python3 docs/validacao/scripts/gerar_linhas_horarias.py
Saída: docs/validacao/casos/carta/linhas-horarias.csv

Para cada local do manifesto, dia 21 de cada mês de 2026 e hora solar verdadeira de 5 h a 19 h,
encontra a hora legal correspondente pela equação do tempo do pvlib
(TST = LST + [4·(λ − 15·fuso) + E]/60, iterado até convergir) e calcula a posição do sol nesse
instante. Só entram pontos com o sol acima do horizonte (ângulo zenital geométrico < 90°).
"""

import json
from datetime import timedelta, timezone
from pathlib import Path

import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "docs" / "validacao" / "casos" / "epw" / "manifesto.json"
OUT = ROOT / "docs" / "validacao" / "casos" / "carta" / "linhas-horarias.csv"
YEAR = 2026
DELTA_T = 69.0


def position(t, site):
    sp = pvlib.solarposition.spa_python(
        pd.DatetimeIndex([t]), site["latitude"], site["longitude"], altitude=site["elevacao"],
        delta_t=DELTA_T, how="numpy",
    )
    return sp.iloc[0]


def main() -> None:
    sites = json.loads(MANIFEST.read_text(encoding="utf-8"))["arquivos"]
    rows = []
    for site in sites:
        tz = timezone(timedelta(hours=site["fuso"]))
        offset_min = 4 * (site["longitude"] - 15 * site["fuso"])
        for month in range(1, 13):
            midnight = pd.Timestamp(year=YEAR, month=month, day=21, tz=tz)
            for tst in range(5, 20):
                lst = tst - offset_min / 60
                for _ in range(4):
                    t = midnight + pd.Timedelta(hours=lst)
                    eot = position(t, site)["equation_of_time"]
                    lst = tst - (offset_min + eot) / 60
                t = midnight + pd.Timedelta(hours=lst)
                p = position(t, site)
                if p["zenith"] >= 90:
                    continue
                rows.append({
                    "local": site["id"],
                    "data": f"{YEAR}-{month:02d}-21",
                    "hora_solar": tst,
                    "utc": t.tz_convert("UTC").strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                    "zenite": p["zenith"],
                    "azimute": p["azimuth"],
                })
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pd.DataFrame(rows).to_csv(OUT, index=False, float_format="%.8f")
    print(f"{len(rows)} pontos em {OUT}")


if __name__ == "__main__":
    main()

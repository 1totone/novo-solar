"""Gera os valores de referência de posição solar com o pvlib (NREL SPA), para os testes do F1.2.

Uso: python3 docs/validacao/scripts/gerar_posicao_solar.py
Saída: docs/validacao/casos/posicao-solar/
  - posicao.csv: posição a cada 30 min (hora legal) no dia 21 de cada mês, nos 6 locais de teste;
  - nascer-por.csv: nascer, pôr e passagem meridiana nos mesmos dias.

Convenções (docs/spec/02-tempo-e-posicao-solar.md): ano de referência 2026, ΔT = 69 s, hora legal
com o fuso do cabeçalho do EPW, local e elevação do cabeçalho do EPW (manifesto em casos/epw/).
O ângulo zenital "geometrico" não tem refração; o "aparente" usa a refração padrão do SPA
(1013,25 hPa, 12 °C, 0,5667°; padrões do pvlib) e serve só para referência.
"""

import json
from datetime import timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "docs" / "validacao" / "casos" / "epw" / "manifesto.json"
OUT = ROOT / "docs" / "validacao" / "casos" / "posicao-solar"
YEAR = 2026
DELTA_T = 69.0
PRESSURE_PA = 101325.0
TEMPERATURE_C = 12.0


def site_rows(site: dict) -> tuple[pd.DataFrame, pd.DataFrame]:
    tz = timezone(timedelta(hours=site["fuso"]))
    lat, lon, elev = site["latitude"], site["longitude"], site["elevacao"]
    pos, rst = [], []
    for month in range(1, 13):
        start = pd.Timestamp(year=YEAR, month=month, day=21, tz=tz)
        times = pd.date_range(start, periods=48, freq="30min")
        sp = pvlib.solarposition.spa_python(
            times, lat, lon, altitude=elev, pressure=PRESSURE_PA, temperature=TEMPERATURE_C,
            delta_t=DELTA_T, atmos_refract=0.5667, how="numpy",
        )
        ha = pvlib.solarposition.hour_angle(times, lon, sp["equation_of_time"].to_numpy())
        pos.append(pd.DataFrame({
            "local": site["id"],
            "hora_legal": times.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "utc": times.tz_convert("UTC").strftime("%Y-%m-%dT%H:%M:%SZ"),
            "zenite_geometrico": sp["zenith"].to_numpy(),
            "zenite_aparente": sp["apparent_zenith"].to_numpy(),
            "azimute": sp["azimuth"].to_numpy(),
            "equacao_do_tempo_min": sp["equation_of_time"].to_numpy(),
            "angulo_horario": np.asarray(ha),
        }))
        rs = pvlib.solarposition.sun_rise_set_transit_spa(
            pd.DatetimeIndex([start]), lat, lon, how="numpy", delta_t=DELTA_T
        )
        fmt = "%Y-%m-%dT%H:%M:%S.%f%z"
        rst.append(pd.DataFrame({
            "local": site["id"],
            "data": [start.strftime("%Y-%m-%d")],
            "nascer": rs["sunrise"].dt.strftime(fmt).to_numpy(),
            "por": rs["sunset"].dt.strftime(fmt).to_numpy(),
            "passagem": rs["transit"].dt.strftime(fmt).to_numpy(),
        }))
    return pd.concat(pos), pd.concat(rst)


def main() -> None:
    sites = json.loads(MANIFEST.read_text(encoding="utf-8"))["arquivos"]
    OUT.mkdir(parents=True, exist_ok=True)
    pos, rst = zip(*(site_rows(s) for s in sites))
    pd.concat(pos).to_csv(OUT / "posicao.csv", index=False, float_format="%.8f")
    pd.concat(rst).to_csv(OUT / "nascer-por.csv", index=False)
    meta = {
        "gerado_por": "docs/validacao/scripts/gerar_posicao_solar.py",
        "pvlib": pvlib.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "ano": YEAR,
        "delta_t_s": DELTA_T,
        "pressao_pa": PRESSURE_PA,
        "temperatura_c": TEMPERATURE_C,
        "refracao_horizonte_graus": 0.5667,
        "locais": [
            {k: s[k] for k in ("id", "latitude", "longitude", "fuso", "elevacao")} for s in sites
        ],
    }
    (OUT / "metadados.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{sum(len(p) for p in pos)} posições e {sum(len(r) for r in rst)} dias em {OUT}")


if __name__ == "__main__":
    main()

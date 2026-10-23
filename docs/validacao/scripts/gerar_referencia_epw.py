"""Gera a referência independente para o leitor de EPW (F1.1), usando pvlib.iotools.read_epw.

Uso: python3 docs/validacao/scripts/gerar_referencia_epw.py [pasta_dos_epw]
Pasta padrão: .cache/epw/ (preencha antes com baixar_epw.py).
Saída: docs/validacao/casos/epw/referencia-pvlib.json

Para cada EPW do manifesto: metadados do cabeçalho, número de horas e, para cada campo usado,
a contagem de valores com código de ausente (docs/spec/04-dados-climaticos.md) e a soma, o
mínimo e o máximo dos valores presentes. Também guarda a primeira e a última hora.
"""

import json
import sys
from pathlib import Path

import numpy as np
import pvlib

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "docs" / "validacao" / "casos" / "epw" / "manifesto.json"
OUT = ROOT / "docs" / "validacao" / "casos" / "epw" / "referencia-pvlib.json"

# coluna do pvlib -> (nome no projeto, código de ausente)
FIELDS = {
    "temp_air": ("dryBulb", 99.9),
    "temp_dew": ("dewPoint", 99.9),
    "relative_humidity": ("relativeHumidity", 999),
    "atmospheric_pressure": ("pressure", 999999),
    "etr": ("extraterrestrialHorizontal", 9999),
    "ghi": ("globalHorizontal", 9999),
    "dni": ("directNormal", 9999),
    "dhi": ("diffuseHorizontal", 9999),
    "wind_direction": ("windDirection", 999),
    "wind_speed": ("windSpeed", 999),
    "total_sky_cover": ("totalSkyCover", 99),
}


def main() -> None:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".cache" / "epw"
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))["arquivos"]
    result = {"gerado_por": "docs/validacao/scripts/gerar_referencia_epw.py", "pvlib": pvlib.__version__, "arquivos": {}}
    for e in entries:
        data, meta = pvlib.iotools.read_epw(src / e["arquivo"], coerce_year=None)
        fields = {}
        for col, (name, code) in FIELDS.items():
            v = data[col].to_numpy(dtype=float)
            missing = v >= code
            present = v[~missing]
            fields[name] = {
                "ausentes": int(missing.sum()),
                "soma": float(present.sum()),
                "minimo": float(present.min()) if present.size else None,
                "maximo": float(present.max()) if present.size else None,
            }
        first, last = data.iloc[0], data.iloc[-1]
        result["arquivos"][e["id"]] = {
            "arquivo": e["arquivo"],
            "local": {
                "cidade": meta["city"], "estado": meta["state-prov"], "pais": meta["country"],
                "wmo": str(meta["WMO_code"]), "latitude": float(meta["latitude"]),
                "longitude": float(meta["longitude"]), "fuso": float(meta["TZ"]),
                "elevacao": float(meta["altitude"]),
            },
            "horas": int(len(data)),
            "primeira": {"mes": int(first["month"]), "dia": int(first["day"]), "hora": int(first["hour"]), "tbs": float(first["temp_air"])},
            "ultima": {"mes": int(last["month"]), "dia": int(last["day"]), "hora": int(last["hour"]), "tbs": float(last["temp_air"])},
            "campos": fields,
        }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(entries)} arquivos em {OUT}")


if __name__ == "__main__":
    main()

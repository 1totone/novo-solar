"""Referência independente do leitor do CSV do SOL-AR 6.2 (F2.7).

Uso: python3 docs/validacao/scripts/gerar_referencia_csv62.py
Saída: docs/validacao/casos/solar-6.2/referencia-csv.json

Lê com o módulo csv do Python os 15 arquivos horários do 6.2 (sem cabeçalho) e o exemplo do
formato "Incluir Nova Cidade" (com cabeçalho de local) e grava, para cada arquivo: linhas de dados,
linhas sem nenhum valor (ignoradas), primeira e última hora e, por campo usado pela aplicação, o
número de valores ausentes (campo vazio), a soma, o mínimo e o máximo, na unidade do arquivo de
origem (a pressão fica em kPa; a conversão para Pa é conferida no teste). Também confere se os
dados do exemplo de inclusão são idênticos, texto a texto, aos de concepcion.csv.
Só biblioteca padrão.
"""

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "docs" / "validacao" / "casos" / "solar-6.2"
OUT = DIR / "referencia-csv.json"
INCLUSION = DIR / "formato-inclusao" / "CHL_Concepcion_NormaIWEC_SOlAr.csv"

# Campo da aplicação -> coluna do CSV (a partir de 0; spec 04, seção 4.2)
FIELDS = {
    "dryBulb": 3,
    "dewPoint": 5,
    "pressure": 6,
    "relativeHumidity": 8,
    "windSpeed": 11,
    "windDirection": 12,
    "totalSkyCover": 13,
    "extraterrestrialHorizontal": 14,
    "globalHorizontal": 15,
    "directNormal": 17,
    "diffuseHorizontal": 18,
}


def is_empty(row):
    return all(x.strip() == "" for x in row)


def describe(rows, blank):
    fields = {}
    for name, col in FIELDS.items():
        vals = [float(r[col]) for r in rows if r[col].strip() != ""]
        fields[name] = {
            "ausentes": len(rows) - len(vals),
            "soma": round(sum(vals), 6),
            "minimo": min(vals) if vals else None,
            "maximo": max(vals) if vals else None,
        }
    first, last = rows[0], rows[-1]
    return {
        "linhas": len(rows),
        "linhas_vazias": blank,
        "primeira": {"mes": int(first[0]), "dia": int(first[1]), "hora": int(first[2]), "tbs": float(first[3])},
        "ultima": {"mes": int(last[0]), "dia": int(last[1]), "hora": int(last[2]), "tbs": float(last[3])},
        "campos": fields,
    }


def read_rows(path):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.reader(f))


def main():
    out = {"gerado_por": "docs/validacao/scripts/gerar_referencia_csv62.py", "arquivos": {}}
    for path in sorted(DIR.glob("*.csv")):
        if path.name == "Latitudes.csv" or path.name.endswith(".ventos.csv"):
            continue
        all_rows = read_rows(path)
        rows = [r for r in all_rows if not is_empty(r)]
        out["arquivos"][path.name] = describe(rows, len(all_rows) - len(rows))

    # Formato de inclusão: linha 1 com rótulos, linha 2 com o local, depois rótulos das colunas.
    all_rows = read_rows(INCLUSION)
    loc = all_rows[1]
    data_start = next(i for i in range(2, len(all_rows)) if all_rows[i] and all_rows[i][0].strip().isdigit())
    body = all_rows[data_start:]
    rows = [r for r in body if not is_empty(r)]
    ref = describe(rows, len(body) - len(rows))
    ref["local"] = {
        "nome": loc[0],
        "latitude": float(loc[1]),
        "longitude": float(loc[2]),
        "fuso": float(loc[3]),
        "elevacao": float(loc[4]),
    }
    ref["primeira_linha_de_dados"] = data_start + 1
    concepcion = [r for r in read_rows(DIR / "concepcion.csv") if not is_empty(r)]
    ref["dados_identicos_a_concepcion_csv"] = [r[:19] for r in rows] == [r[:19] for r in concepcion]
    out["arquivos"]["formato-inclusao/" + INCLUSION.name] = ref

    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for k, v in out["arquivos"].items():
        c = v["campos"]
        print(f"{k:58s} {v['linhas']} vazias={v['linhas_vazias']} tbs=[{c['dryBulb']['minimo']}, {c['dryBulb']['maximo']}] DNI ausentes={c['directNormal']['ausentes']}")


if __name__ == "__main__":
    main()

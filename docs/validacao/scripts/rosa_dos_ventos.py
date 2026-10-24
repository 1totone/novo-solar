"""Referência independente para a rosa dos ventos (F2.5): estatísticas de vento em Python puro.

Uso: python3 docs/validacao/scripts/rosa_dos_ventos.py
Lê os EPWs de teste em .cache/epw/ (baixe antes com baixar_epw.py) e grava
docs/validacao/casos/vento/rosas.json.

Definições (spec 06):
- direção do EPW (campo 21): de onde o vento sopra, 0° = N, 90° = L; velocidade (campo 22) em m/s;
  999 = ausente. Horas com direção ou velocidade ausente ficam de fora (e são contadas).
- calmaria: velocidade abaixo de 0,5 m/s, qualquer que seja a direção;
- setores: n = 8 ou 16, o setor k centrado em k·360/n, cobrindo [centro − w/2, centro + w/2),
  w = 360/n; 360° conta como 0°;
- classes de velocidade: [0,5; 2), [2; 4), [4; 6) e 6 ou mais;
- estações pelos meses (dez a fev, mar a mai, jun a ago, set a nov); período do dia pelas horas
  do arquivo (1 a 6, 7 a 12, 13 a 18, 19 a 24);
- frequência: porcentagem das horas válidas do filtro (calmarias inclusas no total);
- velocidade média por setor: média das horas sem calmaria daquele setor.
Nada aqui usa o código da aplicação.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / ".cache" / "epw"
OUT = ROOT / "docs" / "validacao" / "casos" / "vento" / "rosas.json"
FILES = {
    "florianopolis": "BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.epw",
    "porto-alegre": "BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.epw",
    "belem": "BRA_PA_Belem-Val.de.Cans.Intl.AP.821930_TMYx.2011-2025.epw",
}
SEASONS = {"ano": None, "dez-fev": (12, 1, 2), "mar-mai": (3, 4, 5), "jun-ago": (6, 7, 8), "set-nov": (9, 10, 11)}
PERIODS = {"todos": None, "1-6": range(1, 7), "7-12": range(7, 13), "13-18": range(13, 19), "19-24": range(19, 25)}
CLASSES = [(0.5, 2.0), (2.0, 4.0), (4.0, 6.0), (6.0, float("inf"))]


def read(path):
    rows = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f):
            if i < 8:
                continue
            c = line.rstrip("\n").split(",")
            rows.append((int(c[1]), int(c[2]), int(c[3]), float(c[20]), float(c[21])))
    return rows


def sector(direction, n):
    w = 360.0 / n
    d = direction % 360.0
    return int(((d + w / 2.0) % 360.0) // w)


def stats(rows, n, months, hours):
    sel = [r for r in rows if (months is None or r[0] in months) and (hours is None or r[2] in hours)]
    valid = [r for r in sel if r[3] != 999 and r[4] != 999]
    total = len(valid)
    freq = [[0] * len(CLASSES) for _ in range(n)]
    speed_sum = [0.0] * n
    speed_n = [0] * n
    calm = 0
    for _m, _d, _h, direction, speed in valid:
        if speed < 0.5:
            calm += 1
            continue
        k = sector(direction, n)
        c = next(i for i, (a, b) in enumerate(CLASSES) if a <= speed < b)
        freq[k][c] += 1
        speed_sum[k] += speed
        speed_n[k] += 1
    pct = lambda x: round(100.0 * x / total, 9) if total else 0.0
    return {
        "horas": len(sel),
        "validas": total,
        "calmaria": pct(calm),
        "frequencia": [[pct(x) for x in row] for row in freq],
        "velocidade_media": [round(speed_sum[k] / speed_n[k], 9) if speed_n[k] else None for k in range(n)],
    }


def main():
    out = {"gerado_por": "docs/validacao/scripts/rosa_dos_ventos.py", "casos": {}}
    for site, name in FILES.items():
        rows = read(CACHE / name)
        speeds = sorted({r[4] for r in rows if r[4] != 999})
        res = next(r for r in (1.0, 0.5, 0.1, 0.01) if all(abs(v / r - round(v / r)) < 1e-6 for v in speeds))
        case = {"arquivo": name, "resolucao_velocidade": res, "rosas": []}
        for n in (8, 16):
            for season, months in SEASONS.items():
                for period, hours in PERIODS.items():
                    case["rosas"].append({"setores": n, "estacao": season, "periodo": period, **stats(rows, n, months, hours)})
        out["casos"][site] = case
        print(site, "resolução", res)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

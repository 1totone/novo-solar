"""Referência independente do F4.3: analemas em hora legal, projeções equidistante e cilíndrica e
curvas do transferidor nessas projeções (docs/spec/02, seção 2.5.1, e docs/spec/03, seção 3.5).

Uso: python3 docs/validacao/scripts/gerar_projecoes_analemas.py
Saída: docs/validacao/casos/carta/projecoes-analemas.json

- Analemas: posição do sol (pvlib spa_python, geométrica, ΔT = 69 s) às H:00 da hora legal, com o
  instante montado pelo pandas com um fuso fixo (timezone(timedelta(hours=fuso))), de 5 a 19 h, nos
  dias 1, 13, 25, ... do ano de referência (a cada 12 dias; a aplicação usa a cada 3, e estes dias
  estão entre os dela). Locais: os 6 do manifesto dos EPWs de teste e mais Rio Branco (UTC−5),
  Nova Délhi (UTC+5,5, fuso fracionário) e Lisboa (UTC+0, hemisfério norte).
- Hora solar verdadeira ao meio-dia legal (pvlib, equação do tempo), extremos do ano.
- Projeções: coordenadas equidistante e cilíndrica (spec 03, seções 3.5.1 e 3.5.2) dos pontos dos
  analemas das 9, 12 e 15 h, para dois centros da cilíndrica.
- Transferidor: pontos das curvas de α, γ e β pelas fórmulas fechadas da seção 3.5.2 (no
  referencial da fachada, ψ e h), levados para as duas projeções.
"""

import json
import math
from datetime import timedelta, timezone
from pathlib import Path

import pandas as pd
import pvlib

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "docs" / "validacao" / "casos" / "epw" / "manifesto.json"
OUT = ROOT / "docs" / "validacao" / "casos" / "carta" / "projecoes-analemas.json"
YEAR = 2026
DELTA_T = 69.0
HOURS = list(range(5, 20))
DAYS = list(range(0, 365, 12))  # índice do dia no ano (0 = 1º de janeiro)
CENTERS = [0.0, 135.0]
EXTRA_SITES = [
    {"id": "rio-branco", "latitude": -9.868, "longitude": -67.898, "fuso": -5.0, "elevacao": 194.0},
    {"id": "nova-delhi", "latitude": 28.567, "longitude": 77.103, "fuso": 5.5, "elevacao": 216.0},
    {"id": "lisboa", "latitude": 38.767, "longitude": -9.133, "fuso": 0.0, "elevacao": 114.0},
]


def r8(x: float) -> float:
    return round(float(x), 8)


def r6(x: float) -> float:
    return round(float(x), 6)


def wrap180(a: float) -> float:
    r = math.fmod(a + 180.0, 360.0)
    if r < 0:
        r += 360.0
    return r - 180.0


def equidistant(zenith: float, azimuth: float) -> tuple[float, float]:
    r = zenith / 90.0
    a = math.radians(azimuth)
    return r * math.sin(a), r * math.cos(a)


def cylindrical(zenith: float, azimuth: float, center: float) -> tuple[float, float]:
    return wrap180(azimuth - center) / 180.0, (90.0 - zenith) / 90.0


def analemmas(site: dict) -> tuple[list, dict]:
    tz = timezone(timedelta(hours=site["fuso"]))
    times, keys = [], []
    for d in DAYS:
        day = pd.Timestamp(year=YEAR, month=1, day=1, tz=tz) + pd.Timedelta(days=d)
        for h in HOURS:
            times.append(day + pd.Timedelta(hours=h))
            keys.append((d, h))
    idx = pd.DatetimeIndex(times)
    sp = pvlib.solarposition.spa_python(
        idx, site["latitude"], site["longitude"], altitude=site["elevacao"], delta_t=DELTA_T,
        how="numpy",
    )
    rows = []
    for (d, h), z, a in zip(keys, sp["zenith"].to_numpy(), sp["azimuth"].to_numpy()):
        row = [d, h, r6(z), r6(a)]
        if h in (9, 12, 15):
            xe, ye = equidistant(z, a)
            row += [r8(xe), r8(ye)]
            for c in CENTERS:
                xc, yc = cylindrical(z, a, c)
                row += [r8(xc), r8(yc)]
        rows.append(row)
    # Hora solar verdadeira ao meio-dia legal, dia a dia (equação do tempo do pvlib).
    noon = pd.DatetimeIndex(
        [pd.Timestamp(year=YEAR, month=1, day=1, hour=12, tz=tz) + pd.Timedelta(days=d)
         for d in range(365)]
    )
    eot = pvlib.solarposition.spa_python(
        noon, site["latitude"], site["longitude"], altitude=site["elevacao"], delta_t=DELTA_T,
        how="numpy",
    )["equation_of_time"].to_numpy()
    offset = 4.0 * (site["longitude"] - 15.0 * site["fuso"])
    tst_min = [offset + e for e in eot]  # minutos de hora solar depois do meio-dia legal
    k_min = min(range(365), key=lambda k: tst_min[k])
    k_max = max(range(365), key=lambda k: tst_min[k])
    summary = {
        "longitude_min": r8(offset),
        "tst_menos_legal_min": {"valor": r8(tst_min[k_min]), "dia": k_min},
        "tst_menos_legal_max": {"valor": r8(tst_min[k_max]), "dia": k_max},
    }
    return rows, summary


def protractor() -> list:
    """Pontos das curvas do transferidor pelas fórmulas da spec 03, seção 3.5.2."""
    curves = []
    for orientation in [0.0, 30.0, 135.0, 270.0, -30.0]:
        def point(psi: float, h: float) -> list:
            az = (orientation + psi) % 360.0
            z = 90.0 - h
            xe, ye = equidistant(z, az)
            xc, yc = cylindrical(z, az, orientation)
            return [r8(psi), r8(h), r8(xe), r8(ye), r8(xc), r8(yc)]

        for alpha in [10.0, 30.0, 45.0, 60.0, 80.0]:
            pts = []
            for k in range(-88, 89, 4):
                psi = float(k)
                h = math.degrees(math.atan(math.tan(math.radians(alpha)) * math.cos(math.radians(psi))))
                pts.append(point(psi, h))
            curves.append({"orientacao": orientation, "familia": "alpha", "lado": None,
                           "externo": alpha, "pontos": pts})
        for gamma in [15.0, 45.0, 75.0]:
            for side, sign in (("right", 1.0), ("left", -1.0)):
                pts = []
                for k in range(1, 180, 8):
                    psi = sign * float(k)
                    h = math.degrees(math.atan(math.tan(math.radians(gamma)) * math.sin(math.radians(abs(psi)))))
                    pts.append(point(psi, h))
                curves.append({"orientacao": orientation, "familia": "gamma", "lado": side,
                               "externo": gamma, "pontos": pts})
        for beta in [20.0, 50.0]:
            for side, sign in (("right", 1.0), ("left", -1.0)):
                pts = [point(sign * beta, float(h)) for h in range(0, 90, 10)]
                curves.append({"orientacao": orientation, "familia": "beta", "lado": side,
                               "externo": beta, "pontos": pts})
    return curves


def main() -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))["arquivos"]
    sites = [
        {k: s[k] for k in ("id", "latitude", "longitude", "fuso", "elevacao")} for s in manifest
    ] + EXTRA_SITES
    out = {
        "gerado_por": "docs/validacao/scripts/gerar_projecoes_analemas.py",
        "pvlib": pvlib.__version__,
        "pandas": pd.__version__,
        "ano": YEAR,
        "delta_t_s": DELTA_T,
        "horas": HOURS,
        "dias": DAYS,
        "centros_cilindrica": CENTERS,
        "colunas_analema": "dia (0 = 1/1), hora legal, zênite, azimute; nas horas 9, 12 e 15: x e y na equidistante e, para cada centro, x e y na cilíndrica",
        "colunas_transferidor": "ψ, h, x e y na equidistante, x e y na cilíndrica centrada na normal",
        "locais": [],
        "transferidor": protractor(),
    }
    for site in sites:
        rows, summary = analemmas(site)
        out["locais"].append({**site, "analema": rows, "meio_dia_legal": summary})
        s = summary
        print(f"{site['id']:14s} longitude {s['longitude_min']:7.2f} min; TST − legal ao meio-dia de "
              f"{s['tst_menos_legal_min']['valor']:7.2f} (dia {s['tst_menos_legal_min']['dia']}) a "
              f"{s['tst_menos_legal_max']['valor']:7.2f} min (dia {s['tst_menos_legal_max']['dia']})")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{OUT} ({OUT.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()

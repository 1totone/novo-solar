"""Regressão contra o SOL-AR 6.2 (F2.8): mesmas entradas, modelo do 6.2 e cálculo da nova versão.

Uso: python3 docs/validacao/scripts/regressao_solar62.py
Saída: docs/validacao/casos/solar-6.2/regressao.json
Dependências: requirements.txt (pvlib, numpy, pandas).

1. Carta: declinações fixas das trajetórias do 6.2 contra as do SPA nas datas da nova versão
   (solstícios, equinócios e dia 21 dos outros meses, ano de referência 2026, meio-dia em UTC−3);
   declinação de Cooper (sobreposição do 6.2) contra o SPA ao longo do ano.
2. Sobreposição: deslocamento, em minutos de tempo solar, entre onde o 6.2 põe o valor de cada
   hora e onde ele deveria estar (o instante h para temperatura e umidade, o meio do intervalo
   [h − 1, h] para radiação), para as 15 cidades e os 365 dias, com as coordenadas da estação, o
   fuso do arquivo e a equação do tempo do SPA. A nova versão usa esse instante correto (spec 05).
3. Rosa dos ventos: os 15 .ventos.csv contra (a) o melhor ajuste das definições, (b) o algoritmo
   de inclusão de cidade do 6.2 e (c) a rosa da nova versão (estações pelos meses, decisão 0016).
"""

import csv
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib

sys.path.insert(0, str(Path(__file__).resolve().parent))
import modelo_solar62 as m62  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "docs" / "validacao" / "casos" / "solar-6.2"
CATALOG = ROOT / "docs" / "validacao" / "casos" / "epw" / "catalogo-cidades.json"
OUT = DIR / "regressao.json"
YEAR = 2026


def spa_declination_and_eot(times):
    """Declinação (graus) e equação do tempo (min) do SPA (pvlib) nos instantes UTC dados."""
    unix = np.asarray((pd.DatetimeIndex(times) - pd.Timestamp("1970-01-01", tz="UTC")) / pd.Timedelta("1s"))
    delta_t = 69.0
    _, _, delta = pvlib.spa.solar_position_numpy(unix, 0.0, 0.0, 0.0, 1013.25, 12.0, delta_t, 0.5667, numthreads=1, sst=True)
    eot = pvlib.solarposition.get_solarposition(pd.DatetimeIndex(times), 0.0, 0.0, method="nrel_numpy")["equation_of_time"].to_numpy()
    return np.asarray(delta), eot


def chart():
    # Datas da nova versão em 2026 (src/core/chart/sunChart.ts): equinócios e solstícios no dia civil
    # em UTC−3 (20/03, 21/06, 23/09, 21/12) e dia 21 dos outros meses.
    pairs = {
        -0.41: ["2026-12-21"],
        -0.35: ["2026-01-21", "2026-11-21"],
        -0.18: ["2026-02-21", "2026-10-21"],
        0.0: ["2026-03-20", "2026-09-23"],
        0.18: ["2026-04-21", "2026-08-21"],
        0.35: ["2026-05-21", "2026-07-21"],
        0.41: ["2026-06-21"],
    }
    rows = []
    for rad, dates in pairs.items():
        times = pd.DatetimeIndex([f"{d} 15:00" for d in dates], tz="UTC")
        decl, _ = spa_declination_and_eot(times)
        d62 = np.degrees(rad)
        rows.append({
            "declinacao_62_rad": rad,
            "declinacao_62_graus": round(d62, 3),
            "datas_nova_versao": dates,
            "declinacao_spa_graus": [round(float(x), 3) for x in decl],
            "diferenca_max_graus": round(float(np.max(np.abs(d62 - decl))), 3),
        })
    days = pd.date_range(f"{YEAR}-01-01 15:00", periods=365, freq="D", tz="UTC")
    decl, _ = spa_declination_and_eot(days)
    cooper = np.array([m62.declinacao_graus(n) for n in range(1, 366)])
    return {
        "trajetorias": rows,
        "cooper_menos_spa_graus": {
            "max_abs": round(float(np.max(np.abs(cooper - decl))), 3),
            "rms": round(float(np.sqrt(np.mean((cooper - decl) ** 2))), 3),
        },
    }


def overlay(cities):
    days = pd.date_range(f"{YEAR}-01-01 15:00", periods=365, freq="D", tz="UTC")
    _, eot = spa_declination_and_eot(days)
    lat62 = {r[2]: r for r in csv.reader((DIR / "Latitudes.csv").open(encoding="utf-8"))}
    out = {}
    for c in cities:
        s62 = c["solar_6_2"]
        st = c["tmyx"]
        lw62 = float(lat62[s62["arquivo"]][4])  # longitude oeste positiva do 6.2
        lam, tz = st["longitude"], st["fuso"]
        # Hora solar = hora legal + correção (h). 6.2: meridiano 45° O, equação do tempo constante.
        corr62 = (4 * (45 - lw62) + m62.EQUACAO_TEMPO_MIN) / 60
        corr_ok = lam / 15 - tz + eot / 60
        # O 6.2 põe o valor da hora h em t = h − 1 (linha floor(t) + 1); o certo é h (temperatura,
        # umidade) ou h − 0,5 (radiação integrada em [h − 1, h]).
        d_tbs = 60 * ((-1 + corr62) - corr_ok)
        d_rad = d_tbs + 30
        parts = {
            "indice_da_hora_min": -60,
            "longitude_min": round(4 * ((-lam) - lw62), 2),
            "meridiano_min": round(60 * (tz + 3), 2),
            "equacao_do_tempo_min": {
                "media": round(float(np.mean(m62.EQUACAO_TEMPO_MIN - eot)), 2),
                "min": round(float(np.min(m62.EQUACAO_TEMPO_MIN - eot)), 2),
                "max": round(float(np.max(m62.EQUACAO_TEMPO_MIN - eot)), 2),
            },
        }
        out[c["id"]] = {
            "longitude_oeste_6_2": lw62,
            "longitude_estacao": lam,
            "fuso": tz,
            "componentes": parts,
            "temperatura_min": {"media": round(float(np.mean(d_tbs)), 1), "min": round(float(np.min(d_tbs)), 1), "max": round(float(np.max(d_tbs)), 1)},
            "radiacao_min": {"media": round(float(np.mean(d_rad)), 1), "min": round(float(np.min(d_rad)), 1), "max": round(float(np.max(d_rad)), 1)},
        }
    return out


def read_rows(name):
    return [r for r in csv.reader((DIR / name).open(encoding="utf-8")) if any(x.strip() for x in r)]


def read_rose(name):
    return np.array([[float(x) for x in r] for r in csv.reader((DIR / name).open(encoding="utf-8")) if r])


MONTH_SEASON = {12: 1, 1: 1, 2: 1, 3: 2, 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 0, 10: 0, 11: 0}


def app_rose(rows):
    """Rosa da nova versão (spec 06): estações pelos meses, setores de 45° centrados no Norte,
    calmaria abaixo de 0,5 m/s, porcentagens sobre as horas válidas. Colunas na ordem do 6.2
    (primavera = set a nov, verão = dez a fev, outono = mar a mai, inverno = jun a ago)."""
    freq = np.zeros((8, 4))
    calm = np.zeros(4)
    valid = np.zeros(4)
    for r in rows:
        s = MONTH_SEASON[int(r[0])]
        v, d = r[11].strip(), r[12].strip()
        if not v or not d:
            continue
        v, d = float(v), float(d)
        valid[s] += 1
        if v < 0.5:
            calm[s] += 1
        else:
            freq[m62.setor_45(d), s] += 1
    return 100 * freq / valid, 100 * calm / valid


def roses(cities):
    out = {}
    for c in cities:
        f = c["solar_6_2"]["arquivo"]
        rows = read_rows(f)
        ref = read_rose(f.replace(".csv", ".ventos.csv"))
        best = np.array(m62.rosa(rows, m62.INICIO_ESTACOES_ARQUIVOS, m62.setor_45))
        incl = np.array(m62.rosa(rows, m62.INICIO_ESTACOES_INCLUIR, m62.setor_incluir))
        app_f, app_c = app_rose(rows)
        out[c["id"]] = {
            "melhor_ajuste_dif_max_pp": {
                "frequencia": round(float(np.max(np.abs(np.round(best[0:8] + 1e-9, 1) - ref[0:8]))), 2),
                "calmaria_por_periodo": round(float(np.max(np.abs(np.round(best[16:20] + 1e-9, 1) - ref[16:20]))), 2),
            },
            "algoritmo_inclusao_dif_max_pp": round(float(np.max(np.abs(incl[0:8] - ref[0:8]))), 2),
            "nova_versao": {
                "frequencia_pct": [[round(float(x), 6) for x in row] for row in app_f],
                "calmaria_pct": [round(float(x), 6) for x in app_c],
                "dif_max_frequencia_pp": round(float(np.max(np.abs(app_f - ref[0:8]))), 2),
                "dif_max_calmaria_pp": round(float(np.max(np.abs(app_c - ref[16:20].mean(axis=0)))), 2),
            },
        }
    return out


def main():
    cities = [c for c in json.loads(CATALOG.read_text(encoding="utf-8"))["cidades"] if c["solar_6_2"]]
    out = {
        "gerado_por": "docs/validacao/scripts/regressao_solar62.py",
        "equacao_do_tempo_6_2_min": round(m62.EQUACAO_TEMPO_MIN, 4),
        "carta": chart(),
        "sobreposicao": overlay(cities),
        "rosa": roses(cities),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("carta:", json.dumps(out["carta"]["cooper_menos_spa_graus"]))
    for t in out["carta"]["trajetorias"]:
        print(f"  {t['declinacao_62_graus']:7.2f} {t['declinacao_spa_graus']} dif {t['diferenca_max_graus']}")
    for k, v in out["sobreposicao"].items():
        print(f"{k:15s} tbs {v['temperatura_min']}  rad {v['radiacao_min']}  long {v['componentes']['longitude_min']}")
    for k, v in out["rosa"].items():
        print(f"{k:15s} ajuste {v['melhor_ajuste_dif_max_pp']} inclusao {v['algoritmo_inclusao_dif_max_pp']} nova {v['nova_versao']['dif_max_frequencia_pp']}/{v['nova_versao']['dif_max_calmaria_pp']}")


if __name__ == "__main__":
    main()

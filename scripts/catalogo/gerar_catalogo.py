"""Catálogo dos arquivos TMYx 2011-2025 do Brasil (F4.1): metadados, qualidade e mapa.

Uso:
    python3 scripts/catalogo/gerar_catalogo.py --cache PASTA [--limite N]

Dependências: docs/validacao/scripts/requirements.txt (pvlib, numpy, pandas, shapely).

O que faz (decisão 0034):
1. Baixa do Climate.OneBuilding.org o KML da Região 3 (lista das estações, com fonte, período e
   número de anos) e cada zip TMYx 2011-2025 do Brasil, para a pasta de cache. Os arquivos não são
   publicados com a aplicação: o catálogo guarda metadados, indicadores de qualidade e o caminho do
   arquivo oficial, e o usuário baixa e carrega o EPW (decisões 0010 e 0034).
2. Lê o EPW dentro do zip, sem extrair, e calcula os indicadores de qualidade da spec 04, seção
   4.3: horas, valores ausentes, calmarias, resolução do vento, horas com índice de claridade acima
   de 0,8, fechamento GHI = DNI · cos z + DHI (sol do SPA, geométrico, no meio da hora, ano de
   referência 2026), somas anuais de radiação e temperaturas.
3. Baixa o Natural Earth 1:50m (domínio público), põe cada estação na UF pelas coordenadas do EPW
   (com o polígono mais próximo para as do litoral e das ilhas) e projeta os contornos das UFs para
   o mapa da aplicação.

Escreve:
- src/ui/data/catalogo/tmyx-brasil.json: uma linha por estação, para o catálogo;
- src/ui/data/catalogo/brasil-ufs.json: contornos das UFs projetados, para o mapa;
- docs/validacao/casos/catalogo/qualidade-tmyx.csv: todos os indicadores, por estação;
- docs/validacao/casos/catalogo/fontes.json: endereço e SHA-256 de cada arquivo lido.

Os downloads são feitos um de cada vez, com pausa, e ficam na pasta de cache para as próximas
execuções. Nada aqui usa o código da aplicação.
"""

import argparse
import csv
import hashlib
import io
import json
import math
import re
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import pvlib
from shapely.geometry import Point, shape

ROOT = Path(__file__).resolve().parents[2]
BASE = "https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil/"
KML_URL = (
    "https://climate.onebuilding.org/sources/"
    "Region3_South_America_TMYx_EPW_Processing_locations.kml"
)
# Índice dos arquivos futuros (BrazFuture, LabEEE e INPE) no OneBuilding: só para marcar as estações
# que os têm; o link da aplicação vai para o Zenodo (CC BY 4.0), não para esta cópia.
FUTURE_INDEX_URL = (
    "https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil_BrazFuture/index.html"
)
NE_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/"
    "geojson/ne_50m_admin_1_states_provinces.geojson"
)
NE_SHA256 = "69a0e06e640b2d505858ae1cb63034e4677f3000b35a98e16312932b98c426b9"
USER_AGENT = "Mozilla/5.0 (novo SOL-AR, LabEEE/UFSC; catalogo F4.1)"
REFERENCE_YEAR = 2026
DELTA_T = 69.0

# Campos do EPW (coluna, código de ausente, como na spec 04, seção 4.1).
FIELDS = {
    "tbs": (6, 99.9),
    "tpo": (7, 99.9),
    "ur": (8, 999),
    "pressao": (9, 999999),
    "etr": (10, 9999),
    "ghi": (13, 9999),
    "dni": (14, 9999),
    "dhi": (15, 9999),
    "dir": (20, 999),
    "vel": (21, 999),
}

# Projeção do mapa: equiretangular com o fator do paralelo central do Brasil.
LAT0 = -15.0
COS0 = math.cos(math.radians(LAT0))


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str, path: Path, pause: float) -> bytes:
    """Baixa para a cache (uma vez, com até 4 novas tentativas); devolve o conteúdo."""
    if path.exists():
        return path.read_bytes()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            break
        except OSError:
            if attempt == 4:
                raise
            time.sleep(2 ** (attempt + 1))
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    time.sleep(pause)
    return data


def stations_from_kml(text: str) -> list[dict]:
    """Estações do Brasil com TMYx 2011-2025 no KML (URL corrigida da Paraíba)."""
    out = []
    for pm in re.findall(r"<Placemark>(.*?)</Placemark>", text, flags=re.S):
        m = re.search(r"<b>BRA (\w\w) (\S+)\.(\d{6}) TMYx\.2011-2025</b>", pm)
        if not m:
            continue
        url = re.search(r"URL (https://\S+?\.zip)", pm).group(1)
        # A pasta da Paraíba vem com acento no KML (em Latin-1, num arquivo declarado UTF-8) e
        # devolve 404; a pasta no servidor é PB_Paraiba.
        url = re.sub(r"/PB_Para[^/]*ba/", "/PB_Paraiba/", url)
        if not url.isascii():
            sys.exit(f"URL com caracteres fora do ASCII: {url}")
        source = re.search(r"<td>([^<]*#years=\[(\d+)\][^<]*)</td>", pm)
        period = re.search(r"Period of Record=(\d{4})-(\d{4})", source.group(1))
        out.append(
            {
                "uf_arquivo": m.group(1),
                "nome": m.group(2),
                "id": m.group(3),
                "url": url,
                "fonte": "era5" if source.group(1).strip().startswith("ERA5") else "isd",
                "anos": int(source.group(2)),
                "periodo": [int(period.group(1)), int(period.group(2))],
            }
        )
    return out


def read_epw(data: bytes) -> tuple[dict, pd.DataFrame, list[str]]:
    """LOCATION, dados horários e comentários do EPW dentro do zip."""
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        name = next(n for n in z.namelist() if n.lower().endswith(".epw"))
        text = z.read(name).decode("latin-1")
    lines = text.splitlines()
    loc = lines[0].split(",")
    location = {
        "lat": float(loc[6]),
        "lon": float(loc[7]),
        "fuso": float(loc[8]),
        "alt": float(loc[9]),
    }
    comments = [ln for ln in lines[:8] if ln.startswith("COMMENTS")]
    rows = [ln.split(",") for ln in lines[8:] if ln.strip()]
    frame = pd.DataFrame(
        {
            "mes": [int(r[1]) for r in rows],
            "dia": [int(r[2]) for r in rows],
            "hora": [int(r[3]) for r in rows],
            **{k: [float(r[c]) for r in rows] for k, (c, _) in FIELDS.items()},
        }
    )
    for k, (_, missing) in FIELDS.items():
        frame.loc[frame[k] >= missing, k] = np.nan
    return location, frame, comments


def step_of(values: np.ndarray) -> float:
    """Maior passo entre 1, 0,5, 0,1 e 0,01 do qual todos os valores são múltiplos (spec 06)."""
    v = values[~np.isnan(values)]
    for r in (1.0, 0.5, 0.1, 0.01):
        if np.all(np.abs(v / r - np.round(v / r)) < 1e-6):
            return r
    return 0.0


def extraterrestrial_hours(location: dict, df: pd.DataFrame, sub: int = 4) -> np.ndarray:
    """Radiação extraterrestre horizontal integrada na hora que termina em h (Wh/m²), pelo SPA do
    pvlib, com `sub` instantes por hora: a referência do tempo da radiação do arquivo."""
    day = np.where((df["mes"] == 2) & (df["dia"] == 29), 28, df["dia"])
    start = pd.to_datetime({"year": REFERENCE_YEAR, "month": df["mes"], "day": day}) + pd.to_timedelta(
        df["hora"] - 1, unit="h"
    )
    acc = np.zeros(len(df))
    for k in range(sub):
        local = start + pd.to_timedelta((k + 0.5) * 60 / sub, unit="min")
        utc = pd.DatetimeIndex(local - pd.to_timedelta(location["fuso"], unit="h")).tz_localize("UTC")
        sp = pvlib.solarposition.spa_python(
            utc, location["lat"], location["lon"], altitude=location["alt"], delta_t=DELTA_T, how="numpy"
        )
        e0 = pvlib.irradiance.get_extra_radiation(utc).to_numpy()
        acc += np.clip(e0 * np.cos(np.radians(sp["zenith"].to_numpy())), 0, None) / sub
    return acc


def radiation_lag(ghi: np.ndarray, etr: np.ndarray, hours: np.ndarray) -> tuple[float, float]:
    """Atraso (min) do centróide diário da GHI em relação ao da extraterrestre da mesma hora: média
    de todos os dias e dos 30 dias mais claros (sem a assimetria das nuvens). Positivo: a radiação
    do arquivo vem depois do sol. O método recupera deslocamentos conhecidos (0, 30 e 60 min) em
    dados de céu claro (relatório do F4.1)."""
    t = hours.reshape(-1, 24) - 0.5
    g = ghi.reshape(-1, 24)
    e = etr.reshape(-1, 24)
    ok = (np.nansum(g, 1) > 0) & (e.sum(1) > 0)
    cg = np.nansum(g * t, 1)[ok] / np.nansum(g, 1)[ok]
    ce = (e * t).sum(1)[ok] / e.sum(1)[ok]
    lag = (cg - ce) * 60
    kt = np.nansum(g, 1)[ok] / e.sum(1)[ok]
    clear = np.argsort(-kt)[:30]
    return round(float(np.mean(lag)), 1), round(float(np.mean(lag[clear])), 1)


def quality(location: dict, df: pd.DataFrame) -> dict:
    """Indicadores da spec 04, seção 4.3, e o atraso da radiação."""
    n = len(df)
    missing = {k: int(df[k].isna().sum()) for k in FIELDS}
    vel = df["vel"].to_numpy()
    valid = ~np.isnan(vel)
    calm = float(np.mean(vel[valid] == 0) * 100) if valid.any() else float("nan")
    dirs = df["dir"].to_numpy()
    dirs = dirs[~np.isnan(dirs) & (dirs > 0)]
    dir_step = int(np.gcd.reduce(np.round(dirs).astype(int))) if dirs.size else 0

    # Sol no meio da hora (h − 0,5 em hora padrão), ano de referência; 29/2 vira 28/2.
    day = np.where((df["mes"] == 2) & (df["dia"] == 29), 28, df["dia"])
    local = pd.to_datetime(
        {"year": REFERENCE_YEAR, "month": df["mes"], "day": day}
    ) + pd.to_timedelta(df["hora"] - 0.5, unit="h")
    utc = pd.DatetimeIndex(local - pd.to_timedelta(location["fuso"], unit="h")).tz_localize("UTC")
    sp = pvlib.solarposition.spa_python(
        utc,
        location["lat"],
        location["lon"],
        altitude=location["alt"],
        delta_t=DELTA_T,
        how="numpy",
    )
    cosz = np.cos(np.radians(sp["zenith"].to_numpy()))
    ghi, dni, dhi, etr = (df[k].to_numpy() for k in ("ghi", "dni", "dhi", "etr"))
    # Índice de claridade com a extraterrestre da própria hora, pelo pvlib: a do arquivo vem cerca de
    # 30 min adiantada nos TMYx (relatório do F4.1).
    etr_sun = extraterrestrial_hours(location, df)
    kt_high = int(np.sum((etr_sun > 200) & (ghi / np.where(etr_sun > 0, etr_sun, np.nan) > 0.8)))
    kt_file = int(np.sum((etr > 200) & (ghi / np.where(etr > 0, etr, np.nan) > 0.8)))
    lag_all, lag_clear = (
        radiation_lag(ghi, etr_sun, df["hora"].to_numpy()) if n % 24 == 0 else (None, None)
    )
    lag_etr, _ = radiation_lag(etr, etr_sun, df["hora"].to_numpy()) if n % 24 == 0 else (None, None)
    day_hours = (cosz > math.cos(math.radians(85))) & (ghi > 0)
    residual = ghi - (dni * np.clip(cosz, 0, None) + dhi)
    res = np.abs(residual[day_hours & ~np.isnan(residual)])
    tbs = df["tbs"].to_numpy()
    return {
        "horas": n,
        "ausentes": missing,
        "ausentes_total": int(sum(missing.values())),
        "calmaria_pct": round(calm, 1),
        "passo_velocidade": step_of(vel),
        "passo_direcao": dir_step,
        "horas_kt_acima_0_8": kt_high,
        "horas_kt_acima_0_8_etr_do_arquivo": kt_file,
        "atraso_ghi_min": lag_all,
        "atraso_ghi_dias_claros_min": lag_clear,
        "atraso_etr_do_arquivo_min": lag_etr,
        "fechamento_mediana": round(float(np.median(res)), 1) if res.size else None,
        "fechamento_p95": round(float(np.percentile(res, 95)), 1) if res.size else None,
        "ghi_anual": round(float(np.nansum(ghi)) / 1000, 1),
        "dni_anual": round(float(np.nansum(dni)) / 1000, 1),
        "dhi_anual": round(float(np.nansum(dhi)) / 1000, 1),
        "tbs_media": round(float(np.nanmean(tbs)), 1),
        "tbs_min": round(float(np.nanmin(tbs)), 1),
        "tbs_max": round(float(np.nanmax(tbs)), 1),
    }


def uf_polygons(ne: dict) -> list[tuple[str, str, object]]:
    out = []
    for f in ne["features"]:
        p = f["properties"]
        if p.get("adm0_a3") != "BRA":
            continue
        uf = p["postal"]
        out.append((uf, p["name"], shape(f["geometry"])))
    return sorted(out)


def uf_of(polys, lon: float, lat: float) -> tuple[str, bool]:
    """UF que contém o ponto, ou a mais próxima (litoral e ilhas generalizados no 1:50m)."""
    pt = Point(lon, lat)
    for uf, _, geom in polys:
        if geom.contains(pt):
            return uf, True
    return min(polys, key=lambda t: t[2].distance(pt))[0], False


def project(lon: float, lat: float) -> tuple[float, float]:
    """Mapa: x = (λ − λ0) · cos φ0, y = −φ (graus); a aplicação usa a mesma conta."""
    return (lon * COS0, -lat)


def svg_path(geom) -> str:
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    parts = []
    for poly in polys:
        for ring in [poly.exterior, *poly.interiors]:
            pts = [project(x, y) for x, y in ring.coords]
            parts.append(
                "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in pts[:-1]) + "Z"
            )
    return "".join(parts)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--cache", required=True, type=Path)
    ap.add_argument("--limite", type=int, default=0, help="só as N primeiras estações (teste)")
    ap.add_argument("--pausa", type=float, default=0.5, help="segundos entre downloads")
    args = ap.parse_args()
    cache: Path = args.cache

    kml = fetch(KML_URL, cache / "Region3.kml", args.pausa)
    ne_bytes = fetch(NE_URL, cache / "ne_50m_admin_1_v512.geojson", args.pausa)
    if sha256(ne_bytes) != NE_SHA256:
        sys.exit("Natural Earth: SHA-256 diferente do esperado")
    polys = uf_polygons(json.loads(ne_bytes))
    if len(polys) != 27:
        sys.exit(f"Natural Earth: {len(polys)} UFs (esperadas 27)")

    future_index = fetch(FUTURE_INDEX_URL, cache / "BrazFuture_index.html", args.pausa)
    future_ids = set(re.findall(r"\.(\d{6})_RCP", future_index.decode("utf-8", errors="replace")))
    stations = stations_from_kml(kml.decode("utf-8", errors="replace"))
    if args.limite:
        stations = stations[: args.limite]
    print(f"{len(stations)} estações TMYx 2011-2025 no KML", file=sys.stderr)

    sources = {
        "kml": {"url": KML_URL, "sha256": sha256(kml)},
        "brazfuture_index": {"url": FUTURE_INDEX_URL, "sha256": sha256(future_index)},
        "natural_earth": {"url": NE_URL, "sha256": NE_SHA256},
        "tmyx": {},
    }
    rows = []
    for i, s in enumerate(stations, 1):
        rel = s["url"].removeprefix(BASE)
        data = fetch(s["url"], cache / "tmyx" / Path(rel).name, args.pausa)
        sources["tmyx"][s["id"]] = sha256(data)
        location, df, comments = read_epw(data)
        q = quality(location, df)
        uf, inside = uf_of(polys, location["lon"], location["lat"])
        rows.append(
            {
                **s,
                **location,
                "uf": uf,
                "uf_no_poligono": inside,
                "url": rel,
                "futuro": s["id"] in future_ids,
                **q,
            }
        )
        print(f"{i:3d}/{len(stations)} {s['id']} {s['nome']}", file=sys.stderr)

    rows.sort(key=lambda r: (r["uf"], r["nome"]))
    write_outputs(rows, polys, sources)


def write_outputs(rows: list[dict], polys, sources: dict) -> None:
    app = [
        {
            "id": r["id"],
            "nome": r["nome"],
            "uf": r["uf"],
            **({"ufArquivo": r["uf_arquivo"]} if r["uf_arquivo"] != r["uf"] else {}),
            "lat": r["lat"],
            "lon": r["lon"],
            "alt": r["alt"],
            "fuso": r["fuso"],
            "periodo": r["periodo"],
            "anos": r["anos"],
            "fonte": r["fonte"],
            **({"futuro": True} if r["futuro"] else {}),
            "url": r["url"],
            "q": {
                "horas": r["horas"],
                "ausentes": r["ausentes_total"],
                "calmaria": r["calmaria_pct"],
                "kt": r["horas_kt_acima_0_8"],
                "atraso": r["atraso_ghi_dias_claros_min"],
                "fechamento": r["fechamento_p95"],
                "ghi": r["ghi_anual"],
                "dni": r["dni_anual"],
                "dhi": r["dhi_anual"],
                "tbs": [r["tbs_min"], r["tbs_media"], r["tbs_max"]],
            },
        }
        for r in rows
    ]
    out = ROOT / "src/ui/data/catalogo"
    out.mkdir(parents=True, exist_ok=True)
    (out / "tmyx-brasil.json").write_text(
        json.dumps({"base": BASE, "estacoes": app}, ensure_ascii=False, separators=(",", ":"))
        + "\n",
        encoding="utf-8",
    )
    xs, ys = [], []
    ufs = []
    for uf, name, geom in polys:
        minx, miny, maxx, maxy = geom.bounds
        for x, y in (project(minx, miny), project(maxx, maxy)):
            xs.append(x)
            ys.append(y)
        ufs.append({"uf": uf, "nome": name, "d": svg_path(geom)})
    view = [min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)]
    (out / "brasil-ufs.json").write_text(
        json.dumps(
            {
                "fonte": "Natural Earth 1:50m, v5.1.2 (domínio público)",
                "projecao": {"lat0": LAT0},
                "viewBox": [round(v, 2) for v in view],
                "ufs": ufs,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        )
        + "\n",
        encoding="utf-8",
    )
    cases = ROOT / "docs/validacao/casos/catalogo"
    cases.mkdir(parents=True, exist_ok=True)
    cols = [
        "id", "nome", "uf", "uf_arquivo", "uf_no_poligono", "lat", "lon", "alt", "fuso",
        "fonte", "futuro", "anos", "periodo", "horas", "ausentes_total", "calmaria_pct",
        "passo_velocidade", "passo_direcao", "horas_kt_acima_0_8",
        "horas_kt_acima_0_8_etr_do_arquivo", "atraso_ghi_min", "atraso_ghi_dias_claros_min",
        "atraso_etr_do_arquivo_min", "fechamento_mediana",
        "fechamento_p95", "ghi_anual", "dni_anual", "dhi_anual", "tbs_media", "tbs_min",
        "tbs_max", "url",
    ]
    with open(cases / "qualidade-tmyx.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for r in rows:
            w.writerow(
                [f"{r['periodo'][0]}-{r['periodo'][1]}" if c == "periodo" else r[c] for c in cols]
            )
    (cases / "fontes.json").write_text(
        json.dumps(sources, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()

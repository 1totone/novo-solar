"""Referência independente para a máscara pela geometria (F3.2).

Uso: python3 docs/validacao/scripts/mascara_geometria.py
Saída: docs/validacao/casos/mascara/geometria.json
Dependências: requirements.txt (numpy, shapely).

Cenas no referencial da fachada (spec 07, seção 7.1): janela no plano y = 0, x de 0 a W, z de 0
(peitoril) a H; y é a normal externa. As placas finas são montadas aqui, a partir dos parâmetros de
cada dispositivo, pela tabela da seção 7.1 (sem usar o código da aplicação). Para cada direção do
sol (altura h e ângulo azimutal relativo ψ), duas referências:

- shapely (GEOS): cada placa é projetada no plano do vidro na direção do sol; o percentual
  sombreado é a área da união das sombras dentro da janela dividida pela área da janela;
- traçado de raios (numpy, sem projeção): grade de 400 × 400 células da janela, com um ponto
  sorteado dentro de cada célula; um ponto está à sombra se o raio que sai dele na direção do sol
  atravessa alguma placa (interseção com o plano da placa e teste de ponto dentro do polígono).
  Também dá a sombra de pontos isolados (centro da janela e um ponto fora do centro), para a
  máscara de um ponto.

As cenas do F2.3 vêm de mascara_tracado_raios.py, com os mesmos parâmetros (a "grelha com γ" tem a
mesma geometria da grelha e não se repete); as outras cobrem lâminas, recuo, placa livre e
combinações. Prolongamento infinito: null no JSON, 10⁶ m nas placas.
"""

import json
import math
import random
import sys
from pathlib import Path

import numpy as np
from shapely import box, intersection, unary_union
from shapely.geometry import Polygon

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mascara_tracado_raios as f23  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "mascara" / "geometria.json"
INFINITO = 1e6
GRADE_RAIOS = 400
N_ALEATORIAS = 250
N_RAIOS = 20
DIRECOES_FIXAS = [(45.0, 0.0), (60.0, 30.0), (10.0, -70.0), (80.0, 85.0)]


def ext(v):
    return INFINITO if v is None else float(v)


def recuo(W, H, d):
    """Verga, peitoril e ombreiras de uma janela recuada d atrás do plano da fachada."""
    if d <= 0:
        return []
    return [
        [(0, 0, H), (W, 0, H), (W, d, H), (0, d, H)],
        [(0, 0, 0), (W, 0, 0), (W, d, 0), (0, d, 0)],
        [(0, 0, 0), (0, d, 0), (0, d, H), (0, 0, H)],
        [(W, 0, 0), (W, d, 0), (W, d, H), (W, 0, H)],
    ]


def placas_do_dispositivo(W, H, d, p):
    kind = p["kind"]
    if kind == "overhang":
        z = H + p["above"]
        y0 = d + p.get("gap", 0.0)
        y1 = y0 + p["depth"]
        x0, x1 = -ext(p.get("extendLeft", 0.0)), W + ext(p.get("extendRight", 0.0))
        return [[(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)]]
    if kind == "fin":
        off = p.get("offset", 0.0)
        x = W + off if p["side"] == "right" else -off
        y0 = d + p.get("gap", 0.0)
        y1 = y0 + p["depth"]
        z0, z1 = -ext(p.get("extendBelow", 0.0)), H + ext(p.get("extendAbove", 0.0))
        return [[(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]]
    if kind == "horizontalLouvers":
        t = math.radians(p.get("angle", 0.0))
        c = p["chord"]
        x0, x1 = -ext(p.get("extendLeft", 0.0)), W + ext(p.get("extendRight", 0.0))
        y_in = d + p.get("gap", 0.0)
        y_out = y_in + c * math.cos(t)
        out = []
        for k in range(p["count"]):
            z_in = H + p["above"] - k * p["pitch"]
            z_out = z_in - c * math.sin(t)
            out.append([(x0, y_in, z_in), (x1, y_in, z_in), (x1, y_out, z_out), (x0, y_out, z_out)])
        return out
    if kind == "verticalLouvers":
        t = math.radians(p.get("angle", 0.0))
        c = p["chord"]
        z0, z1 = -ext(p.get("extendBelow", 0.0)), H + ext(p.get("extendAbove", 0.0))
        y_in = d + p.get("gap", 0.0)
        y_out = y_in + c * math.cos(t)
        out = []
        for k in range(p["count"]):
            x_in = p["start"] + k * p["pitch"]
            x_out = x_in + c * math.sin(t)
            out.append([(x_in, y_in, z0), (x_out, y_out, z0), (x_out, y_out, z1), (x_in, y_in, z1)])
        return out
    if kind == "plate":
        return [[tuple(float(c) for c in v) for v in p["vertices"]]]
    raise ValueError(kind)


def placas(cena):
    j = cena["janela"]
    W, H, d = j["width"], j["height"], j.get("setback", 0.0)
    out = recuo(W, H, d)
    for p in cena["dispositivos"]:
        out += placas_do_dispositivo(W, H, d, p)
    return [[tuple(float(c) for c in v) for v in pl] for pl in out]


def sol(h, psi):
    """Direção do sol no referencial da fachada (spec 01, seção 1.2)."""
    hr, pr = math.radians(h), math.radians(psi)
    return (math.cos(hr) * math.sin(pr), math.cos(hr) * math.cos(pr), math.sin(hr))


def fracao_shapely(W, H, pls, s):
    """Percentual sombreado: área da união das sombras na janela / área da janela."""
    sx, sy, sz = s
    janela = box(0.0, 0.0, W, H)
    # Recorte prévio por uma caixa folgada: tira as coordenadas de 10⁶ m da união.
    folga = box(-1.0, -1.0, W + 1.0, H + 1.0)
    sombras = []
    for pl in pls:
        poly = Polygon([(x - y * sx / sy, z - y * sz / sy) for (x, y, z) in pl])
        if poly.area <= 0:
            continue
        g = intersection(poly, folga)
        if not g.is_empty and g.area > 0:
            sombras.append(g)
    if not sombras:
        return 0.0
    return intersection(unary_union(sombras), janela).area / (W * H)


def normal_newell(V):
    n = np.zeros(3)
    for i in range(len(V)):
        a, b = V[i], V[(i + 1) % len(V)]
        n += np.array([(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])])
    return n


def sombra_raios(pls, s, Q):
    """Para cada ponto Q (n × 3, no plano y = 0), o raio Q + t·s (t > 0) atravessa alguma placa?"""
    s = np.asarray(s, float)
    shaded = np.zeros(len(Q), bool)
    for pl in pls:
        V = np.asarray(pl, float)
        n = normal_newell(V)
        denom = n @ s
        if abs(denom) < 1e-14 * np.linalg.norm(n):
            continue  # raio paralelo à placa
        t = ((V[0] - Q) @ n) / denom
        P = Q + t[:, None] * s
        inside = t > 0
        for i in range(len(V)):
            a, b = V[i], V[(i + 1) % len(V)]
            inside &= (np.cross(b - a, P - a) @ n) >= 0
        shaded |= inside
    return shaded


def fracao_raios(W, H, pls, s, seed=0):
    """Fração de pontos à sombra: um ponto sorteado dentro de cada célula da grade (amostragem
    estratificada), para que bordas de sombra paralelas às linhas da grade não somem erros."""
    rng = np.random.default_rng(seed)
    n = GRADE_RAIOS
    i, j = np.meshgrid(np.arange(n), np.arange(n))
    X = (i.ravel() + rng.random(n * n)) / n * W
    Z = (j.ravel() + rng.random(n * n)) / n * H
    Q = np.stack([X, np.zeros(n * n), Z], axis=1)
    return float(sombra_raios(pls, s, Q).mean())


def cenas_f23():
    """As cenas do F2.3 nos parâmetros da spec 07 (z_topo do F2.3 vira prolongamento acima da verga)."""
    out = []
    for c in f23.CASES:
        if c.get("gama_digitado"):
            continue  # mesma geometria da grelha
        W, H = c["W"], c["Hw"]
        inf = lambda v: None if v >= f23.INF / 2 else v  # noqa: E731
        dev = []
        b = c.get("brise")
        if b:
            dev.append({"kind": "overhang", "depth": b["D"], "above": b["e"], "gap": b["g"],
                        "extendLeft": inf(b["P_esq"]), "extendRight": inf(b["P_dir"])})
        for side, key in (("right", "aleta_dir"), ("left", "aleta_esq")):
            a = c.get(key)
            if a:
                top = a["z_topo"]
                dev.append({"kind": "fin", "side": side, "depth": a["D"], "offset": a["s"], "gap": a["g"],
                            "extendAbove": None if top >= f23.INF / 2 else round(top - H, 12),
                            "extendBelow": None})
        out.append({"id": c["id"], "origem": "F2.3", "janela": {"width": W, "height": H, "setback": 0.0},
                    "dispositivos": dev})
    return out


CENAS_NOVAS = [
    {"id": "brise-infinito-afastado", "janela": {"width": 1.0, "height": 1.5, "setback": 0.0},
     "dispositivos": [{"kind": "overhang", "depth": 0.6, "above": 0.2, "gap": 0.15,
                       "extendLeft": None, "extendRight": None}]},
    {"id": "laminas-horizontais", "janela": {"width": 1.2, "height": 1.5, "setback": 0.0},
     "dispositivos": [{"kind": "horizontalLouvers", "count": 5, "chord": 0.25, "pitch": 0.3, "angle": 30.0,
                       "gap": 0.05, "above": 0.0, "extendLeft": 0.2, "extendRight": 0.2}]},
    {"id": "laminas-horizontais-infinitas", "janela": {"width": 1.0, "height": 1.4, "setback": 0.0},
     "dispositivos": [{"kind": "horizontalLouvers", "count": 4, "chord": 0.3, "pitch": 0.35, "angle": -20.0,
                       "gap": 0.0, "above": 0.1, "extendLeft": None, "extendRight": None}]},
    {"id": "laminas-verticais", "janela": {"width": 1.5, "height": 1.2, "setback": 0.0},
     "dispositivos": [{"kind": "verticalLouvers", "count": 4, "chord": 0.3, "pitch": 0.4, "angle": 25.0,
                       "gap": 0.1, "start": 0.0, "extendAbove": 0.3, "extendBelow": 0.3}]},
    {"id": "recuo", "janela": {"width": 1.0, "height": 1.4, "setback": 0.25}, "dispositivos": []},
    {"id": "recuo-com-grelha", "janela": {"width": 1.2, "height": 1.2, "setback": 0.2},
     "dispositivos": [
         {"kind": "overhang", "depth": 0.5, "above": 0.0, "gap": 0.0, "extendLeft": 0.3, "extendRight": 0.3},
         {"kind": "fin", "side": "right", "depth": 0.5, "offset": 0.3, "gap": 0.0, "extendAbove": 0.0,
          "extendBelow": 0.2},
         {"kind": "fin", "side": "left", "depth": 0.5, "offset": 0.3, "gap": 0.0, "extendAbove": 0.0,
          "extendBelow": 0.2}]},
    {"id": "placa-livre-e-brise", "janela": {"width": 1.5, "height": 1.2, "setback": 0.0},
     "dispositivos": [
         {"kind": "plate", "vertices": [[0.2, 0.1, 1.8], [1.4, 0.5, 1.6], [0.5, 0.9, 1.3]]},
         {"kind": "overhang", "depth": 0.4, "above": 0.05, "gap": 0.3, "extendLeft": 0.0, "extendRight": 0.5}]},
]


def main() -> None:
    rnd = random.Random(20261025)
    cenas = cenas_f23() + [dict(c, origem="F3.2") for c in CENAS_NOVAS]
    saida = []
    max_raios = 0.0
    for cena in cenas:
        j = cena["janela"]
        W, H = j["width"], j["height"]
        pls = placas(cena)
        pontos = [(W / 2, H / 2), (0.25 * W, 0.3 * H)]
        Qp = np.array([[x, 0.0, z] for x, z in pontos])
        direcoes = list(DIRECOES_FIXAS) + [
            (round(rnd.uniform(0.2, 89.8), 6), round(rnd.uniform(-89.8, 89.8), 6)) for _ in range(N_ALEATORIAS)
        ]
        amostras, raios = [], []
        for i, (h, psi) in enumerate(direcoes):
            s = sol(h, psi)
            f = fracao_shapely(W, H, pls, s)
            sp = sombra_raios(pls, s, Qp)
            amostras.append([h, psi, round(f, 12), int(sp[0]), int(sp[1])])
            if i < N_RAIOS:
                fr = fracao_raios(W, H, pls, s, seed=i)
                raios.append([h, psi, round(f, 12), round(fr, 9)])
                max_raios = max(max_raios, abs(f - fr))
        saida.append({
            "id": cena["id"],
            "origem": cena["origem"],
            "janela": j,
            "dispositivos": cena["dispositivos"],
            "placas": [[list(v) for v in pl] for pl in pls],
            "pontos": [list(p) for p in pontos],
            "amostras": amostras,
            "tracado_raios": raios,
        })
        n_tot = sum(a[2] >= 1 - 1e-9 for a in amostras)
        n_zero = sum(a[2] <= 1e-9 for a in amostras)
        print(f"{cena['id']}: {len(pls)} placas; {n_tot} direções com 100%, {n_zero} com 0%, de {len(amostras)}")
    print(f"maior diferença entre shapely e o traçado de raios ({GRADE_RAIOS} × {GRADE_RAIOS}): {max_raios:.5f}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "gerado_por": "docs/validacao/scripts/mascara_geometria.py",
        "infinito_m": INFINITO,
        "grade_tracado_raios": GRADE_RAIOS,
        "colunas_amostras": ["altura", "psi", "fracao_sombreada", "ponto1_sombra", "ponto2_sombra"],
        "colunas_tracado_raios": ["altura", "psi", "fracao_shapely", "fracao_raios"],
        "dif_max_shapely_raios": round(max_raios, 6),
        "cenas": saida,
    }, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

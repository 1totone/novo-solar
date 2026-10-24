"""Referência independente para a máscara pelos ângulos (F2.3): traçado de raios.

Uso: python3 docs/validacao/scripts/mascara_tracado_raios.py
Saída: docs/validacao/casos/mascara/tracado-raios.json

Geometria no referencial da fachada (spec 01, seção 1.2): janela no plano y = 0, x de 0 a W
(x para a direita de quem olha para fora), z de 0 (peitoril) a Hw; y é a normal externa.
- Brise horizontal: placa em z = Hw + e, y de g a g + D (g = afastamento da parede),
  x de −P_esq a W + P_dir.
- Aleta direita: placa em x = W + s, y de g_a a g_a + D_a, z de −∞ até z_topo.
  Aleta esquerda: x = −s, simétrica.

Para cada direção do sol (altura h, ângulo azimutal relativo ψ), cada ponto da janela recebe
sol se o raio que sai dele na direção do sol não atravessa nenhuma placa. Calcula-se:
- "total": todos os pontos de uma grade 41 × 41 da janela (inclui cantos e arestas) à sombra;
- "centro": o centro da janela à sombra (critério de 50%);
- "fracao": fração sombreada da grade.

Os ângulos (referência externa) de cada caso são derivados da geometria pelos pontos de
referência da spec: 100%: α1 da base à aresta externa do brise; α2 da verga (topo) à aresta
interna; γ do canto inferior do mesmo lado à ponta do brise; β1 da aresta oposta à aresta externa
da aleta; β2 da aresta do mesmo lado à aresta interna; γ das aletas do canto superior oposto ao
topo da aleta. 50%: todos a partir do centro da janela.
Na grelha (brise e aletas encostados, mesma profundidade) os limites γ não se aplicam.
Nada aqui usa as fórmulas de máscara da aplicação: só interseção de raios com placas.
"""

import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "mascara" / "tracado-raios.json"
INF = 1e9
GRID = 41


def deg(x):
    return math.degrees(x)


def hits(p, s, case):
    """O raio que sai do ponto p = (x0, z0) na direção s = (sx, sy, sz) atravessa alguma placa?"""
    x0, z0 = p
    sx, sy, sz = s
    W = case["W"]
    b = case.get("brise")
    if b and sz > 0:
        t = (case["Hw"] + b["e"] - z0) / sz
        y = t * sy
        x = x0 + t * sx
        if b["g"] <= y <= b["g"] + b["D"] and -b["P_esq"] <= x <= W + b["P_dir"]:
            return True
    for side in ("aleta_dir", "aleta_esq"):
        a = case.get(side)
        if not a:
            continue
        xf = W + a["s"] if side == "aleta_dir" else -a["s"]
        if (side == "aleta_dir" and sx > 0) or (side == "aleta_esq" and sx < 0):
            t = (xf - x0) / sx
            y = t * sy
            z = z0 + t * sz
            if a["g"] <= y <= a["g"] + a["D"] and z <= a["z_topo"]:
                return True
    return False


def angles(case, ref_point):
    """Ângulos externos (graus) a partir dos pontos de referência; ref_point: '100' ou '50'.

    Grelha ("fechado"): brise e aletas encostados; as junções fecham as frestas laterais e os
    limites γ (pontas do brise e topo das aletas) não se aplicam. "gama_digitado" simula o erro
    de digitar os γ numa grelha fechada, como se as pontas fossem livres.
    """
    W, Hw = case["W"], case["Hw"]
    free_ends = not case.get("fechado") or bool(case.get("gama_digitado"))
    out = {}
    b = case.get("brise")
    if b:
        zp = Hw + b["e"]
        if ref_point == "100":
            # α1 da base à aresta externa; α2 da verga à aresta interna; γ do canto inferior do
            # mesmo lado à ponta do brise.
            out["alpha"] = [deg(math.atan2(zp, b["g"] + b["D"]))]
            if b["g"] > 0:
                out["alpha"].append(deg(math.atan2(b["e"], b["g"])))
            lever_r = lever_l = zp
            reach_r, reach_l = b["P_dir"], b["P_esq"]
        else:
            zc = zp - Hw / 2
            out["alpha"] = [deg(math.atan2(zc, b["g"] + b["D"]))]
            if b["g"] > 0:
                out["alpha"].append(deg(math.atan2(zc, b["g"])))
            lever_r = lever_l = zc
            reach_r, reach_l = W / 2 + b["P_dir"], W / 2 + b["P_esq"]
        if free_ends and b["P_dir"] < INF / 2:
            out["gammaRight"] = [deg(math.atan2(lever_r, reach_r))]
        if free_ends and b["P_esq"] < INF / 2:
            out["gammaLeft"] = [deg(math.atan2(lever_l, reach_l))]
    for side, key, top in (("aleta_dir", "betaRight", "finTopRight"), ("aleta_esq", "betaLeft", "finTopLeft")):
        a = case.get(side)
        if not a:
            continue
        if ref_point == "100":
            # β1 da aresta oposta à aresta externa; β2 da aresta do mesmo lado à aresta interna;
            # γ das aletas do canto superior oposto ao topo da aleta.
            far = W + a["s"]
            out[key] = [deg(math.atan2(far, a["g"] + a["D"]))]
            if a["g"] > 0:
                out[key].append(deg(math.atan2(a["s"], a["g"])))
            if free_ends and a["z_topo"] < INF / 2:
                out[top] = [deg(math.atan2(a["z_topo"] - Hw, far))]
        else:
            dist = W / 2 + a["s"]
            out[key] = [deg(math.atan2(dist, a["g"] + a["D"]))]
            if a["g"] > 0:
                out[key].append(deg(math.atan2(dist, a["g"])))
            if free_ends and a["z_topo"] < INF / 2:
                out[top] = [deg(math.atan2(a["z_topo"] - Hw / 2, dist))]
    return out


CASES = [
    {"id": "brise-infinito", "orientacao": 0, "W": 1.5, "Hw": 1.2,
     "brise": {"e": 0.1, "g": 0.0, "D": 0.8, "P_esq": INF, "P_dir": INF}},
    {"id": "brise-finito", "orientacao": 30, "W": 1.5, "Hw": 1.2,
     "brise": {"e": 0.2, "g": 0.0, "D": 0.9, "P_esq": 0.6, "P_dir": 0.3}},
    {"id": "brise-afastado", "orientacao": -30, "W": 1.2, "Hw": 1.0,
     "brise": {"e": 0.6, "g": 0.28, "D": 1.0, "P_esq": 0.8, "P_dir": 0.5}},
    {"id": "aleta-direita-infinita", "orientacao": 90, "W": 1.0, "Hw": 1.4,
     "aleta_dir": {"s": 0.0, "g": 0.0, "D": 0.6, "z_topo": INF}},
    {"id": "aleta-esquerda-finita-afastada", "orientacao": 200, "W": 1.0, "Hw": 1.2,
     "aleta_esq": {"s": 0.15, "g": 0.1, "D": 1.5, "z_topo": 2.6}},
    {"id": "duas-aletas", "orientacao": 135, "W": 1.6, "Hw": 1.2,
     "aleta_dir": {"s": 0.1, "g": 0.0, "D": 0.5, "z_topo": 2.0},
     "aleta_esq": {"s": 0.0, "g": 0.0, "D": 0.9, "z_topo": INF}},
    # Grelha (brise misto): brise e aletas encostados, mesma profundidade. As junções fecham as
    # frestas, então os limites γ não se aplicam: só α1 e β1 de cada lado.
    {"id": "grelha", "orientacao": 330, "W": 1.4, "Hw": 1.2, "fechado": True,
     "brise": {"e": 0.15, "g": 0.0, "D": 0.7, "P_esq": 0.4, "P_dir": 0.4},
     "aleta_dir": {"s": 0.4, "g": 0.0, "D": 0.7, "z_topo": 1.35},
     "aleta_esq": {"s": 0.4, "g": 0.0, "D": 0.7, "z_topo": 1.35}},
    # A mesma grelha com os γ digitados como se as pontas fossem livres: máscara conservadora.
    {"id": "grelha-com-gama", "orientacao": 330, "W": 1.4, "Hw": 1.2, "fechado": True,
     "gama_digitado": True,
     "brise": {"e": 0.15, "g": 0.0, "D": 0.7, "P_esq": 0.4, "P_dir": 0.4},
     "aleta_dir": {"s": 0.4, "g": 0.0, "D": 0.7, "z_topo": 1.35},
     "aleta_esq": {"s": 0.4, "g": 0.0, "D": 0.7, "z_topo": 1.35}},
    # Brise e aletas separados (as aletas não chegam ao brise): cada peça tem pontas livres.
    {"id": "combinado-aberto", "orientacao": 60, "W": 1.2, "Hw": 1.4,
     "brise": {"e": 0.25, "g": 0.0, "D": 0.6, "P_esq": 0.1, "P_dir": 0.1},
     "aleta_dir": {"s": 0.2, "g": 0.0, "D": 0.5, "z_topo": 1.5},
     "aleta_esq": {"s": 0.2, "g": 0.0, "D": 0.5, "z_topo": 1.5}},
]


def union_is_exact(case):
    """A sombra total do conjunto é a união das sombras totais de cada peça?

    Sim com uma peça só ou só aletas (para cada direção do sol, só a aleta daquele lado atua) e na
    grelha fechada. Com brise e aletas de pontas livres, partes diferentes da janela podem ser
    sombreadas por peças diferentes, e a união fica menor que a sombra total real.
    """
    if case.get("gama_digitado"):
        return False
    fins = [k for k in ("aleta_dir", "aleta_esq") if k in case]
    return "brise" not in case or not fins or bool(case.get("fechado"))


def sample(case, h, psi):
    W, Hw = case["W"], case["Hw"]
    s = (math.cos(math.radians(h)) * math.sin(math.radians(psi)),
         math.cos(math.radians(h)) * math.cos(math.radians(psi)),
         math.sin(math.radians(h)))
    shaded = 0
    for i in range(GRID):
        for j in range(GRID):
            if hits((W * i / (GRID - 1), Hw * j / (GRID - 1)), s, case):
                shaded += 1
    return {
        "total": shaded == GRID * GRID,
        "centro": hits((W / 2, Hw / 2), s, case),
        "fracao": shaded / (GRID * GRID),
    }


def main() -> None:
    rnd = random.Random(20261024)
    out = []
    for c in CASES:
        samples = []
        for _ in range(1500):
            h = rnd.uniform(0.2, 89.8)
            psi = rnd.uniform(-89.8, 89.8)
            r = sample(c, h, psi)
            az = (c["orientacao"] + psi) % 360
            samples.append([round(h, 6), round(az, 6), int(r["total"]), int(r["centro"]), round(r["fracao"], 6)])
        out.append({
            "id": c["id"],
            "orientacao": c["orientacao"],
            "referencia": "externa",
            "total": angles(c, "100"),
            "parcial": angles(c, "50"),
            "dispositivos": [k for k in ("brise", "aleta_dir", "aleta_esq") if k in c],
            "uniao_exata": union_is_exact(c),
            "amostras": samples,
        })
        n_tot = sum(s[2] for s in samples)
        n_cen = sum(s[3] for s in samples)
        print(f"{c['id']}: {n_tot} totais, {n_cen} com o centro à sombra, de {len(samples)}")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "gerado_por": "docs/validacao/scripts/mascara_tracado_raios.py",
        "grade_janela": GRID,
        "colunas_amostras": ["altura", "azimute", "total", "centro", "fracao"],
        "casos": out,
    }, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

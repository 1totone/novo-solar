"""Curvas do transferidor como o SOL-AR 6.2 as desenha, para a regressão do F2.2.

Uso: python3 docs/validacao/scripts/transferidor_solar62.py
Saída: docs/validacao/casos/transferidor/solar62.csv

Reimplementação, em coordenadas da carta, do código de desenho do `ProjSolar.exe` 6.2.0.81
(relatório: docs/validacao/relatorios/F2.2-transferidor.md):

- orientação: θ = 180° − orientação (plotarClick, 0x403573); γ usa θ + 90° (0x408f5b);
- referência (rgAngulos: 0 = Interna, 1 = Externa): na interna o ângulo vira 90° − valor
  (α: 0x407298; β: 0x407b86; γ: 0x408fce); na externa entra direto;
- índices 1 e 2: o 6.2 ordena os dois valores e desenha as duas curvas; sem o índice 2,
  a segunda "curva" é 90° (externo), que não é desenhada (α, γ) ou é a linha da fachada (β);
- α (0x4071d0): círculo de raio R/cos(a) com centro em (cx − d·sen θ, cy − d·cos θ),
  d = R·tan(a), só se a < 89°;
- β direita (0x407b2c): reta do centro até (cx − R·sen φ, cy − R·cos φ), φ = −(orientação + b);
  β esquerda (0x40808d): φ = b − orientação; b é o valor externo;
- γ direita (0x408f48): círculo como o de α com θ' + 180°; γ esquerda (0x4093b9): com θ'.

A tela do 6.2 tem x para a direita e y para baixo, com o Norte para cima (posição do sol em
0x40bab5: x = cx − r·sen(−A), y = cy − r·cos(A)). Aqui tudo é convertido para coordenadas
(Leste, Norte) com raio 1.
"""

import csv
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "transferidor" / "solar62.csv"
RAD = math.pi / 180


def screen_circle(theta_deg, a_ext):
    """Centro (Leste, Norte) e raio do círculo desenhado pelo 6.2, carta de raio 1."""
    d = math.tan(a_ext * RAD)
    rho = 1 / math.cos(a_ext * RAD)
    # tela: (cx − d·sen θ, cy − d·cos θ); y da tela cresce para o Sul
    return -d * math.sin(theta_deg * RAD), d * math.cos(theta_deg * RAD), rho


def ray_azimuth(phi_deg):
    """Azimute (Norte, horário) da reta do centro até (cx − sen φ, cy − cos φ) na tela."""
    e, n = -math.sin(phi_deg * RAD), math.cos(phi_deg * RAD)
    return math.degrees(math.atan2(e, n)) % 360


def ordered(v1, v2, internal):
    """Valores externos (menor primeiro) como o 6.2 os ordena; v2 None = sem índice 2."""
    ext = (lambda v: 90 - v) if internal else (lambda v: v)
    if v2 is None:
        return [ext(v1), 90.0]
    a, b = ext(v1), ext(v2)
    return sorted([a, b])


def curves(case):
    o, internal = case["orientacao"], case["referencia"] == "interna"
    out = []
    theta = 180 - o
    if case.get("alfa1") is not None:
        for k, a in enumerate(ordered(case["alfa1"], case.get("alfa2"), internal)):
            if a < 89:
                e, n, r = screen_circle(theta, a)
                out.append(("alfa", "", k + 1, a, e, n, r, ""))
    for side in ("direita", "esquerda"):
        v1 = case.get(f"beta_{side}1")
        if v1 is None:
            continue
        for k, b in enumerate(ordered(v1, case.get(f"beta_{side}2"), internal)):
            phi = -(o + b) if side == "direita" else b - o
            out.append(("beta", side, k + 1, b, "", "", "", ray_azimuth(phi)))
    theta_g = theta + 90
    for side in ("direita", "esquerda"):
        v1 = case.get(f"gama_{side}1")
        if v1 is None:
            continue
        for k, g in enumerate(ordered(v1, case.get(f"gama_{side}2"), internal)):
            if g < 89:
                t = theta_g + 180 if side == "direita" else theta_g
                e, n, r = screen_circle(t, g)
                out.append(("gama", side, k + 1, g, e, n, r, ""))
    return out


CASES = [
    {"id": "norte-interna", "orientacao": 0, "referencia": "interna", "alfa1": 45, "beta_direita1": 30, "beta_esquerda1": 60, "gama_direita1": 20, "gama_esquerda1": 50},
    {"id": "nne-interna-indices2", "orientacao": 30, "referencia": "interna", "alfa1": 40, "alfa2": 15, "beta_direita1": 20, "beta_direita2": 50, "beta_esquerda1": 35, "beta_esquerda2": 10, "gama_direita1": 30, "gama_direita2": 60, "gama_esquerda1": 25, "gama_esquerda2": 45},
    {"id": "leste-externa", "orientacao": 90, "referencia": "externa", "alfa1": 55, "beta_direita1": 40, "beta_esquerda1": 75, "gama_direita1": 35, "gama_esquerda1": 65},
    {"id": "sudeste-externa-indices2", "orientacao": 135, "referencia": "externa", "alfa1": 70, "alfa2": 30, "beta_direita1": 45, "beta_direita2": 15, "beta_esquerda1": 20, "beta_esquerda2": 55, "gama_direita1": 50, "gama_direita2": 10, "gama_esquerda1": 40, "gama_esquerda2": 80},
    {"id": "sso-interna", "orientacao": 200, "referencia": "interna", "alfa1": 25, "beta_direita1": 65, "beta_esquerda1": 5, "gama_direita1": 75, "gama_esquerda1": 15},
    {"id": "noroeste-interna", "orientacao": 330, "referencia": "interna", "alfa1": 60, "alfa2": 75, "beta_direita1": 10, "beta_esquerda1": 80, "gama_direita1": 45, "gama_esquerda1": 5},
    {"id": "orientacao-negativa", "orientacao": -30, "referencia": "externa", "alfa1": 35, "beta_direita1": 50, "beta_esquerda1": 25, "gama_direita1": 20, "gama_esquerda1": 60},
    {"id": "oeste-externa", "orientacao": 270, "referencia": "externa", "alfa1": 10, "alfa2": 85, "beta_direita1": 88, "beta_esquerda1": 1, "gama_direita1": 85, "gama_esquerda1": 1},
]


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["caso", "orientacao", "referencia", "curva", "lado", "indice", "angulo_externo", "centro_leste", "centro_norte", "raio", "azimute_reta"])
        n = 0
        for c in CASES:
            for kind, side, idx, ext, e, nn, r, az in curves(c):
                fmt = lambda x: "" if x == "" else f"{x:.12f}"
                w.writerow([c["id"], c["orientacao"], c["referencia"], kind, side, idx, f"{ext:.6f}", fmt(e), fmt(nn), fmt(r), fmt(az)])
                n += 1
    print(f"{n} curvas em {OUT}")


if __name__ == "__main__":
    main()

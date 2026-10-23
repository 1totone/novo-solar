"""Gera as figuras SVG das definições de alfa, beta e gama (docs/spec/01-convencoes-geometricas.md).

Uso: python3 docs/spec/figuras/gerar_figuras.py
Cada figura tem dois painéis: referência interna (ângulo medido a partir do plano da fachada ou
da aresta da janela) e referência externa (ângulo medido a partir da horizontal ou da normal),
como no seletor "Ângulo de Referência" do SOL-AR 6.2.
"""

import math
from pathlib import Path

OUT = Path(__file__).resolve().parent
INK = "#1b1f24"
WALL = "#57606a"
ACC = "#b5651d"
SUN = "#d9a400"
STYLE = (
    f"<style>text{{font-family:system-ui,Arial,sans-serif;font-size:12px;fill:{INK}}}"
    f".t{{font-size:13px;font-weight:600}}.g{{font-size:16px;font-style:italic;fill:{ACC}}}"
    f".n{{font-size:11px;fill:#57606a}}</style>"
)


def arc(cx, cy, r, a0, a1):
    """Arco de a0 até a1 (graus, eixo y para baixo, sentido do SVG), com preenchimento em leque."""
    x0, y0 = cx + r * math.cos(math.radians(a0)), cy + r * math.sin(math.radians(a0))
    x1, y1 = cx + r * math.cos(math.radians(a1)), cy + r * math.sin(math.radians(a1))
    sweep = 1 if a1 > a0 else 0
    large = 1 if abs(a1 - a0) > 180 else 0
    return (
        f'<path d="M{cx:.1f},{cy:.1f} L{x0:.1f},{y0:.1f} A{r},{r} 0 {large} {sweep} {x1:.1f},{y1:.1f} Z" '
        f'fill="{ACC}" fill-opacity="0.25" stroke="{ACC}" stroke-width="1.5"/>'
    )


def ray(x0, y0, x1, y1, ext=1.6):
    """Raio de (x0,y0) passando por (x1,y1), prolongado até o sol."""
    xs, ys = x0 + (x1 - x0) * ext, y0 + (y1 - y0) * ext
    return (
        f'<line x1="{x0}" y1="{y0}" x2="{xs:.1f}" y2="{ys:.1f}" stroke="{INK}" stroke-dasharray="4 3"/>'
        f'<circle cx="{xs:.1f}" cy="{ys:.1f}" r="6" fill="{SUN}"/>'
    )


def deg(dx, dy):
    return math.degrees(math.atan2(dy, dx))


def svg(w, h, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
        f'role="img" aria-label="{title}"><title>{title}</title>{STYLE}'
        f'<rect width="{w}" height="{h}" fill="#fff"/>{body}</svg>\n'
    )


def alfa():
    parts = []
    for k, ref in enumerate(("interna", "externa")):
        ox = k * 300
        B = (ox + 70, 190)  # base da abertura (peitoril)
        T = (ox + 180, 70)  # extremidade do brise
        p = [f'<text class="t" x="{ox + 20}" y="22">Referência {ref}</text>']
        p.append(f'<line x1="{ox + 70}" y1="40" x2="{ox + 70}" y2="230" stroke="{WALL}" stroke-width="6"/>')
        p.append(f'<line x1="{ox + 70}" y1="80" x2="{ox + 70}" y2="190" stroke="#fff" stroke-width="4"/>')
        p.append(f'<line x1="{ox + 67}" y1="70" x2="{T[0]}" y2="70" stroke="{INK}" stroke-width="6"/>')
        p.append(ray(*B, *T, ext=1.45))
        a_line = deg(T[0] - B[0], T[1] - B[1])
        if ref == "interna":
            p.append(arc(*B, 40, -90, a_line))
            p.append(f'<text class="g" x="{B[0] + 8}" y="{B[1] - 48}">α</text>')
        else:
            p.append(f'<line x1="{B[0]}" y1="{B[1]}" x2="{B[0] + 120}" y2="{B[1]}" stroke="{INK}" stroke-width="1"/>')
            p.append(arc(*B, 40, 0, a_line))
            p.append(f'<text class="g" x="{B[0] + 46}" y="{B[1] - 10}">α</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="250">interior</text>')
        p.append(f'<text class="n" x="{ox + 200}" y="250">exterior</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="268">corte vertical, perpendicular à fachada</text>')
        parts += p
    return svg(600, 280, "".join(parts), "Ângulo alfa: referência interna e externa")


def beta():
    parts = []
    for k, ref in enumerate(("interna", "externa")):
        ox = k * 300
        L = (ox + 70, 200)  # aresta oposta da abertura
        F = (ox + 180, 90)  # extremidade da aleta
        p = [f'<text class="t" x="{ox + 20}" y="22">Referência {ref}</text>']
        p.append(f'<line x1="{ox + 20}" y1="200" x2="{ox + 280}" y2="200" stroke="{WALL}" stroke-width="6"/>')
        p.append(f'<line x1="{ox + 70}" y1="200" x2="{ox + 180}" y2="200" stroke="#fff" stroke-width="4"/>')
        p.append(f'<line x1="{ox + 70}" y1="200" x2="{ox + 180}" y2="200" stroke="{WALL}" stroke-width="1"/>')
        p.append(f'<line x1="{F[0]}" y1="203" x2="{F[0]}" y2="{F[1]}" stroke="{INK}" stroke-width="6"/>')
        p.append(ray(*L, *F, ext=1.5))
        a_line = deg(F[0] - L[0], F[1] - L[1])
        if ref == "interna":
            p.append(arc(*L, 40, 0, a_line))
            p.append(f'<text class="g" x="{L[0] + 46}" y="{L[1] - 10}">β</text>')
        else:
            p.append(f'<line x1="{L[0]}" y1="{L[1]}" x2="{L[0]}" y2="{L[1] - 120}" stroke="{INK}" stroke-width="1"/>')
            p.append(arc(*L, 40, -90, a_line))
            p.append(f'<text class="g" x="{L[0] + 8}" y="{L[1] - 48}">β</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="40">exterior</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="225">interior</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="250">planta; aleta à direita de quem olha para fora</text>')
        parts += p
    return svg(600, 262, "".join(parts), "Ângulo beta: referência interna e externa")


def gama():
    parts = []
    for k, ref in enumerate(("interna", "externa")):
        ox = k * 300
        x0, x1, ytop, ybot = ox + 90, ox + 210, 100, 200
        p = [f'<text class="t" x="{ox + 20}" y="22">Referência {ref}</text>']
        p.append(f'<rect x="{x0}" y="{ytop}" width="{x1 - x0}" height="{ybot - ytop}" fill="#eef3f8" stroke="{WALL}"/>')
        p.append(f'<line x1="{ox + 40}" y1="88" x2="{ox + 260}" y2="88" stroke="{INK}" stroke-width="6"/>')
        for C, E, side in (((x1, ybot), (ox + 260, 88), 1), ((x0, ybot), (ox + 40, 88), -1)):
            p.append(ray(*C, *E, ext=1.25))
            a_line = deg(E[0] - C[0], E[1] - C[1])
            if ref == "interna":
                p.append(arc(*C, 34, -90, a_line))
                tx = C[0] + (6 if side > 0 else -16)
                p.append(f'<text class="g" x="{tx}" y="{C[1] - 40}">γ</text>')
            else:
                p.append(f'<line x1="{C[0]}" y1="{C[1]}" x2="{C[0] + side * 60}" y2="{C[1]}" stroke="{INK}" stroke-width="1"/>')
                a0 = 0 if side > 0 else 180
                p.append(arc(*C, 34, a0, a_line if side > 0 else (a_line + 360) % 360))
                tx = C[0] + (40 if side > 0 else -52)
                p.append(f'<text class="g" x="{tx}" y="{C[1] - 8}">γ</text>')
        p.append(f'<text class="n" x="{ox + 236}" y="230">direita</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="230">esquerda</text>')
        p.append(f'<text class="n" x="{ox + 20}" y="250">vista de dentro para fora (plano da fachada)</text>')
        parts += p
    return svg(600, 262, "".join(parts), "Ângulo gama: referência interna e externa")


if __name__ == "__main__":
    for name, fn in (("alfa", alfa), ("beta", beta), ("gama", gama)):
        (OUT / f"{name}.svg").write_text(fn(), encoding="utf-8")
        print(f"{name}.svg")

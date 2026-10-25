"""Caso da literatura do F2.3: Figura 27 do tutorial do SOL-AR da UFU (Bortoli e Saramago).

Uso:
  python3 docs/validacao/scripts/tutorial_ufu_figura27.py caminho/tutorial-analysis-sol-ar.pdf
Saída: docs/validacao/casos/mascara/tutorial-ufu-figura27.json

O tutorial (22 páginas, 2013) está em
https://labeee.ufsc.br/sites/default/files/softwares/tutorial-analysis-sol-ar.pdf e não é versionado
neste repositório (direitos dos autores): baixe-o e passe o caminho. O script confere o SHA-256 do
arquivo, extrai a Figura 27 da p. 15 com o `pdfimages` (poppler-utils) e grava só a classe da cor de
uma amostra de pixels da carta, como direções do céu:

- "total": vermelho puro (zona de eficiência total pintada no SOL-AR 6.2);
- "parcial": amarelo puro (zona de eficiência parcial);
- "fora": branco.

Pixels de linhas (cinza, preto, azul) e de texto ficam de fora. A carta é registrada pelo círculo do
horizonte, ajustado por mínimos quadrados (método de Kasa) aos pixels cinza do contorno; Norte para
cima e Leste à direita, como na tela do 6.2. Coordenadas da carta de raio 1: x para Leste, y para
Norte (as de src/core/chart/stereographic.ts).

Parâmetros da figura (lidos nela): Brasília, latitude −15,86°, transferidor (orientação) 30°,
referência interna, α1 = 55°, α2 = 20°, γ direita = 50°, γ esquerda = 60°.
"""

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "mascara" / "tutorial-ufu-figura27.json"
URL = "https://labeee.ufsc.br/sites/default/files/softwares/tutorial-analysis-sol-ar.pdf"
SHA256 = "db4c6b8c1bce318adb08a8066051f6db7f72a5131fc4ddcc293016abc78ccc33"
PAGE = 15
SIZE = (463, 468)  # largura e altura da imagem da Figura 27 no PDF
STEP = 4  # um pixel a cada 4, nas duas direções
MAX_RADIUS = 0.985  # longe do contorno do horizonte


def figure_27(pdf: Path) -> np.ndarray:
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(
            ["pdfimages", "-png", "-f", str(PAGE), "-l", str(PAGE), str(pdf), f"{tmp}/img"],
            check=True,
        )
        found = [p for p in sorted(Path(tmp).glob("img-*.png")) if Image.open(p).size == SIZE]
        if len(found) != 1:
            sys.exit(f"esperava uma imagem de {SIZE[0]} × {SIZE[1]} px na p. {PAGE}")
        return np.asarray(Image.open(found[0]).convert("RGB")).astype(int)


def fit_circle(points: np.ndarray) -> tuple[float, float, float]:
    a = np.c_[2 * points[:, 0], 2 * points[:, 1], np.ones(len(points))]
    b = (points**2).sum(1)
    cx, cy, c = np.linalg.lstsq(a, b, rcond=None)[0]
    return cx, cy, float(np.sqrt(c + cx**2 + cy**2))


def horizon(im: np.ndarray) -> tuple[float, float, float, float]:
    """Centro (x, y), raio e resíduo rms (px) do círculo do horizonte."""
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    grey = (abs(r - g) < 8) & (abs(g - b) < 8) & (r > 100) & (r < 170)
    ys, xs = np.nonzero(grey)
    pts = np.c_[xs + 0.5, ys + 0.5]
    h, w = im.shape[:2]
    # Primeiro palpite: o pixel cinza mais distante do centro da imagem em cada grau.
    d = np.hypot(pts[:, 0] - w / 2, pts[:, 1] - h / 2)
    ang = np.round(np.degrees(np.arctan2(pts[:, 1] - h / 2, pts[:, 0] - w / 2))).astype(int)
    far = {}
    for k, (a, dist) in enumerate(zip(ang, d)):
        if dist > 120 and (a not in far or dist > d[far[a]]):
            far[a] = k
    cand = pts[list(far.values())]
    for _ in range(5):
        cx, cy, radius = fit_circle(cand)
        res = np.hypot(cand[:, 0] - cx, cand[:, 1] - cy) - radius
        cand = cand[abs(res) < 2]
    # Refinamento com todos os pixels cinza a menos de 1,5 px do círculo.
    for _ in range(3):
        res = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - radius
        cx, cy, radius = fit_circle(pts[abs(res) < 1.5])
    res = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - radius
    near = abs(res) < 1.5
    return cx, cy, radius, float(np.sqrt((res[near] ** 2).mean()))


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    pdf = Path(sys.argv[1])
    digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
    if digest != SHA256:
        sys.exit(f"SHA-256 diferente do esperado: {digest}")
    im = figure_27(pdf)
    cx, cy, radius, rms = horizon(im)
    points = []
    h, w = im.shape[:2]
    for py in range(0, h, STEP):
        for px in range(0, w, STEP):
            x = (px + 0.5 - cx) / radius
            y = (cy - (py + 0.5)) / radius
            if x * x + y * y > MAX_RADIUS**2:
                continue
            r, g, b = (int(v) for v in im[py, px])
            if (r, g, b) == (255, 0, 0):
                cls = "total"
            elif (r, g, b) == (255, 255, 0):
                cls = "parcial"
            elif min(r, g, b) > 245:
                cls = "fora"
            else:
                continue
            points.append([round(x, 5), round(y, 5), cls])
    out = {
        "descricao": (
            "Classe da cor de pixels da Figura 27 do tutorial do SOL-AR da UFU (Bortoli e "
            "Saramago, p. 15), como direções da carta de raio 1 (x Leste, y Norte). Gerado por "
            "docs/validacao/scripts/tutorial_ufu_figura27.py a partir do PDF, que não é versionado."
        ),
        "fonte": URL,
        "sha256_pdf": SHA256,
        "pagina": PAGE,
        "parametros": {
            "latitude": -15.86,
            "orientacao": 30,
            "referencia": "internal",
            "alfa": [55, 20],
            "gamaDireita": [50],
            "gamaEsquerda": [60],
        },
        "registro": {
            "centro_px": [round(cx, 3), round(cy, 3)],
            "raio_px": round(radius, 3),
            "residuo_rms_px": round(rms, 3),
            "passo_px": STEP,
        },
        "pontos": points,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    counts = {c: sum(1 for p in points if p[2] == c) for c in ("total", "parcial", "fora")}
    print(f"círculo: centro ({cx:.2f}, {cy:.2f}) px, raio {radius:.2f} px, rms {rms:.2f} px")
    print(f"{len(points)} pontos: {counts} → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

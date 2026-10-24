"""Figura do F2.8: o que o SOL-AR 6.2 deve desenhar com o arquivo de teste teste-hora.csv.

Uso: python3 docs/validacao/scripts/figura_teste_hora.py
Saída: docs/validacao/relatorios/figuras/F2.8-teste-hora-6.2.png
Dependências: requirements.txt (pillow).

No arquivo de teste (formato "Incluir Nova Cidade", Florianópolis), a temperatura de cada hora é o
número da hora (1 a 24 °C). A figura aplica o modelo do 6.2 (modelo_solar62.py): pontos a cada
0,1 h de hora legal nos dias 1 a 171 ("até 21 de junho"), hora solar com meridiano de 45° O e
equação do tempo constante, valor interpolado a partir da linha floor(t) + 1 e as cores e faixas
do 6.2. Serve para comparar com a captura da tela do 6.2 rodando o mesmo arquivo.
"""

import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import modelo_solar62 as m62  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "relatorios" / "figuras" / "F2.8-teste-hora-6.2.png"
LATITUDE = -27.67
LONGITUDE_OESTE = 48.55
# Cores das faixas de temperatura do 6.2 (TColor em 0x40a98a a 0x40aad2, convertidas para RGB).
CORES = [(0, 0, 128), (0, 0, 255), (0, 192, 255), (255, 204, 0), (207, 0, 0)]
SIZE, R = 640, 290


def azimute_graus(latitude, n, t_solar, altura):
    phi = math.radians(latitude)
    delta = math.radians(m62.declinacao_graus(n))
    omega = math.radians((t_solar - 12.0) * 15.0)
    alt = math.radians(altura)
    # Azimute a partir do Norte, sentido horário.
    y = -math.cos(delta) * math.sin(omega)
    x = (math.sin(delta) - math.sin(alt) * math.sin(phi)) / max(math.cos(phi), 1e-9)
    return math.degrees(math.atan2(y, x)) % 360


def main():
    img = Image.new("RGB", (SIZE, SIZE), "white")
    draw = ImageDraw.Draw(img)
    c = SIZE / 2
    linhas = [[str(m), str(d), str(h), str(h)] for m, n in enumerate(m62.DIAS_MES, start=1) for d in range(1, n + 1) for h in range(1, 25)]
    for n in m62.DIAS_SEMESTRE[1]:
        for t in m62.tempos_do_dia():
            ts = m62.hora_solar(t, LONGITUDE_OESTE)
            alt = m62.altura_solar_graus(LATITUDE, n, ts)
            if alt <= 0:
                continue
            v = m62.valor(linhas, 3, n, t)
            cor = CORES[m62.faixa(v, m62.FAIXAS["tbs"])]
            az = math.radians(azimute_graus(LATITUDE, n, ts, alt))
            r = R * math.tan(math.radians(90 - alt) / 2)
            x, y = c + r * math.sin(az), c - r * math.cos(az)
            draw.rectangle([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=cor)
    draw.ellipse([c - R, c - R, c + R, c + R], outline="black", width=2)
    for texto, ang in (("N", 0), ("L", 90), ("S", 180), ("O", 270)):
        a = math.radians(ang)
        draw.text((c + (R + 14) * math.sin(a) - 4, c - (R + 14) * math.cos(a) - 6), texto, fill="black")
    # Linhas horárias solares (como as do 6.2), para ler a hora dos limites de cor.
    for hs in m62.HORAS_CARTA + (12.0,):
        pts = []
        for n in range(1, 366, 2):
            alt = m62.altura_solar_graus(LATITUDE, n, hs)
            if alt <= 0:
                continue
            az = math.radians(azimute_graus(LATITUDE, n, hs, alt))
            r = R * math.tan(math.radians(90 - alt) / 2)
            pts.append((c + r * math.sin(az), c - r * math.cos(az)))
        if len(pts) > 1:
            draw.line(pts, fill=(90, 90, 90), width=1)
            draw.text((pts[0][0] - 6, pts[0][1] + 4), f"{int(hs)}", fill=(60, 60, 60))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT)
    print(OUT)


if __name__ == "__main__":
    main()

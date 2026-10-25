"""Brise afastado da Figura 26 do tutorial do SOL-AR da UFU, por traçado de raios (F2.3).

Uso: python3 docs/validacao/scripts/tutorial_ufu_fresta.py
Dependências: requirements.txt (pvlib, numpy, pandas).

Geometria lida nas Figuras 22 e 26 (cotas em cm; a parede não é cotada, e a escala do desenho dá
15 cm): janela de 200 × 100 cm com o vidro na face interna de uma parede de 15 cm; brise de 100 cm
de profundidade na altura da verga, afastado 28 cm da face externa da parede, com prolongamentos de
120 cm à direita e 170 cm à esquerda (os da Figura 22, γ direita 50° e γ esquerda 60°). Referencial
da fachada (spec 01, seção 1.2): x à direita de quem olha para fora, y na normal externa, z para
cima; vidro em y = 0. A verga e as ombreiras da parede entram como placas (de y = 0 a y = 0,15).

Posições do sol: Brasília (latitude −15,863°, longitude −47,913°, 1060 m), fachada a 30°, das 9 h às
15 h de 15 em 15 min em hora solar verdadeira (ângulo horário pela equação do tempo do pvlib), nas
12 datas da tabela do relatório do F2.3. Para cada posição diante da fachada, um raio sai de cada
ponto de uma grade de 41 × 41 da janela e é testado contra as placas. A grade vai até 1 µm das
bordas: um ponto exatamente na verga ou na ombreira está no plano da placa (t = 0) e nunca seria
bloqueado, embora os pontos logo abaixo sejam. Nada aqui usa o código da aplicação.
"""

import math

import numpy as np
import pandas as pd
import pvlib

LAT, LON, ELEV = -15.863, -47.913, 1060.4
ORIENTACAO = 30.0
DELTA_T = 69.0
GRID = 41
BORDA = 1e-6
W, H = 2.0, 1.0
PAREDE, FRESTA, D = 0.15, 0.28, 1.0
P_DIR, P_ESQ = 1.2, 1.7
DATAS = [(1, 21), (2, 21), (3, 20), (4, 21), (5, 21), (6, 21), (7, 21), (8, 21), (9, 22), (10, 21),
         (11, 21), (12, 21)]
HORAS = 9 + np.arange(25) / 4


def placas():
    """Retângulos alinhados aos eixos: (eixo constante, valor, limites dos outros dois eixos)."""
    y0 = PAREDE + FRESTA
    return [
        ("z", H, (0.0, W), (0.0, PAREDE)),  # verga da parede: x, y
        ("x", 0.0, (0.0, PAREDE), (0.0, H)),  # ombreira esquerda: y, z
        ("x", W, (0.0, PAREDE), (0.0, H)),  # ombreira direita: y, z
        ("z", H, (-P_ESQ, W + P_DIR), (y0, y0 + D)),  # brise: x, y
    ]


def sombra(x0, z0, s):
    sx, sy, sz = s
    for eixo, valor, a, b in placas():
        if eixo == "z":
            if sz <= 0:
                continue
            t = (valor - z0) / sz
            x, y = x0 + t * sx, t * sy
            if t > 0 and a[0] <= x <= a[1] and b[0] <= y <= b[1]:
                return True
        else:
            if sx == 0 or (valor - x0) / sx <= 0:
                continue
            t = (valor - x0) / sx
            y, z = t * sy, z0 + t * sz
            if a[0] <= y <= a[1] and b[0] <= z <= b[1]:
                return True
    return False


def instantes_hora_solar(mes, dia):
    d = pd.Timestamp(2026, mes, dia)
    ut = HORAS - LON / 15
    for _ in range(4):
        t = pd.DatetimeIndex(d + pd.to_timedelta(ut, unit="h")).tz_localize("UTC")
        eot = pvlib.solarposition.spa_python(t, LAT, LON, altitude=ELEV, delta_t=DELTA_T,
                                             how="numpy")["equation_of_time"].to_numpy()
        ut = HORAS - LON / 15 - eot / 60
    t = pd.DatetimeIndex(d + pd.to_timedelta(ut, unit="h")).tz_localize("UTC")
    return pvlib.solarposition.spa_python(t, LAT, LON, altitude=ELEV, delta_t=DELTA_T, how="numpy")


def main() -> None:
    xs = np.linspace(BORDA, W - BORDA, GRID)
    zs = np.linspace(BORDA, H - BORDA, GRID)
    print("Data   | diante da fachada | sombra total | fração ensolarada média | máxima")
    tot = {"posicoes": 0, "total": 0}
    for mes, dia in DATAS:
        sp = instantes_hora_solar(mes, dia)
        n = total = 0
        fracoes = []
        for el, az in zip(sp["elevation"].to_numpy(), sp["azimuth"].to_numpy()):
            psi = math.radians((az - ORIENTACAO + 180) % 360 - 180)
            h = math.radians(el)
            s = (math.cos(h) * math.sin(psi), math.cos(h) * math.cos(psi), math.sin(h))
            if s[1] < 1e-5 or s[2] < 1e-5:
                continue
            n += 1
            lit = sum(not sombra(x, z, s) for x in xs for z in zs) / (GRID * GRID)
            fracoes.append(lit)
            total += lit == 0
        tot["posicoes"] += n
        tot["total"] += total
        media = f"{100 * np.mean(fracoes):5.1f}%" if fracoes else "    -"
        maxima = f"{100 * max(fracoes):5.1f}%" if fracoes else "    -"
        print(f"{dia:02d}/{mes:02d}  | {n:17d} | {total:12d} | {media:>23} | {maxima}")
    print(f"total: {tot['total']} de {tot['posicoes']} posições com sombra total")


if __name__ == "__main__":
    main()

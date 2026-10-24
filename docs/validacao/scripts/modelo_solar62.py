"""Modelo de cálculo do Analysis SOL-AR 6.2 (ProjSolar.exe 6.2.0.81), reconstruído por desmontagem.

Usado pela regressão do F2.8 (regressao_solar62.py). Cada item indica a rotina de origem no
executável (endereços da imagem carregada em 0x400000); a desmontagem foi feita com capstone a
partir do instalador oficial (docs/validacao/casos/solar-6.2/README.md). Só biblioteca padrão.

Carta (plotarClick, 0x4021b0)
- Trajetórias: 7 declinações fixas, em radianos (tabela em 0x49154c).
- Linhas horárias: horas solares 6 a 18, sem 12 (tabela em 0x491584); o meio-dia é o meridiano.

Sobreposição de dados (pontosClick, 0x409fd0: temperatura em 0x40a030, global em 0x40aeac, direta
normal em 0x40bd28)
- Dias do semestre: 1 a 171 ("até 21 de junho") ou 172 a 365 ("após 21 de junho"); laço em n com
  n de 1 (ou 172) até menor que 172 (ou 366).
- Declinação de Cooper com 0,986 (0x40a383): δ = 23,45·sen(0,986·(284 + n)).
- Equação do tempo de Spencer com B fixo em 0 (0x40a3bf: o ângulo B recebe 0 antes do cálculo):
  E = 229,2·(0,000075 + 0,001868 − 0,014615) = −2,904 min em todos os dias.
- Hora solar = t + [4·(45 − L) + E]/60, com L = longitude oeste positiva do Latitudes.csv e t a
  hora legal (0x40a505); meridiano fixo em 45° O.
- Para cada dia, t vai de 0 a 23 h em passos de 0,1 h (231 pontos; t = 12 vira 12,01).
- Valor no instante t: linha 24·(n − 1) + floor(t) do CSV (a da hora floor(t) + 1) e interpolação
  linear até a linha seguinte, com a fração t − floor(t) (0x40a6be a 0x40a94d). Campo vazio vale 0.
- Faixas: temperatura 10, 14, 20 e 25 °C; radiação 250, 500, 850 e 1000 Wh/m²; um valor igual ao
  limite fica na faixa de baixo (comparações "maior que").

Rosa dos ventos para cidade incluída (btIncluirClick, 0x416d60)
- Estações a partir de datas e horas de início (padrão: primavera 22/09 18 h, verão 21/12 14 h,
  outono 20/03 8 h, inverno 21/06 2 h); cada estação vai da linha do seu início até a linha
  anterior ao início da seguinte, dando a volta no fim do ano.
- Frequência de cada direção: horas com velocidade > 0 na direção, sobre todas as horas da estação.
- Direções (0x41a9e0 a 0x41a9fc): Norte = acima de 337,5° ou de 0° (exclusive) até 12,5°;
  Nordeste de 12,5° a 67,5°; os demais setores de 45° (limite superior incluído). Direção 0 com
  vento fica fora de todos os setores.
- Velocidade de cada direção: média das horas com vento na direção.
- Calmaria (velocidade = 0) por período do dia: horas 1 a 6, 7 a 12, 13 a 18 e 19 a 24.
- Saída com 2 casas decimais (FloatToStrF, ffFixed, 2).

As rosas que acompanham o 6.2 (.ventos.csv) não vêm desse algoritmo: têm 1 casa decimal nas
frequências e velocidades inteiras. Com setores de 45° centrados no Norte e estações começando à
0 h de 23/09, 22/12, 21/03 e 22/06, as frequências e calmarias ficam a no máximo 0,5 ponto
percentual delas (relatório do F2.8).
"""

import math

# --- Carta ---------------------------------------------------------------------------------
DECLINACOES_CARTA_RAD = (-0.41, -0.35, -0.18, 0.0, 0.18, 0.35, 0.41)
HORAS_CARTA = (6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0)

# --- Sobreposição --------------------------------------------------------------------------
DIAS_SEMESTRE = {1: range(1, 172), 2: range(172, 366)}
EQUACAO_TEMPO_MIN = 229.2 * (0.000075 + 0.001868 * math.cos(0.0) - 0.032077 * math.sin(0.0)
                             - 0.014615 * math.cos(0.0) - 0.04089 * math.sin(0.0))
FAIXAS = {"tbs": (10.0, 14.0, 20.0, 25.0), "ghi": (250.0, 500.0, 850.0, 1000.0), "dni": (250.0, 500.0, 850.0, 1000.0)}
COLUNA = {"tbs": 3, "ghi": 15, "dni": 17}  # a partir de 0


def declinacao_graus(n):
    """Declinação (graus) do dia n (1 a 365), fórmula de Cooper com 0,986."""
    return 23.45 * math.sin(math.radians(0.986 * (284 + n)))


def tempos_do_dia():
    """Horas legais amostradas em cada dia: 0 a 23 h, passo de 0,1 h, com 12 h trocada por 12,01 h."""
    out = []
    t = 0.0
    for i in range(231):
        if i == 120:
            t += 0.01
        if i == 121:
            t -= 0.01
        out.append(t)
        t += 0.1
    return out


def hora_solar(t_legal, longitude_oeste):
    """Hora solar do 6.2: meridiano fixo em 45° O e equação do tempo constante."""
    return t_legal + (4.0 * (45.0 - longitude_oeste) + EQUACAO_TEMPO_MIN) / 60.0


def altura_solar_graus(latitude, n, t_solar):
    phi = math.radians(latitude)
    delta = math.radians(declinacao_graus(n))
    omega = math.radians((t_solar - 12.0) * 15.0)
    return math.degrees(math.asin(math.sin(phi) * math.sin(delta) + math.cos(phi) * math.cos(delta) * math.cos(omega)))


def linha_e_fracao(n, t_legal):
    """Índice (a partir de 0) da linha do CSV usada no instante t e a fração da interpolação."""
    return int(24 * (n - 1) + t_legal), t_legal - math.floor(t_legal)


def valor(linhas, coluna, n, t_legal):
    """Valor desenhado no instante t: interpolação linear entre a linha floor(t) + 1 e a seguinte."""
    i, f = linha_e_fracao(n, t_legal)

    def campo(k):
        texto = linhas[k][coluna].strip()
        return float(texto) if texto else 0.0

    v0 = campo(i)
    if f != 0 and i + 1 < len(linhas):
        v0 += f * (campo(i + 1) - v0)
    return v0


def faixa(v, limites):
    """Índice da faixa (0 a 4): valor igual ao limite fica na faixa de baixo."""
    k = 0
    while k < len(limites) and v > limites[k]:
        k += 1
    return k


# --- Rosa dos ventos ------------------------------------------------------------------------
INICIO_ESTACOES_INCLUIR = ((9, 22, 18), (12, 21, 14), (3, 20, 8), (6, 21, 2))  # primavera a inverno
INICIO_ESTACOES_ARQUIVOS = ((9, 23, 1), (12, 22, 1), (3, 21, 1), (6, 22, 1))  # melhor ajuste aos .ventos.csv
DIAS_MES = (31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31)


def indice_linha(mes, dia, hora):
    return (sum(DIAS_MES[: mes - 1]) + dia - 1) * 24 + hora - 1


def estacao_de_cada_hora(inicios):
    """Estação (0 primavera, 1 verão, 2 outono, 3 inverno) de cada uma das 8760 horas."""
    marcos = sorted((indice_linha(*s), k) for k, s in enumerate(inicios))
    est = []
    for i in range(8760):
        atual = marcos[-1][1]
        for m, k in marcos:
            if m <= i:
                atual = k
        est.append(atual)
    return est


def setor_incluir(direcao):
    """Setor (0 = N) do algoritmo de inclusão de cidade, com o limite N/NE em 12,5°; None se fora."""
    if direcao > 337.5 or 0 < direcao <= 12.5:
        return 0
    limites = (12.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5)
    for k in range(1, 8):
        if limites[k - 1] < direcao <= limites[k]:
            return k
    return None


def setor_45(direcao):
    """Setor (0 = N) de 45° centrado no Norte."""
    return int(((direcao + 22.5) % 360) // 45)


def rosa(linhas, inicios, setor):
    """Matriz 20 x 4 no formato do .ventos.csv: frequências (%), velocidades médias e calmarias (%)."""
    est = estacao_de_cada_hora(inicios)
    cont = [[0.0] * 4 for _ in range(20)]
    den = [[0.0] * 4 for _ in range(20)]
    total = [0] * 4
    for i, r in enumerate(linhas):
        s = est[i]
        v = float(r[11])
        d = float(r[12])
        h = int(r[2])
        total[s] += 1
        if v > 0:
            k = setor(d)
            if k is not None:
                cont[k][s] += 1
                cont[8 + k][s] += v
                den[8 + k][s] += 1
        p = 0 if h <= 6 else 1 if h <= 12 else 2 if h <= 18 else 3
        den[16 + p][s] += 1
        if v == 0:
            cont[16 + p][s] += 1
    out = [[0.0] * 4 for _ in range(20)]
    for s in range(4):
        for k in range(8):
            out[k][s] = 100.0 * cont[k][s] / total[s]
            out[8 + k][s] = cont[8 + k][s] / den[8 + k][s] if den[8 + k][s] else 0.0
        for p in range(4):
            out[16 + p][s] = 100.0 * cont[16 + p][s] / den[16 + p][s]
    return out

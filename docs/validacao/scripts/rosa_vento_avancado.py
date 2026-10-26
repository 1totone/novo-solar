"""Referência independente do vento avançado (F4.4): rosa dos ventos filtrada pela condição térmica
das horas e com a velocidade corrigida para a altura e o terreno.

Uso: python3 -I docs/validacao/scripts/rosa_vento_avancado.py
Entrada: EPWs de Florianópolis, Porto Alegre e Belém em .cache/epw/ (baixar_epw.py).
Saída: docs/validacao/casos/vento/rosas-avancadas.json
Dependências: requirements.txt (numpy e pythermalcomfort, pela classificação de classificacao_horas.py).

Definições (spec 06, seções 6.3 e 6.7; spec 08):
- rosa: as do F2.5 (rosa_dos_ventos.py), com a velocidade de cada hora multiplicada pelo fator
  k = (δ_met / z_met)^α_met · (z / δ)^α (z_met = 10 m, α_met = 0,14, δ_met = 270 m; α e δ do
  terreno, tabela 3.4 da Engineering Reference do EnergyPlus), antes da calmaria e das classes;
- condição térmica: a classe da própria linha do arquivo (vento no instante h, temperatura da hora
  (h − 1, h] pela média do início e do fim), pelo limiar de 20 °C (quente acima, fria abaixo,
  empate neutro) ou pela faixa adaptativa da ASHRAE 55 (80%, média exponencial, α = 0,8, 30 dias);
  horas sem classe ficam fora dos filtros quente, fria e neutra.
Nada aqui usa o código da aplicação.
"""

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import classificacao_horas as ch  # noqa: E402
import rosa_dos_ventos as rv  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "vento" / "rosas-avancadas.json"
ESTACAO = {"z_met": 10.0, "alfa_met": 0.14, "delta_met": 270.0}
TERRENOS = {"campo": (0.14, 270.0), "suburbio": (0.22, 370.0), "cidade": (0.33, 460.0), "agua": (0.10, 210.0)}
CORRECOES = [None, ("cidade", 3.0), ("suburbio", 6.0), ("agua", 20.0), ("campo", 1.5)]
FILTROS = [None, "q", "f", "n"]
LIMITES = [0.5, 2.0, 4.0, 6.0]


def fator(terreno, z):
    alfa, delta = TERRENOS[terreno]
    return (ESTACAO["delta_met"] / ESTACAO["z_met"]) ** ESTACAO["alfa_met"] * (z / delta) ** alfa


def classes(caminho, metodo):
    tbs = ch.ler_tbs(caminho)
    t = ch.temperatura_hora(tbs, "mean")
    if metodo == "limiar-20":
        low = np.full_like(t, 20.0)
        up = np.full_like(t, 20.0)
    else:
        running = {"averaging": "exponential", "alpha": 0.8, "days": 30}
        diarias = ch.medias_diarias(tbs)
        tpma = ch.media_predominante(diarias, running)
        _, low_d, up_d = ch.limites_adaptativos(tpma, 80)
        low = np.repeat(low_d, 24)
        up = np.repeat(up_d, 24)
    texto, _ = ch.classificar(t, low, up)
    return texto


def rosa(linhas, cls, n, k, filtro, meses):
    sel = [i for i, r in enumerate(linhas)
           if (meses is None or r[0] in meses) and (filtro is None or cls[i] == filtro)]
    validas = [i for i in sel if linhas[i][3] != 999 and linhas[i][4] != 999]
    total = len(validas)
    freq = [[0] * 4 for _ in range(n)]
    soma = [0.0] * n
    cont = [0] * n
    calma = 0
    perto = float("inf")
    for i in validas:
        direcao, v = linhas[i][3], linhas[i][4] * k
        if k != 1.0 and v != 0:
            perto = min([perto] + [abs(v - b) for b in LIMITES])
        if v < 0.5:
            calma += 1
            continue
        s = rv.sector(direcao, n)
        c = 3 if v >= 6.0 else 2 if v >= 4.0 else 1 if v >= 2.0 else 0
        freq[s][c] += 1
        soma[s] += v
        cont[s] += 1
    pct = lambda x: round(100.0 * x / total, 9) if total else 0.0
    return {
        "horas": len(sel),
        "validas": total,
        "calmaria": pct(calma),
        "frequencia": [[pct(x) for x in row] for row in freq],
        "velocidade_media": [round(soma[s] / cont[s], 9) if cont[s] else None for s in range(n)],
        "menor_distancia_a_limite": None if perto == float("inf") else perto,
    }


def main():
    saida = {
        "gerado_por": "docs/validacao/scripts/rosa_vento_avancado.py",
        "estacao": ESTACAO,
        "terrenos": {k: {"alfa": a, "delta": d} for k, (a, d) in TERRENOS.items()},
        "fatores": {f"{t}-{z:g}": fator(t, z) for t, z in [c for c in CORRECOES if c]},
        "casos": {},
    }
    for local, arquivo in rv.FILES.items():
        caminho = rv.CACHE / arquivo
        linhas = rv.read(caminho)
        caso = {"arquivo": arquivo, "rosas": []}
        for metodo in ("limiar-20", "adaptativa-80"):
            cls = classes(caminho, metodo)
            caso[f"contagem_{metodo}"] = {c: cls.count(c) for c in "qfns"}
            for correcao in CORRECOES:
                k = 1.0 if correcao is None else fator(*correcao)
                for filtro in FILTROS:
                    if metodo == "adaptativa-80" and filtro is None:
                        continue  # sem filtro, a classificação não entra
                    for n in (8, 16):
                        for estacao in ("ano", "dez-fev"):
                            r = rosa(linhas, cls, n, k, filtro, rv.SEASONS[estacao])
                            r.update({
                                "metodo": metodo,
                                "correcao": None if correcao is None else {"terreno": correcao[0], "z": correcao[1]},
                                "filtro": filtro,
                                "setores": n,
                                "estacao": estacao,
                            })
                            caso["rosas"].append(r)
        saida["casos"][local] = caso
        perto = min(r["menor_distancia_a_limite"] for r in caso["rosas"] if r["menor_distancia_a_limite"] is not None)
        print(f"{local}: {len(caso['rosas'])} rosas; classes pelo limiar de 20 °C {caso['contagem_limiar-20']}; "
              f"menor distância de uma velocidade corrigida (k ≠ 1) a um limite de classe: {perto:.3g} m/s")
    OUT.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(OUT, OUT.stat().st_size // 1024, "kB")


if __name__ == "__main__":
    main()

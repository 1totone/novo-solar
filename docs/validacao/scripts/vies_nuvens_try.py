"""Viés das nuvens no tempo da radiação (spec 04, seção 4.3; relatório do F4.1, seção 4.1).

O tempo da radiação de um arquivo é medido pelo centróide diário da global nos 30 dias mais
claros. Se as nuvens desses dias são diferentes de manhã e à tarde, o centróide se desloca sem
que o arquivo esteja fora de tempo. As TRY do SOL-AR 6.2 permitem medir esse viés: a global delas
segue o sol do modelo, e esse sol está na extraterrestre do próprio arquivo, cujo atraso em relação
ao sol real o F2.7 mediu (radiacao-csv.json). Aqui, só com o arquivo: centróide da global menos o
da extraterrestre do arquivo, nos 30 dias de maior índice de claridade diário.

O script também desconta esse viés do atraso dos TMYx 2011-2025 das mesmas cidades (catálogo do
F4.1), supondo que as nuvens dos dias claros sejam parecidas nos dois arquivos do mesmo lugar.

Uso: python -I docs/validacao/scripts/vies_nuvens_try.py
Saída: docs/validacao/casos/catalogo/vies-nuvens-try.csv
"""

import csv
import json
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).resolve().parents[3]
TRY = RAIZ / "docs/validacao/casos/solar-6.2"
CATALOGO = RAIZ / "docs/validacao/casos/catalogo/qualidade-tmyx.csv"
SAIDA = RAIZ / "docs/validacao/casos/catalogo/vies-nuvens-try.csv"

# Arquivo da TRY e código WMO da estação TMYx da mesma cidade (src/ui/cities.ts).
CIDADES = {
    "belem.csv": "821930",
    "brasilia.csv": "833780",
    "curitiba.csv": "838400",
    "florianopolis.csv": "838990",
    "fortaleza.csv": "823980",
    "maceio.csv": "829930",
    "natal.csv": "825990",
    "porto_alegre.csv": "839710",
    "recife.csv": "828990",
    "rio_de_janeiro.csv": "837460",
    "salvador.csv": "832480",
    "sao_luis.csv": "822810",
    "sao_paulo.csv": "837800",
    "vitoria.csv": "836490",
}
DIAS_CLAROS = 30
MANHA = slice(7, 11)  # horas do arquivo 8 a 11 (7 h às 11 h)
TARDE = slice(13, 17)  # horas do arquivo 14 a 17 (13 h às 17 h)


def ler_try(caminho: Path) -> np.ndarray:
    """Colunas do CSV do 6.2 (spec 04, seção 4.2), 8760 linhas."""
    linhas = [
        ln.split(",")
        for ln in caminho.read_text(encoding="latin-1").splitlines()
        if ln.strip() and ln.split(",")[0].strip().isdigit()
    ][:8760]
    return np.array([[float(x) if x.strip() else np.nan for x in ln[:19]] for ln in linhas])


def main() -> None:
    f27 = json.loads((TRY / "radiacao-csv.json").read_text(encoding="utf-8"))["arquivos"]
    with CATALOGO.open(encoding="utf-8") as f:
        tmyx = {r["id"]: r for r in csv.DictReader(f)}
    linhas = []
    for arquivo, wmo in CIDADES.items():
        a = ler_try(TRY / arquivo)
        hora = a[:, 2].reshape(-1, 24) - 0.5
        nuvens = a[:, 13].reshape(-1, 24)
        extra = a[:, 14].reshape(-1, 24)
        glob = a[:, 15].reshape(-1, 24)
        kt = glob.sum(1) / extra.sum(1)
        claros = np.argsort(-kt)[:DIAS_CLAROS]
        cg = (glob * hora).sum(1) / glob.sum(1)
        ce = (extra * hora).sum(1) / extra.sum(1)
        vies = float(np.mean((cg - ce)[claros]) * 60)
        with np.errstate(invalid="ignore", divide="ignore"):
            kth = glob / extra
        atraso = f27[arquivo]["atraso_radiacao_min"]
        t = tmyx[wmo]
        atraso_tmyx = float(t["atraso_ghi_dias_claros_min"])
        linhas.append(
            {
                "arquivo": arquivo,
                "wmo_tmyx": wmo,
                "estacao_tmyx": t["nome"],
                "atraso_f27_min": atraso,
                "vies_nuvens_min": round(vies, 1),
                "atraso_centroide_try_min": round(atraso + vies, 1),
                "nebulosidade_manha": round(float(nuvens[claros][:, MANHA].mean()), 1),
                "nebulosidade_tarde": round(float(nuvens[claros][:, TARDE].mean()), 1),
                "kt_manha": round(float(np.nanmean(kth[claros][:, MANHA])), 3),
                "kt_tarde": round(float(np.nanmean(kth[claros][:, TARDE])), 3),
                "atraso_tmyx_min": atraso_tmyx,
                "atraso_tmyx_sem_vies_min": round(atraso_tmyx - vies, 1),
            }
        )
    with SAIDA.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)
    for r in linhas:
        print(
            f"{r['arquivo']:18s} viés {r['vies_nuvens_min']:+5.1f} min | nebulosidade "
            f"{r['nebulosidade_manha']:.1f}/{r['nebulosidade_tarde']:.1f} | kt "
            f"{r['kt_manha']:.3f}/{r['kt_tarde']:.3f} | TMYx {r['atraso_tmyx_min']:+5.1f}, "
            f"sem o viés {r['atraso_tmyx_sem_vies_min']:+5.1f}"
        )


if __name__ == "__main__":
    main()

"""Tempo da radiação de arquivos BrazFuture (F4.2; método da spec 04, seção 4.3).

Mesmo método e mesmas funções do script do catálogo (F4.1, pvlib): centróide diário da global
contra o da extraterrestre do SPA integrada nas mesmas horas, na média dos 30 dias mais claros; e
o mesmo para o campo de extraterrestre do próprio arquivo. Arquivos: cópias do Climate.OneBuilding.org
(o Zenodo, origem do BrazFuture, estava bloqueado na rede da sessão), baixados para uma cache fora
do repositório (decisão 0010).

Uso: python -I docs/validacao/scripts/tempo_radiacao_brazfuture.py --cache /caminho/da/cache
Saída: docs/validacao/casos/catalogo/tempo-brazfuture.csv
"""

import argparse
import csv
import importlib.util
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
SAIDA = RAIZ / "docs/validacao/casos/catalogo/tempo-brazfuture.csv"
BASE = "https://climate.onebuilding.org/WMO_Region_3_South_America/BRA_Brazil_BrazFuture/"
ARQUIVOS = [
    "SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_RCP8.5_MPI-ESM_remo_2010s_BrazFuture.zip",
    "SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_RCP8.5_MPI-ESM_remo_2050s_BrazFuture.zip",
    "SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_RCP8.5_HadGEM2_remo_2010s_BrazFuture.zip",
    "SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_RCP8.5_MPI-ESM_regcm_2010s_BrazFuture.zip",
    "SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_RCP8.5_NorESM1_regcm_2050s_BrazFuture.zip",
    "AM_Amazonas/BRA_AM_Manaus-Gomes.Intl.AP.821110_RCP8.5_MPI-ESM_remo_2010s_BrazFuture.zip",
    "DF_Distrito_Federal/BRA_DF_Brasilia-Kubitschek.Intl.AP.833780_RCP8.5_MPI-ESM_remo_2010s_BrazFuture.zip",
    "PE_Pernambuco/BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_RCP8.5_MPI-ESM_remo_2010s_BrazFuture.zip",
    "RS_Rio_Grande_do_Sul/BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_RCP8.5_MPI-ESM_remo_2010s_BrazFuture.zip",
]


def catalogo():
    """Funções do script do catálogo (scripts/catalogo/gerar_catalogo.py)."""
    caminho = RAIZ / "scripts/catalogo/gerar_catalogo.py"
    spec = importlib.util.spec_from_file_location("gerar_catalogo", caminho)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--cache", type=Path, required=True)
    p.add_argument("--pausa", type=float, default=2.0)
    args = p.parse_args()
    g = catalogo()
    linhas = []
    for caminho in ARQUIVOS:
        dados = g.fetch(BASE + caminho, args.cache / Path(caminho).name, args.pausa)
        local, df, _ = g.read_epw(dados)
        etr_spa = g.extraterrestrial_hours(local, df)
        horas = df["hora"].to_numpy()
        _, ghi_claros = g.radiation_lag(df["ghi"].to_numpy(), etr_spa, horas)
        _, etr_arquivo = g.radiation_lag(df["etr"].to_numpy(), etr_spa, horas)
        nome = Path(caminho).name.removesuffix("_BrazFuture.zip")
        linhas.append(
            {
                "arquivo": nome,
                "sha256": g.sha256(dados),
                "lat": local["lat"],
                "lon": local["lon"],
                "fuso": local["fuso"],
                "atraso_ghi_dias_claros_min": ghi_claros,
                "atraso_etr_do_arquivo_min": etr_arquivo,
            }
        )
        print(f"{nome:70s} global {ghi_claros:+6.1f} min | extraterrestre do arquivo {etr_arquivo:+5.1f}")
    with SAIDA.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas[0]))
        w.writeheader()
        w.writerows(linhas)


if __name__ == "__main__":
    main()

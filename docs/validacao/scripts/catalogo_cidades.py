"""Catálogo das cidades da aplicação (F2.7): as 15 do SOL-AR 6.2 e Manaus.

Uso: python3 docs/validacao/scripts/catalogo_cidades.py
Saída: docs/validacao/casos/epw/catalogo-cidades.json

Para cada cidade, baixa o arquivo TMYx 2011 a 2025 (Climate.OneBuilding.org) da estação do
aeroporto, confere o cabeçalho LOCATION do EPW e grava coordenadas, fuso, elevação e o SHA-256 do
zip e do EPW. Os EPWs não são versionados (decisão 0010): a aplicação mostra o link e o usuário
carrega o arquivo.

Para as cidades do 6.2, grava também as coordenadas da estação das TRY segundo o livro de origem
(Goulart, Lamberts e Firmino, 1998, em graus e minutos) e as do arquivo Latitudes.csv do 6.2, com
a diferença em relação ao TMYx. Só biblioteca padrão.
"""

import csv
import hashlib
import io
import json
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "validacao" / "casos" / "epw" / "catalogo-cidades.json"
LATITUDES_62 = ROOT / "docs" / "validacao" / "casos" / "solar-6.2" / "Latitudes.csv"
BASE = "https://climate.onebuilding.org/WMO_Region_3_South_America/"

# id, nome, arquivo do 6.2 (ou None), nome no Latitudes.csv, caminho do TMYx no OneBuilding
CITIES = [
    ("belem", "Belém (PA)", "belem.csv", "Belém", "BRA_Brazil/PA_Para/BRA_PA_Belem-Val.de.Cans.Intl.AP.821930_TMYx.2011-2025.zip"),
    ("brasilia", "Brasília (DF)", "brasilia.csv", "Brasília", "BRA_Brazil/DF_Distrito_Federal/BRA_DF_Brasilia-Kubitschek.Intl.AP.833780_TMYx.2011-2025.zip"),
    ("concepcion", "Concepción (Chile)", "concepcion.csv", "Concepcion", "CHL_Chile/BI_Bio-Bio/CHL_BI_Concepcion-Carriel.Sur.Intl.AP.856820_TMYx.2011-2025.zip"),
    ("curitiba", "Curitiba (PR)", "curitiba.csv", "Curitiba", "BRA_Brazil/PR_Parana/BRA_PR_Curitiba-Pena.Intl.AP.838400_TMYx.2011-2025.zip"),
    ("florianopolis", "Florianópolis (SC)", "florianopolis.csv", "Florianópolis", "BRA_Brazil/SC_Santa_Catarina/BRA_SC_Florianopolis-Luz.Intl.AP.838990_TMYx.2011-2025.zip"),
    ("fortaleza", "Fortaleza (CE)", "fortaleza.csv", "Fortaleza", "BRA_Brazil/CE_Ceara/BRA_CE_Fortaleza-Pinto.Martins.Intl.AP.823980_TMYx.2011-2025.zip"),
    ("maceio", "Maceió (AL)", "maceio.csv", "Maceió", "BRA_Brazil/AL_Alagoas/BRA_AL_Maceio-Palmares.Intl.AP.829930_TMYx.2011-2025.zip"),
    ("manaus", "Manaus (AM)", None, None, "BRA_Brazil/AM_Amazonas/BRA_AM_Manaus-Gomes.Intl.AP.821110_TMYx.2011-2025.zip"),
    ("natal", "Natal (RN)", "natal.csv", "Natal", "BRA_Brazil/RN_Rio_Grande_do_Norte/BRA_RN_Natal.Intl.AP.825990_TMYx.2011-2025.zip"),
    ("porto-alegre", "Porto Alegre (RS)", "porto_alegre.csv", "Porto_Alegre", "BRA_Brazil/RS_Rio_Grande_do_Sul/BRA_RS_Porto.Alegre-Salgado.Filho.Intl.AP.839710_TMYx.2011-2025.zip"),
    ("recife", "Recife (PE)", "recife.csv", "Recife", "BRA_Brazil/PE_Pernambuco/BRA_PE_Recife-Guararapes-Freyre.Intl.AP.828990_TMYx.2011-2025.zip"),
    ("rio-de-janeiro", "Rio de Janeiro (RJ)", "rio_de_janeiro.csv", "Rio_de_Janeiro", "BRA_Brazil/RJ_Rio_de_Janeiro/BRA_RJ_Rio.de.Janeiro-Galeao-Jobim.Intl.AP.837460_TMYx.2011-2025.zip"),
    ("salvador", "Salvador (BA)", "salvador.csv", "Salvador", "BRA_Brazil/BA_Bahia/BRA_BA_Salvador-Magalhaes.Intl.AP.832480_TMYx.2011-2025.zip"),
    ("sao-luis", "São Luís (MA)", "sao_luis.csv", "São_Luis", "BRA_Brazil/MA_Maranhao/BRA_MA_Sao.Luis-Machado.Intl.AP.822810_TMYx.2011-2025.zip"),
    ("sao-paulo", "São Paulo (SP)", "sao_paulo.csv", "São_Paulo", "BRA_Brazil/SP_Sao_Paulo/BRA_SP_Sao.Paulo-Congonhas.AP.837800_TMYx.2011-2025.zip"),
    ("vitoria", "Vitória (ES)", "vitoria.csv", "Vitória", "BRA_Brazil/ES_Espirito_Santo/BRA_ES_Vitoria-Aguiar.Salles.AP.836490_TMYx.2011-2025.zip"),
]

# Estação das TRY segundo Goulart, Lamberts e Firmino (1998): latitude Sul e longitude Oeste em
# (graus, minutos) e altitude em m (seção 1 de cada capítulo); período dos registros horários de
# onde o ano de referência foi escolhido (cap. 1). O livro não diz qual ano foi escolhido.
LIVRO_1998 = {
    "belem": ((1, 23), (48, 29), 16, (1961, 1970)),
    "brasilia": ((15, 52), (47, 55), 1060, (1961, 1970)),
    "curitiba": ((25, 31), (49, 11), 910, (1961, 1970)),
    "florianopolis": ((27, 40), (48, 33), 7, (1961, 1970)),
    "fortaleza": ((3, 47), (38, 32), 25, (1961, 1970)),
    "maceio": ((9, 31), (35, 47), 115, (1961, 1970)),
    "natal": ((5, 55), (35, 15), 49, (1951, 1970)),
    "porto-alegre": ((30, 0), (51, 11), 4, (1951, 1970)),
    "recife": ((8, 8), (34, 55), 11, (1951, 1970)),
    "rio-de-janeiro": ((22, 50), (43, 15), 5, (1961, 1970)),
    "salvador": ((12, 54), (38, 20), 13, (1961, 1970)),
    "sao-luis": ((2, 35), (44, 14), 53, (1961, 1970)),
    "sao-paulo": ((23, 37), (46, 39), 802, (1951, 1970)),
    "vitoria": ((20, 16), (40, 17), 5, (1961, 1970)),
}


def fetch(url, attempts=5):
    """Baixa com novas tentativas: o servidor às vezes fecha a conexão no meio."""
    for k in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "novo-solar (LabEEE/UFSC)"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except (urllib.error.URLError, ConnectionError) as err:
            if k == attempts - 1:
                raise
            print(f"  nova tentativa ({err})")
            time.sleep(2 ** (k + 1))


def south_west(deg_min):
    """(graus, minutos) Sul ou Oeste -> graus decimais negativos."""
    d, m = deg_min
    return -round(d + m / 60, 4)


def main():
    lat62 = {r[0]: r for r in csv.reader(LATITUDES_62.open(encoding="utf-8"))}
    out = []
    for cid, name, try_file, name62, path in CITIES:
        url = BASE + path
        data = fetch(url)
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            epw_name = next(n for n in z.namelist() if n.lower().endswith(".epw"))
            epw = z.read(epw_name)
        loc = epw.split(b"\n", 1)[0].decode("latin-1").strip().split(",")
        tmyx = {
            "url": url,
            "arquivo": epw_name,
            "sha256_zip": hashlib.sha256(data).hexdigest(),
            "sha256_epw": hashlib.sha256(epw).hexdigest(),
            "estacao": loc[1],
            "wmo": loc[5],
            "latitude": float(loc[6]),
            "longitude": float(loc[7]),
            "fuso": float(loc[8]),
            "elevacao": float(loc[9]),
        }
        entry = {"id": cid, "nome": name, "tmyx": tmyx, "solar_6_2": None}
        if try_file:
            r = lat62[name62]
            # Latitudes.csv: nome, latitude, arquivo horário, arquivo de ventos, longitude oeste positiva
            s62 = {
                "arquivo": try_file,
                "latitudes_csv": {"latitude": float(r[1]), "longitude_oeste": float(r[4])},
            }
            if cid in LIVRO_1998:
                la, lo, alt, period = LIVRO_1998[cid]
                s62["livro_1998"] = {
                    "latitude": south_west(la),
                    "longitude": south_west(lo),
                    "altitude": alt,
                    "periodo_registros": list(period),
                    "texto": f"{la[0]}°{la[1]:02d}'S {lo[0]}°{lo[1]:02d}'O",
                    "diferenca_tmyx_graus": round(
                        max(abs(south_west(la) - tmyx["latitude"]), abs(south_west(lo) - tmyx["longitude"])), 4
                    ),
                }
            entry["solar_6_2"] = s62
        out.append(entry)
        print(cid, loc[1], loc[6], loc[7], loc[8], loc[9])
    OUT.write_text(
        json.dumps({"gerado_por": "docs/validacao/scripts/catalogo_cidades.py", "cidades": out}, ensure_ascii=False, indent=1)
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()

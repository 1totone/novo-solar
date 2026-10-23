"""Baixa os EPWs de teste listados em docs/validacao/casos/epw/manifesto.json e confere o SHA-256.

Uso: python3 docs/validacao/scripts/baixar_epw.py [pasta_destino]
Destino padrão: .cache/epw/ na raiz do repositório (fora do git). Arquivos já presentes e com o
hash correto não são baixados de novo. Só usa a biblioteca padrão do Python.

Os EPWs não são versionados porque os termos de redistribuição do Climate.OneBuilding.org ainda
não foram confirmados (ROADMAP, F4.1).
"""

import hashlib
import io
import json
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MANIFEST = ROOT / "docs" / "validacao" / "casos" / "epw" / "manifesto.json"
UA = "Mozilla/5.0 (novo-solar; validacao)"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str) -> bytes:
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except OSError as err:
            if attempt == 3:
                raise
            wait = 2 ** (attempt + 1)
            print(f"  falhou ({err}); nova tentativa em {wait} s")
            time.sleep(wait)
    raise RuntimeError("inalcançável")


def main() -> int:
    dest = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / ".cache" / "epw"
    dest.mkdir(parents=True, exist_ok=True)
    entries = json.loads(MANIFEST.read_text(encoding="utf-8"))["arquivos"]
    erros = 0
    for e in entries:
        target = dest / e["arquivo"]
        if target.exists() and sha256(target.read_bytes()) == e["sha256_epw"]:
            print(f"ok (cache)  {e['id']}")
            continue
        print(f"baixando    {e['id']}")
        with zipfile.ZipFile(io.BytesIO(fetch(e["url"]))) as z:
            data = z.read(e["arquivo"])
        if sha256(data) != e["sha256_epw"]:
            print(f"ERRO: SHA-256 diferente do manifesto para {e['arquivo']}", file=sys.stderr)
            erros += 1
            continue
        target.write_bytes(data)
        print(f"ok          {e['id']}")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main())

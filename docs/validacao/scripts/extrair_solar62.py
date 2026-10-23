"""Extrai os dados e as imagens de referência do instalador do SOL-AR 6.2 (LabEEE/UFSC).

Uso:
    python3 docs/validacao/scripts/extrair_solar62.py Analysis_SolAr_6_2.zip [pasta_de_saida]

O zip está em https://labeee.ufsc.br/sites/default/files/softwares/Analysis_SolAr_6_2.zip.
Saída padrão: docs/validacao/casos/solar-6.2/ (CSVs horários, rosas de vento, Latitudes.csv,
convertidos de Latin-1 para UTF-8 sem alterar valores).

Cadeia: zip -> "SolAr 6_2.exe" (InstallShield) -> SOL-AR.msi (codificado com chave derivada do
nome do arquivo, em blocos de 1024 bytes) -> CAB dentro do MSI -> arquivos.
Dependências: olefile, cabarchive (ver requirements.txt).
"""

import hashlib
import io
import struct
import sys
import zipfile
from pathlib import Path

import olefile
from cabarchive import CabArchive

SEED = (0x13, 0x35, 0x86, 0x07)
ROT = bytes(((b << 4) | (b >> 4)) & 0xFF for b in range(256))
HEADER_SIZE = 46  # "InstallShield\0" + contagem + campos reservados
ENTRY_SIZE = 312  # nome (260) + flags + reservado + tamanho + datas


def overlay_offset(exe: bytes) -> int:
    pe = struct.unpack_from("<I", exe, 0x3C)[0]
    nsec = struct.unpack_from("<H", exe, pe + 6)[0]
    opt = struct.unpack_from("<H", exe, pe + 20)[0]
    sec = pe + 24 + opt
    end = 0
    for k in range(nsec):
        raw_size, raw_ptr = struct.unpack_from("<II", exe, sec + 40 * k + 16)
        end = max(end, raw_ptr + raw_size)
    return end


def decode(data: bytes, name: str) -> bytes:
    key = bytes(c ^ SEED[i % 4] for i, c in enumerate(name.encode("latin-1")))
    n = len(key)
    return bytes((~(ROT[b] ^ key[(i % 1024) % n])) & 0xFF for i, b in enumerate(data))


def installshield_files(exe: bytes) -> dict[str, bytes]:
    o = overlay_offset(exe)
    if exe[o : o + 14] != b"InstallShield\0":
        raise ValueError("Instalador não reconhecido (cabeçalho InstallShield ausente).")
    count = struct.unpack_from("<H", exe, o + 14)[0]
    p = o + HEADER_SIZE
    files = {}
    for _ in range(count):
        name = exe[p : p + 260].split(b"\0")[0].decode("latin-1")
        size = struct.unpack_from("<I", exe, p + 268)[0]
        start = p + ENTRY_SIZE
        files[name] = decode(exe[start : start + size], name)
        p = start + size
    return files


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    out = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parents[1] / "casos" / "solar-6.2"
    with zipfile.ZipFile(src) as z:
        exe = z.read("SolAr 6_2.exe")
    msi = installshield_files(exe)["SOL-AR.msi"]
    ole = olefile.OleFileIO(io.BytesIO(msi))
    cab = next(
        data for data in (ole.openstream(s).read() for s in ole.listdir()) if data[:4] == b"MSCF"
    )
    out.mkdir(parents=True, exist_ok=True)
    lines = []
    for name, entry in sorted(CabArchive(cab).items()):
        if not name.lower().endswith(".csv"):
            continue
        text = entry.buf.decode("latin-1").replace("\r\n", "\n")
        (out / name).write_text(text, encoding="utf-8")
        lines.append(f"{hashlib.sha256(entry.buf).hexdigest()}  {name}")
    (out / "SHA256SUMS-original.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"{len(lines)} arquivos em {out}")


if __name__ == "__main__":
    main()

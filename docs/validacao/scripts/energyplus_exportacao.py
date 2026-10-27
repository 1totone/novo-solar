"""Teste de ida e volta da exportação para o EnergyPlus e para o CAD (F5.2; spec 13, seção 13.6).

Uso:
  ENERGYPLUS_DIR=/caminho/do/EnergyPlus-26.2.0 python3 -I docs/validacao/scripts/energyplus_exportacao.py
Dependências: requirements.txt (numpy, ezdxf), o EnergyPlus 26.2.0 e os EPWs de .cache/epw/.

Passos:
1. Escreve o modelo base da cena objetos-no-modelo (exportacao/objetos-no-modelo-base.idf): o
   modelo do F3.8 sem peças, deslocado para a origem da cena, que serve de "modelo do usuário".
2. Os arquivos exportados pela aplicação (tests/referencia/energyplusExportacao.test.ts, com
   ATUALIZAR_EXPORTACAO=1) já estão em exportacao/. Para cada cena, roda o EnergyPlus no modelo
   exportado (na objetos-no-modelo, no modelo base com os objetos acrescentados), com uma cópia que
   acrescenta Output:Surfaces:Drawing, DXF.
3. Geometria: as superfícies de sombreamento que o EnergyPlus montou (eplusout.dxf, 5 casas),
   inclusive as dos objetos por projeção, contra as placas da cena calculadas aqui, de forma
   independente (mascara_geometria.py, o limite dos prolongamentos infinitos e a passagem para o
   mundo da spec 13, seção 13.1).
4. DXF de corte e vista: leitura e auditoria pelo ezdxf; vidro, peças da vista e do corte contra as
   placas projetadas ou cortadas aqui.
5. Grava exportacao/resultados.json, lido pelo teste em TypeScript.
"""

import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path

import ezdxf
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import energyplus_fracao_ensolarada as f38  # noqa: E402
import mascara_geometria as mg  # noqa: E402

ROOT = Path(__file__).resolve().parents[3]
DIR = ROOT / "docs" / "validacao" / "casos" / "energyplus" / "exportacao"
TRABALHO = ROOT / ".cache" / "energyplus-exportacao"
FATOR_INFINITO = 20
DXF_CENAS = ["grelha-oeste", "laminas-sudeste-recuo", "placas-livres-sul"]
SUPERFICIES_DA_ZONA = {"PAREDE_FRENTE", "FUNDO", "LATERAL_DIREITA", "LATERAL_ESQUERDA", "COBERTURA", "PISO",
                       "PAREDE_FUNDO", "PAREDE_DIREITA", "PAREDE_ESQUERDA", "JANELA"}
CAMPOS_INFINITOS = {"overhang": ("extendLeft", "extendRight"), "fin": ("extendAbove", "extendBelow"),
                    "horizontalLouvers": ("extendLeft", "extendRight"),
                    "verticalLouvers": ("extendAbove", "extendBelow")}


def cenas():
    ref = json.loads((ROOT / "docs/validacao/casos/energyplus/fracao-ensolarada.json").read_text(encoding="utf-8"))
    novas = json.loads((DIR / "cenas.json").read_text(encoding="utf-8"))["cenas"]
    campos = ("id", "local", "orientacao", "janela", "dispositivos", "origem")
    return ref["locais"], [{k: c[k] for k in campos if k in c} for c in ref["cenas"] + novas]


def com_limite(cena):
    """Dispositivos com cada prolongamento infinito (None) trocado por L = 20 · y_máx."""
    j = cena["janela"]
    W, H, d = j["width"], j["height"], j.get("setback", 0.0)
    out = []
    for p in cena["dispositivos"]:
        campos = CAMPOS_INFINITOS.get(p["kind"], ())
        if any(k in p and p[k] is None for k in campos):
            finito = {**p, **{k: 0.0 for k in campos if p.get(k, 0.0) is None}}
            y_max = max(v[1] for pl in mg.placas_do_dispositivo(W, H, d, finito) for v in pl)
            p = {**p, **{k: FATOR_INFINITO * y_max for k in campos if k in p and p[k] is None}}
        out.append(p)
    return {**cena, "dispositivos": out}


def mundo(p, cena):
    x, y, z = f38.mundo(p, cena["orientacao"])
    o = cena.get("origem", (0.0, 0.0, 0.0))
    return (x + o[0], y + o[1], z + o[2])


def modelo_base(cena):
    """Modelo do F3.8 sem peças nem recuo, deslocado para a origem da cena."""
    base = f38.modelo({**cena, "dispositivos": [], "janela": {**cena["janela"], "setback": 0.0}})
    o = cena["origem"]

    def desloca(m):
        x, y, z = (float(m.group(i)) for i in (1, 2, 3))
        return f"    {x + o[0]!r}, {y + o[1]!r}, {z + o[2]!r}{m.group(4)}"

    num = r"(-?\d+(?:\.\d+)?(?:e-?\d+)?)"
    return re.sub(rf"^    {num}, {num}, {num}([,;])$", desloca, base, flags=re.M)


def simular(nome, texto, epw):
    pasta = TRABALHO / nome
    pasta.mkdir(parents=True, exist_ok=True)
    idf = pasta / "modelo.idf"
    idf.write_text(texto + "\nOutput:Surfaces:Drawing, DXF;\n", encoding="utf-8")
    ep = Path(os.environ["ENERGYPLUS_DIR"]) / "energyplus"
    r = subprocess.run([str(ep), "-w", str(epw), "-d", str(pasta), str(idf)], capture_output=True, text=True)
    err = (pasta / "eplusout.err").read_text(encoding="utf-8", errors="replace")
    if r.returncode != 0 or "EnergyPlus Completed Successfully" not in err:
        raise RuntimeError(f"{nome}: EnergyPlus falhou\n{err[-3000:]}")
    if "** Severe  **" in err:
        raise RuntimeError(f"{nome}: erro grave no EnergyPlus\n{err[-3000:]}")
    return pasta, err


def faces_dxf(caminho):
    """Faces (nome, vértices) do eplusout.dxf: cada superfície é um 3DFACE precedido do nome (999)."""
    linhas = [ln.strip() for ln in caminho.read_text(encoding="utf-8", errors="replace").splitlines()]
    faces, nome, i = [], None, 0
    while i < len(linhas) - 1:
        codigo, valor = linhas[i], linhas[i + 1]
        if codigo == "999":
            nome = valor
        elif codigo == "0" and valor == "3DFACE":
            pontos, j = {}, i + 2
            while j < len(linhas) - 1 and linhas[j] not in ("0", "999"):
                c = int(linhas[j])
                if 10 <= c <= 33:
                    pontos[c] = float(linhas[j + 1])
                j += 2
            vs = []
            for k in range(4):
                v = (pontos[10 + k], pontos[20 + k], pontos[30 + k])
                if not vs or max(abs(a - b) for a, b in zip(v, vs[-1])) > 1e-9:
                    vs.append(v)
            if len(vs) > 1 and max(abs(a - b) for a, b in zip(vs[0], vs[-1])) <= 1e-9:
                vs.pop()
            faces.append((nome, vs))
            i = j
            continue
        i += 2
    return faces


def distancia(a, b):
    """Hausdorff entre os conjuntos de vértices."""
    a, b = np.asarray(a), np.asarray(b)
    d = np.linalg.norm(a[:, None, :] - b[None, :, :], axis=2)
    return float(max(d.min(axis=1).max(), d.min(axis=0).max()))


def conferir_geometria(faces, esperadas):
    sombreamento = []
    for nome, vs in faces:
        base = nome.split(":")[-1]
        if base.startswith("Mir-") or base in SUPERFICIES_DA_ZONA or nome.startswith("North Arrow"):
            continue
        sombreamento.append(vs)
    livres = list(range(len(esperadas)))
    pior, nao_casadas = 0.0, 0
    for vs in sombreamento:
        if not livres:
            nao_casadas += 1
            continue
        ds = [distancia(vs, esperadas[k]) for k in livres]
        k = int(np.argmin(ds))
        if ds[k] > 1e-3:
            nao_casadas += 1
            continue
        pior = max(pior, ds[k])
        livres.pop(k)
    nao_casadas += len(livres)
    return {"superficies": len(sombreamento), "nao_casadas": nao_casadas, "distancia_maxima": pior}


def contar_objetos(texto):
    out = {}
    for tipo in re.findall(r"^(Shading:[A-Za-z:]+),", texto, flags=re.M):
        out[tipo] = out.get(tipo, 0) + 1
    return out


def corte(pl, x0):
    """Interseção da placa com o plano x = x0: os dois pontos mais afastados, em (y, z)."""
    pts = []
    for i, a in enumerate(pl):
        b = pl[(i + 1) % len(pl)]
        da, db = a[0] - x0, b[0] - x0
        if abs(da) < 1e-12:
            pts.append((a[1], a[2]))
        if (da < 0 < db) or (db < 0 < da):
            t = da / (da - db)
            pts.append((a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])))
    if len(pts) < 2:
        return None
    pares = [(p, q) for i, p in enumerate(pts) for q in pts[i + 1:]]
    return max(pares, key=lambda pq: math.dist(*pq))


def caixa(pontos):
    xs, ys = [p[0] for p in pontos], [p[1] for p in pontos]
    return (min(xs), min(ys), max(xs), max(ys))


def casar_caixas(obtidas, esperadas):
    livres = list(range(len(esperadas)))
    pior, falhas = 0.0, 0
    for c in obtidas:
        if not livres:
            falhas += 1
            continue
        ds = [max(abs(a - b) for a, b in zip(c, esperadas[k])) for k in livres]
        k = int(np.argmin(ds))
        pior = max(pior, ds[k])
        livres.pop(k)
    return pior, falhas + len(livres)


def conferir_dxf(cena):
    doc = ezdxf.readfile(DIR / f"{cena['id']}.dxf")
    auditoria = doc.audit()
    msp = doc.modelspace()
    j = cena["janela"]
    W, H, d = j["width"], j["height"], j.get("setback", 0.0)
    placas = [pl for pl in mg.placas(cena)][len(mg.recuo(W, H, d)):]

    def caixas(camada):
        out = []
        for e in msp.query(f'*[layer=="{camada}"]'):
            if e.dxftype() == "LINE":
                out.append(caixa([(e.dxf.start.x, e.dxf.start.y), (e.dxf.end.x, e.dxf.end.y)]))
            elif e.dxftype() == "POLYLINE":
                out.append(caixa([(v.dxf.location.x, v.dxf.location.y) for v in e.vertices]))
        return out

    vidro = caixas("VISTA-VIDRO")
    ok_vidro = len(vidro) == 1 and abs(vidro[0][2] - vidro[0][0] - W) < 1e-6 and abs(vidro[0][1]) < 1e-6 \
        and abs(vidro[0][3] - H) < 1e-6
    dx = vidro[0][0] if vidro else 0.0
    vista = [caixa([(dx + W - v[0], v[2]) for v in pl]) for pl in placas]
    cortes, alem = [], []
    for pl in placas:
        seg = corte(pl, W / 2)
        if seg:
            cortes.append(caixa(seg))
        else:
            alem.append(caixa([(v[1], v[2]) for v in pl]))
    resultados = [casar_caixas(caixas("VISTA-PECA"), vista), casar_caixas(caixas("CORTE-PECA"), cortes),
                  casar_caixas(caixas("CORTE-ALEM"), alem)]
    return {
        "erros": len(auditoria.errors),
        "correcoes": len(auditoria.fixes),
        "vidro": bool(ok_vidro),
        "distancia_maxima": max(r[0] for r in resultados) if all(r[1] == 0 for r in resultados) else 1.0,
        "pecas": len(vista) + len(cortes) + len(alem),
    }


def main() -> None:
    locais, todas = cenas()
    base = next(c for c in todas if c["id"] == "objetos-no-modelo")
    (DIR / "objetos-no-modelo-base.idf").write_text(modelo_base(base), encoding="utf-8")
    if "ENERGYPLUS_DIR" not in os.environ:
        print("modelo base escrito; defina ENERGYPLUS_DIR para rodar o EnergyPlus")
        return
    resultados = {"energyplus": None, "cenas": {}, "dxf": {}}
    for cena in todas:
        epw = f38.EPW_DIR / f38.LOCAIS[cena["local"]]
        if "origem" in cena:
            objetos = (DIR / f"{cena['id']}-objetos.idf").read_text(encoding="utf-8")
            texto = (DIR / "objetos-no-modelo-base.idf").read_text(encoding="utf-8") + "\n" + objetos
        else:
            objetos = texto = (DIR / f"{cena['id']}.idf").read_text(encoding="utf-8")
        pasta, err = simular(cena["id"], texto, epw)
        resultados["energyplus"] = f38.versao(err)
        _, series = f38.ler_eso(pasta / "eplusout.eso")
        frac = np.array([float(v) for v in series[("JANELA", "Surface Outside Face Sunlit Fraction")]])
        assert frac.size == 365 * 24 * f38.PASSOS, frac.size
        esperadas = [[mundo(v, cena) for v in pl] for pl in mg.placas(com_limite(cena))]
        geo = conferir_geometria(faces_dxf(pasta / "eplusout.dxf"), esperadas)
        resultados["cenas"][cena["id"]] = {
            "horaria": [f38.num(v, 7) for v in f38.por_hora(frac)],
            "objetos": contar_objetos(objetos),
            "geometria": geo,
        }
        print(f"{cena['id']:24s} superfícies {geo['superficies']:2d}  não casadas {geo['nao_casadas']}  "
              f"distância máx. {geo['distancia_maxima']:.2e} m  objetos {contar_objetos(objetos)}")
    for cena in todas:
        if cena["id"] in DXF_CENAS:
            resultados["dxf"][cena["id"]] = r = conferir_dxf(cena)
            print(f"DXF {cena['id']:20s} {r}")
    (DIR / "resultados.json").write_text(json.dumps(resultados, ensure_ascii=False, separators=(",", ":")) + "\n",
                                         encoding="utf-8")


if __name__ == "__main__":
    main()

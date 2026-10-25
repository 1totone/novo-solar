"""Referência independente para a classificação das horas (F3.4).

Uso: python3 docs/validacao/scripts/classificacao_horas.py
Entrada: os 6 EPWs de teste em .cache/epw (baixar_epw.py).
Saída: docs/validacao/casos/classificacao/classificacao-horas.json
Dependências: requirements.txt (numpy, pythermalcomfort).

Definições da spec 08:
- temperatura da hora h: média de T(h − 1) e T(h) ("mean") ou T(h) ("end"); a linha anterior à
  primeira é a última do arquivo;
- média diária: média das 24 linhas do dia (pelo menos 18 presentes);
- temperatura média predominante do dia d: média dos n dias anteriores (ano cíclico), exponencial
  (pesos α^(i − 1), normalizados) ou aritmética;
- faixa adaptativa da ASHRAE 55: limites do pythermalcomfort (adaptive_ashrae, sem arredondamento,
  com a faixa de aplicação de t_pma); t_pma calculada aqui com numpy e conferida contra
  running_mean_outdoor_temperature (que arredonda para 0,1 °C);
- classe: quente se T > U, fria se T < L, neutra se L ≤ T ≤ U, sem classe se T ou os limites
  faltam.

Codificação das classes no JSON: "q" quente, "f" fria, "n" neutra, "s" sem classe.
"""

import json
import math
import warnings
from pathlib import Path

import numpy as np
from pythermalcomfort.environment import running_mean_outdoor_temperature
from pythermalcomfort.models import adaptive_ashrae

ROOT = Path(__file__).resolve().parents[3]
EPW_DIR = ROOT / ".cache" / "epw"
MANIFESTO = ROOT / "docs" / "validacao" / "casos" / "epw" / "manifesto.json"
OUT = ROOT / "docs" / "validacao" / "casos" / "classificacao" / "classificacao-horas.json"
AUSENTE_TBS = 99.9
MIN_HORAS_DIA = 18

CONFIGURACOES = [
    {"id": "adaptativa-80-exp", "metodo": {"kind": "adaptive", "acceptability": 80,
                                            "running": {"averaging": "exponential", "alpha": 0.8, "days": 30}},
     "temperatura": "mean"},
    {"id": "adaptativa-90-arit7-fim", "metodo": {"kind": "adaptive", "acceptability": 90,
                                                  "running": {"averaging": "arithmetic", "days": 7}},
     "temperatura": "end"},
    {"id": "adaptativa-80-exp06-7", "metodo": {"kind": "adaptive", "acceptability": 80,
                                                "running": {"averaging": "exponential", "alpha": 0.6, "days": 7}},
     "temperatura": "mean"},
    {"id": "limiares-18-26", "metodo": {"kind": "thresholds", "cold": 18.0, "hot": 26.0}, "temperatura": "mean"},
    {"id": "limiar-so-quente-27", "metodo": {"kind": "thresholds", "cold": None, "hot": 27.0}, "temperatura": "end"},
    {"id": "equilibrio-24", "metodo": {"kind": "balance", "balance": 24.0}, "temperatura": "end"},
]
# Cidades com as classes de todas as configurações; nas outras, só a primeira.
CIDADES_COMPLETAS = {"florianopolis", "porto-alegre", "concepcion"}


def ler_tbs(caminho):
    """Temperaturas de bulbo seco das linhas horárias (NaN se ausente)."""
    linhas = caminho.read_text(encoding="utf-8", errors="replace").splitlines()[8:]
    tbs = []
    for linha in linhas:
        if not linha.strip():
            continue
        v = float(linha.split(",")[6])
        tbs.append(math.nan if v >= AUSENTE_TBS else v)
    return np.array(tbs)


def temperatura_hora(tbs, modo):
    if modo == "end":
        return tbs.copy()
    anterior = np.roll(tbs, 1)  # a linha anterior à primeira é a última (ano cíclico)
    return (anterior + tbs) / 2


def medias_diarias(tbs):
    dias = tbs.reshape(-1, 24)
    presentes = np.sum(~np.isnan(dias), axis=1)
    soma = np.nansum(dias, axis=1)
    return np.where(presentes >= MIN_HORAS_DIA, soma / np.maximum(presentes, 1), np.nan)


def pesos(running):
    n = running["days"]
    if running["averaging"] == "arithmetic":
        return np.ones(n)
    return running["alpha"] ** np.arange(n)


def media_predominante(diarias, running):
    """t_pma de cada dia: dias d − 1, ..., d − n (ano cíclico), pesos renormalizados sem os ausentes."""
    w = pesos(running)
    n = len(w)
    m = len(diarias)
    out = np.empty(m)
    for d in range(m):
        anteriores = diarias[[(d - i) % m for i in range(1, n + 1)]]
        ok = ~np.isnan(anteriores)
        out[d] = np.sum(w[ok] * anteriores[ok]) / np.sum(w[ok]) if ok.any() else math.nan
    return out


def conferir_pythermalcomfort(diarias, tpma, running):
    """Maior diferença entre t_pma daqui e o running_mean_outdoor_temperature (arredondado a 0,1 °C)."""
    alpha = 1.0 if running["averaging"] == "arithmetic" else running["alpha"]
    n = running["days"]
    m = len(diarias)
    maior = 0.0
    for d in range(m):
        anteriores = [diarias[(d - i) % m] for i in range(1, n + 1)]
        assert not any(math.isnan(x) for x in anteriores), "dia sem média: conferência exige dias completos"
        ref = running_mean_outdoor_temperature(anteriores, alpha=alpha)
        maior = max(maior, abs(ref - tpma[d]))
    assert maior <= 0.05 + 1e-9, maior
    return maior


def limites_adaptativos(tpma, aceitabilidade):
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")  # avisos de t_pma fora da faixa de aplicação
        r = adaptive_ashrae(tdb=np.full_like(tpma, 25.0), tr=np.full_like(tpma, 25.0),
                            t_running_mean=np.nan_to_num(tpma, nan=-99.0), v=np.full_like(tpma, 0.1),
                            round_output=False, limit_inputs=True)
    if aceitabilidade == 80:
        return np.asarray(r.tmp_cmf, float), np.asarray(r.tmp_cmf_80_low, float), np.asarray(r.tmp_cmf_80_up, float)
    return np.asarray(r.tmp_cmf, float), np.asarray(r.tmp_cmf_90_low, float), np.asarray(r.tmp_cmf_90_up, float)


def classificar(t, low, up):
    classes = np.full(len(t), "s")
    ok = ~(np.isnan(t) | np.isnan(low) | np.isnan(up))
    classes[ok & (t > up)] = "q"
    classes[ok & (t < low)] = "f"
    classes[ok & (t >= low) & (t <= up)] = "n"
    perto = ok & ((np.abs(t - low) < 1e-9) | (np.abs(t - up) < 1e-9))
    return "".join(classes), int(np.sum(perto))


def json_num(x, casas=12):
    return None if math.isnan(x) else round(float(x), casas)


def main():
    manifesto = json.loads(MANIFESTO.read_text(encoding="utf-8"))
    saida = {"descricao": __doc__.strip().splitlines()[0], "configuracoes": CONFIGURACOES, "cidades": []}
    for arq in manifesto["arquivos"]:
        tbs = ler_tbs(EPW_DIR / arq["arquivo"])
        assert len(tbs) in (8760, 8784), len(tbs)
        diarias = medias_diarias(tbs)
        cidade = {"id": arq["id"], "arquivo": arq["arquivo"], "horas": len(tbs),
                  "tbs_ausentes": int(np.isnan(tbs).sum()),
                  "medias_diarias": [json_num(x) for x in diarias],
                  "configuracoes": []}
        if arq["id"] == "florianopolis":
            cidade["temperatura_hora_media"] = [json_num(x) for x in temperatura_hora(tbs, "mean")]
        for cfg in CONFIGURACOES:
            if arq["id"] not in CIDADES_COMPLETAS and cfg is not CONFIGURACOES[0]:
                continue
            t = temperatura_hora(tbs, cfg["temperatura"])
            met = cfg["metodo"]
            item = {"id": cfg["id"]}
            if met["kind"] == "adaptive":
                tpma = media_predominante(diarias, met["running"])
                item["dif_max_pythermalcomfort"] = conferir_pythermalcomfort(diarias, tpma, met["running"])
                conf, low_d, up_d = limites_adaptativos(tpma, met["acceptability"])
                item["tpma"] = [json_num(x) for x in tpma]
                item["t_conforto"] = [json_num(x) for x in conf]
                item["dias_fora_da_faixa"] = int(np.isnan(conf).sum())
                low = np.repeat(low_d, 24)
                up = np.repeat(up_d, 24)
            elif met["kind"] == "thresholds":
                low = np.full(len(t), -np.inf if met["cold"] is None else met["cold"])
                up = np.full(len(t), np.inf if met["hot"] is None else met["hot"])
            else:
                low = up = np.full(len(t), met["balance"])
            classes, perto = classificar(t, low, up)
            item["classes"] = classes
            item["contagem"] = {c: classes.count(c) for c in "qfns"}
            if met["kind"] == "adaptive":
                # Limites adaptativos não são números redondos: empate só por arredondamento.
                item["horas_a_menos_de_1e-9_do_limite"] = perto
            cidade["configuracoes"].append(item)
            print(f"{arq['id']:14s} {cfg['id']:24s} {item['contagem']}"
                  + (f" fora da faixa: {item['dias_fora_da_faixa']} dias;"
                     f" dif. pythermalcomfort: {item['dif_max_pythermalcomfort']:.3f}" if "tpma" in item else ""))
        saida["cidades"].append(cidade)
    # Efeito da escolha da temperatura da hora (relatório do F3.4): horas que mudam de classe.
    efeito = []
    for arq in manifesto["arquivos"]:
        tbs = ler_tbs(EPW_DIR / arq["arquivo"])
        tpma = media_predominante(medias_diarias(tbs), CONFIGURACOES[0]["metodo"]["running"])
        _, low_d, up_d = limites_adaptativos(tpma, 80)
        low, up = np.repeat(low_d, 24), np.repeat(up_d, 24)
        a, _ = classificar(temperatura_hora(tbs, "mean"), low, up)
        b, _ = classificar(temperatura_hora(tbs, "end"), low, up)
        muda = sum(1 for x, y in zip(a, b) if x != y)
        efeito.append({"id": arq["id"], "horas_que_mudam": muda,
                       "quentes_media": a.count("q"), "quentes_fim": b.count("q"),
                       "frias_media": a.count("f"), "frias_fim": b.count("f")})
        print(f"{arq['id']:14s} média × fim da hora: {muda} horas mudam de classe")
    saida["efeito_temperatura_da_hora"] = efeito
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(saida, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"gravado {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} kB)")


if __name__ == "__main__":
    main()

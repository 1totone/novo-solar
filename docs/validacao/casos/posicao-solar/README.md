# Referências de posição solar

Valores para os testes do F1.2 (tolerâncias em `docs/spec/02-tempo-e-posicao-solar.md`, seção 2.6).

| Arquivo | Conteúdo |
|---|---|
| `posicao.csv` | 3456 instantes: a cada 30 min, de 00:00 a 23:30 em hora legal, no dia 21 de cada mês de 2026, nos 6 locais de `../epw/manifesto.json`. Colunas: local, hora legal (ISO 8601 com fuso), UTC, ângulo zenital geométrico (sem refração), ângulo zenital aparente, azimute (a partir do Norte, horário), equação do tempo (min), ângulo horário (graus, sem redução; reduza para (−180°, 180°] antes de comparar). Instantes com o sol abaixo do horizonte também entram. |
| `nascer-por.csv` | nascer, pôr e passagem meridiana nos mesmos 72 dias (hora legal, frações de segundo). |
| `metadados.json` | versões do pvlib, pandas e numpy, ano, ΔT, pressão, temperatura e locais. |
| `caso-reda-andreas-2004.json` | exemplo publicado no relatório do NREL SPA, referência independente do pvlib. O pvlib 0.16.1 o reproduz com diferença menor que 10⁻⁶°. |

Gerado por `docs/validacao/scripts/gerar_posicao_solar.py` (pvlib `spa_python` e `sun_rise_set_transit_spa`, ΔT = 69 s). Para regenerar: instalar `docs/validacao/scripts/requirements.txt` num ambiente virtual e rodar o script; a saída deve ser idêntica.

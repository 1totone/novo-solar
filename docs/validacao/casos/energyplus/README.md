# Verificação contra o EnergyPlus (F3.8)

Gerado por `docs/validacao/scripts/energyplus_fracao_ensolarada.py` com o EnergyPlus 26.2.0 (pacote Linux oficial) e os EPWs de teste de `.cache/epw/`. Método, resultados e limitações do EnergyPlus no relatório `docs/validacao/relatorios/F3.8-energyplus.md`; critérios na spec 07, seção 7.10, e na decisão 0019 (proposta).

- `modelos/*.idf`: um modelo por cena (zona em caixa, janela na parede da frente, placas como *Shading:Building:Detailed*, ShadowCalculation por passo de tempo, 6 passos por hora, ano de 2026). Abrem no EP-Launch ou no IDF Editor; para simular, use o EPW do local da cena (lista `LOCAIS` no script).
- `fracao-ensolarada.json`: a referência usada por `tests/referencia/energyplus.test.ts`.
  - `locais`: cabeçalho dos EPWs (latitude, longitude, fuso, elevação).
  - `cenas[]`: geometria no formato da spec 07, seção 7.1 (`janela`, `dispositivos`, `orientacao`). Também traz:
    - `horaria`: *Surface Outside Face Sunlit Fraction* da janela, média dos 6 passos de cada hora (8760 valores, 5 casas);
    - `passos`: a mesma fração em cada passo dos dias de `dias_passos` (dias 1, 11 e 21 de cada mês, na ordem dia, hora, passo; 7 casas);
    - `cossenos`: 24 passos com os cossenos de incidência de saída (parede direita, janela e cobertura), que são as componentes do sol do EnergyPlus no referencial da fachada.
  - `resumo` e `sol_spa_x_energyplus`: estatísticas do script, calculadas com o shapely e o pvlib, independentes da aplicação.

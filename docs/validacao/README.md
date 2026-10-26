# Validação

Casos de referência e relatórios. Todo cálculo físico da aplicação precisa de pelo menos um caso aqui, com a referência independente e a tolerância da [spec](../spec/README.md).

## Estrutura

- `casos/`: entradas e valores de referência.
  - [`casos/epw/`](casos/epw/README.md): manifesto dos 6 EPWs de teste (TMYx 2011 a 2025; os arquivos são baixados por script, não versionados).
  - [`casos/solar-6.2/`](casos/solar-6.2/README.md): as 15 cidades, rosas de vento e lista de latitudes do SOL-AR 6.2, extraídas do instalador oficial, e um exemplo do formato de inclusão de cidade.
  - [`casos/posicao-solar/`](casos/posicao-solar/README.md): posição solar, nascer e pôr do sol com o pvlib (NREL SPA) e o caso publicado no relatório do SPA.
  - `casos/transferidor/solar62.csv`: 64 curvas do transferidor do 6.2 em 8 casos.
  - `casos/carta/linhas-horarias.csv`: 852 pontos das linhas horárias (hora solar verdadeira, 5 h a 19 h, dia 21 de cada mês, 6 locais), com o pvlib.
  - `casos/vento/rosas.json`: 150 rosas (Florianópolis, Porto Alegre e Belém; 8 e 16 setores; estações e períodos do dia), calculadas em Python puro.
  - `casos/mascara/tracado-raios.json`: 9 casos de janela com brise, aletas e grelha, 1500 direções do sol cada, classificadas por traçado de raios (sombra total, centro à sombra e fração sombreada).
  - `casos/classificacao/classificacao-horas.json`: médias diárias, temperatura média predominante, temperatura de conforto adaptativo e classe de cada hora nos 6 EPWs de teste (numpy e pythermalcomfort), F3.4.
  - `casos/indicadores/indicadores.json`: radiação direta incidente por classe de hora e percentuais (pvlib, shapely e DNI do EPW), F3.5.
  - `casos/energyplus/indicadores.json`: radiação direta incidente na janela com e sem as placas no EnergyPlus 26.2.0, com a decomposição das diferenças, F3.5.
  - `casos/dimensionamento/angulos.json`: ângulos exigidos no dimensionamento inverso em 5 casos, inclusive o tutorial da UFU (pvlib), F3.6.
  - `casos/carta/projecoes-analemas.json`: sol às horas legais em 9 locais (pvlib) e pontos das projeções equidistante e cilíndrica e do transferidor por fórmulas fechadas, F4.3.
  - `casos/energyplus/vento.json` e `casos/energyplus/modelos/vento.idf`: vento local de faixas de parede de 1,5 a 40 m nos 5 terrenos do EnergyPlus 26.2.0, F4.4.
  - `casos/vento/rosas-avancadas.json`: 420 rosas com o filtro pela condição térmica e a correção para a altura e o terreno (Python com numpy), F4.4.
- `relatorios/`: relatórios de validação (o que foi comparado, como, resultado e diferenças justificadas).
  - [`relatorios/F1.2-posicao-solar.md`](relatorios/F1.2-posicao-solar.md): SPA contra pvlib e contra o caso publicado.
  - [`relatorios/F1.3-carta-estereografica.md`](relatorios/F1.3-carta-estereografica.md): projeção, trajetórias, linhas horárias e estações.
  - [`relatorios/F2.2-transferidor.md`](relatorios/F2.2-transferidor.md): transferidor contra o código do SOL-AR 6.2.
  - [`relatorios/F2.3-mascara.md`](relatorios/F2.3-mascara.md): máscara pelos ângulos contra traçado de raios e o exemplo do tutorial do SOL-AR da UFU.
  - [`relatorios/F2.4-sobreposicao.md`](relatorios/F2.4-sobreposicao.md): cada hora dos EPWs de Florianópolis e Manaus na célula certa, com teste negativo de fuso.
  - [`relatorios/F2.5-rosa-dos-ventos.md`](relatorios/F2.5-rosa-dos-ventos.md): 150 rosas contra um cálculo independente em Python.
  - [`relatorios/F2.6-saidas.md`](relatorios/F2.6-saidas.md): escala da carta impressa (navegador e PDF rasterizado a 600 dpi) e exportações.
  - [`relatorios/F3.4-classificacao.md`](relatorios/F3.4-classificacao.md): classificação das horas contra numpy e o pythermalcomfort.
  - [`relatorios/F3.5-memoria-de-calculo.md`](relatorios/F3.5-memoria-de-calculo.md): indicadores calculados à mão em casos simples.
  - [`relatorios/F3.5-indicadores.md`](relatorios/F3.5-indicadores.md): indicadores contra pvlib e shapely e contra o EnergyPlus.
  - [`relatorios/F3.6-dimensionamento-inverso.md`](relatorios/F3.6-dimensionamento-inverso.md): ângulos contra o pvlib, ida e volta, minimalidade e o caso do tutorial da UFU.
  - [`relatorios/F4.3-projecoes.md`](relatorios/F4.3-projecoes.md): analemas contra o pvlib em 9 locais, projeções e transferidor contra fórmulas fechadas, regiões da máscara fora da estereográfica.
  - [`relatorios/F4.4-vento.md`](relatorios/F4.4-vento.md): fator da altura e do terreno contra o EnergyPlus 26.2.0 e 420 rosas com o filtro térmico contra um cálculo em Python.
- `scripts/`: scripts que geram ou baixam os valores de referência (Python), para que qualquer pessoa reproduza. Dependências em `scripts/requirements.txt`.

| Script | O que faz |
|---|---|
| `scripts/baixar_epw.py` | baixa os EPWs do manifesto para `.cache/epw/` e confere o SHA-256 (só biblioteca padrão) |
| `scripts/extrair_solar62.py` | extrai os CSVs do instalador do SOL-AR 6.2 |
| `scripts/gerar_posicao_solar.py` | gera as referências de posição solar com o pvlib |
| `scripts/gerar_linhas_horarias.py` | gera os pontos das linhas horárias em hora solar verdadeira com o pvlib |
| `scripts/transferidor_solar62.py` | reimplementa o desenho do transferidor do SOL-AR 6.2 (desmontado) e gera os casos de regressão |
| `scripts/gerar_referencia_epw.py` | gera a referência do leitor de EPW com o `pvlib.iotools.read_epw` |
| `scripts/mascara_tracado_raios.py` | traçado de raios com janela e placas reais para a máscara pelos ângulos (só biblioteca padrão) |
| `scripts/rosa_dos_ventos.py` | estatísticas da rosa dos ventos dos EPWs de teste (só biblioteca padrão) |
| `scripts/classificacao_horas.py` | classificação das horas (F3.4): médias com numpy, faixa adaptativa da ASHRAE 55 com o pythermalcomfort |
| `scripts/indicadores.py` | indicadores do F3.5 com pvlib, shapely e a DNI do EPW |
| `scripts/energyplus_indicadores.py` | radiação direta incidente na janela no EnergyPlus, com e sem as placas, e decomposição das diferenças |
| `scripts/dimensionamento_inverso.py` | ângulos exigidos no dimensionamento inverso (F3.6) com o pvlib |
| `scripts/gerar_projecoes_analemas.py` | analemas em hora legal com o pvlib e pontos das projeções e do transferidor por fórmulas fechadas (F4.3) |
| `scripts/energyplus_vento.py` | vento local por altura e terreno no EnergyPlus (F4.4; precisa do EnergyPlus 26.2.0, só biblioteca padrão) |
| `scripts/rosa_vento_avancado.py` | rosas com o filtro pela condição térmica e a correção para a altura e o terreno (F4.4), com numpy e a classificação de `classificacao_horas.py` |

## Referências independentes

| Módulo | Referência |
|---|---|
| Posição solar | pvlib (NREL SPA) e caso publicado no relatório do SPA |
| Máscaras | traçado de raios com janela e placas reais (máscara pelos ângulos, F2.3) e casos analíticos (ex.: brise horizontal infinito reproduz exatamente a curva α) |
| Fração ensolarada | EnergyPlus (Surface Outside Face Sunlit Fraction), com ShadowCalculation atualizado a cada passo de tempo |
| Radiação incidente | EnergyPlus (Surface Outside Face Incident Solar Radiation Rate per Area), explicitando o modelo de céu |
| Vento | estatísticas calculadas de forma independente em Python; correção para a altura e o terreno contra o EnergyPlus (Surface Outside Face Outdoor Air Wind Speed) |
| Regressão | modelo de cálculo do SOL-AR 6.2 e capturas de tela do 6.2 |

## O que já se sabe do SOL-AR 6.2

Detalhes em [`../referencias/diagnostico-solar-6.2.md`](../referencias/diagnostico-solar-6.2.md):

- Declinação de Cooper e equação do tempo de Spencer: erro de posição solar de até cerca de 1,1° (RMS 0,5°) contra efemérides; aceitável na escala do desenho, mas o novo usa o SPA.
- Meridiano padrão fixo em 45°W na conversão entre hora legal e hora solar: sobreposições deslocadas 1 h para dados em UTC−4 (inclusive a Concepción do instalador) e 2 h no Acre. Diferença esperada e documentada na regressão.
- Dados das 14 cidades TRY de 1951 a 1970, sem radiação medida na origem; vento com velocidade inteira, direção em passos de 10° e calmarias acima de 50% em algumas cidades.
- O seletor "Ângulo de Referência: Interna / Externa" muda a linha a partir da qual α, β e γ são medidos (spec, seção 1.3).

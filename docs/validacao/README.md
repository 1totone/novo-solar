# Validação

Casos de referência e relatórios. Todo cálculo físico da aplicação precisa de pelo menos um caso aqui, com a referência independente e a tolerância da [spec](../spec/README.md).

## Estrutura

- `casos/`: entradas e valores de referência.
  - [`casos/epw/`](casos/epw/README.md): manifesto dos 6 EPWs de teste (TMYx 2011 a 2025; os arquivos são baixados por script, não versionados).
  - [`casos/solar-6.2/`](casos/solar-6.2/README.md): as 15 cidades, rosas de vento e lista de latitudes do SOL-AR 6.2, extraídas do instalador oficial, e um exemplo do formato de inclusão de cidade.
  - [`casos/posicao-solar/`](casos/posicao-solar/README.md): posição solar, nascer e pôr do sol com o pvlib (NREL SPA) e o caso publicado no relatório do SPA.
- `relatorios/`: relatórios por portão de fase (o que foi comparado, como, resultado e diferenças justificadas).
- `scripts/`: scripts que geram ou baixam os valores de referência (Python), para que qualquer pessoa reproduza. Dependências em `scripts/requirements.txt`.

| Script | O que faz |
|---|---|
| `scripts/baixar_epw.py` | baixa os EPWs do manifesto para `.cache/epw/` e confere o SHA-256 (só biblioteca padrão) |
| `scripts/extrair_solar62.py` | extrai os CSVs do instalador do SOL-AR 6.2 |
| `scripts/gerar_posicao_solar.py` | gera as referências de posição solar com o pvlib |
| `scripts/gerar_referencia_epw.py` | gera a referência do leitor de EPW com o `pvlib.iotools.read_epw` |

## Referências independentes

| Módulo | Referência |
|---|---|
| Posição solar | pvlib (NREL SPA) e caso publicado no relatório do SPA |
| Máscaras | casos analíticos (ex.: brise horizontal infinito reproduz exatamente a curva α) |
| Fração ensolarada | EnergyPlus (Surface Outside Face Sunlit Fraction), com ShadowCalculation atualizado a cada passo de tempo |
| Radiação incidente | EnergyPlus (Surface Outside Face Incident Solar Radiation Rate per Area), explicitando o modelo de céu |
| Vento | estatísticas calculadas de forma independente em Python |
| Regressão | modelo de cálculo do SOL-AR 6.2 e capturas de tela do 6.2 |

## O que já se sabe do SOL-AR 6.2

Detalhes em [`../referencias/diagnostico-solar-6.2.md`](../referencias/diagnostico-solar-6.2.md):

- Declinação de Cooper e equação do tempo de Spencer: erro de posição solar de até cerca de 1,1° (RMS 0,5°) contra efemérides; aceitável na escala do desenho, mas o novo usa o SPA.
- Meridiano padrão fixo em 45°W na conversão entre hora legal e hora solar: sobreposições deslocadas 1 h para dados em UTC−4 (inclusive a Concepción do instalador) e 2 h no Acre. Diferença esperada e documentada na regressão.
- Dados das 14 cidades TRY de 1951 a 1970, sem radiação medida na origem; vento com velocidade inteira, direção em passos de 10° e calmarias acima de 50% em algumas cidades.
- O seletor "Ângulo de Referência: Interna / Externa" muda a linha a partir da qual α, β e γ são medidos (spec, seção 1.3).

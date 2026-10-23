# Especificação técnica

**Status:** v0, aprovada pelo Anthony no portão 0 (23/10/2026, decisão 0011). Cada módulo ganha detalhe no passo em que é implementado, sempre com referências e tolerâncias. O teste de referência de cada cálculo vem antes da implementação.

## Seções

1. [Convenções geométricas](01-convencoes-geometricas.md): azimute, orientação da fachada, referencial da fachada, α, β e γ nas referências interna e externa (com figuras), condições de sombra, curvas do transferidor, unidades.
2. [Tempo e posição solar](02-tempo-e-posicao-solar.md): hora legal, UTC e hora solar; convenção de hora do EPW; NREL SPA, ΔT, ano de referência, refração; tolerâncias contra o pvlib.
3. [Projeções e transferidor](03-projecoes.md): projeção estereográfica, inversa, imagem de círculos máximos, fórmulas das curvas do transferidor, impressão em escala.
4. [Dados climáticos](04-dados-climaticos.md): EPW (campos, unidades, códigos de ausente, checagens), CSV legado do SOL-AR 6.2, indicadores de qualidade.

## Resumo do que está fixado

- **Azimute:** a partir do Norte geográfico, sentido horário (0° = N, 90° = L).
- **Orientação da fachada:** azimute da normal externa; qualquer valor real, normalizado para [0, 360).
- **α, β, γ:** definidos como no SOL-AR 6.2, com as duas referências; externo = 90° − interno. α interno = AVS e β interno = AHS da INI-C.
- **Posição solar:** NREL SPA. Tolerância contra o pvlib: 0,01°.
- **Tempo:** o EPW está em hora padrão local; a conversão para UTC usa o fuso do cabeçalho, nunca um meridiano fixo. A hora solar verdadeira vem do ângulo horário.
- **Convenção do EPW:** a linha da hora h descreve o intervalo que termina em h. Radiação é a energia integrada nesse intervalo e é associada ao sol no meio dele (h − 0,5); temperatura e umidade são valores no instante h.
- **Projeção estereográfica:** r = R · tan(z/2); carta vista de cima, Norte para cima, Leste à direita.
- **Unidades:** SI (°C, m/s, W/m², Wh/m²); vírgula decimal na interface em português.

## Decisões do portão 0 (aprovadas em 23/10/2026)

| Ponto | Decisão | Onde |
|---|---|---|
| Referência padrão do transferidor ao abrir o programa | **Interna**: coincide com AVS/AHS da INI-C e com a aula do LabEEE; a externa continua a um clique | 01, seção 1.3 |
| Lado "direito" | à direita de quem está dentro olhando para fora (coincide com a direita do papel com a normal para cima); conferir no 6.2 | 01, seção 1.2 |
| Índices 1 e 2 de α, β, γ | brise afastado da parede: sombra entre a curva da aresta externa (1) e a da aresta interna (2); conferir no 6.2 antes de implementar | 01, seção 1.3 |
| ΔT | 69 s, fixo | 02, seção 2.3 |
| Ano de referência | 2026, não bissexto | 02, seção 2.3 |
| Refração | posições geométricas em toda a geometria; refração só no nascer e pôr do sol (h = −0,8333°) | 02, seção 2.4 |
| CSV exportado | ponto decimal e vírgula como separador, com cabeçalho que informa isso | 01, seção 1.5 |

## Módulos ainda não detalhados

Serão escritos no passo de cada módulo, com referências e testes:

- **Máscaras por geometria (F3.1 a F3.3):** janela e dispositivos (brise horizontal finito com afastamento e prolongamentos, aletas, grelha, lâminas inclinadas). Percentual sombreado: fração da área da janela (amostragem em grade) da qual a direção do sol está obstruída; curvas de 0, 25, 50, 75 e 100%.
- **Vento (F2.5, F4.4):** setores (8 ou 16), classes de velocidade, limiar de calmaria (a definir), filtros por período e condição térmica. Correção para altura e rugosidade como no EnergyPlus: V_z = V_met · (δ_met / z_met)^α_met · (z / δ)^α, com os parâmetros de terreno da *Engineering Reference*.
- **Classificação das horas (F3.4):** limiares editáveis; faixa do conforto adaptativo da ASHRAE 55 (T_conf = 0,31 · T_pma,ext + 17,8 °C; ±3,5 K para 80% e ±2,5 K para 90% de aceitabilidade; válida para 10 °C ≤ T_pma,ext ≤ 33,5 °C) como referência; temperatura de equilíbrio por tipologia. A temperatura externa é um indicador aproximado da necessidade de sombra, e a interface deve dizer isso.
- **Indicadores de sombreamento (F3.5):** radiação direta incidente na janela por hora, E = DNI · cos θ · f_ens (θ: ângulo de incidência; f_ens: fração ensolarada); parcelas bloqueada e admitida por classe de hora; difusa com fator de visão do céu na Fase 5.

## Tolerâncias de validação

| Grandeza | Referência | Tolerância |
|---|---|---|
| Posição solar (ângulo zenital e separação angular) | pvlib (NREL SPA) | 0,01° |
| Nascer, pôr e passagem meridiana | pvlib (SPA) | 10 s |
| Curvas do transferidor e de máscara em casos analíticos | solução analítica | 0,1° |
| Fração ensolarada horária | EnergyPlus, *Surface Outside Face Sunlit Fraction* | RMSE ≤ 0,02 |
| Estatísticas de vento | cálculo independente em Python | 0,1 ponto percentual |
| Escala de impressão | régua | ±1 mm no raio |

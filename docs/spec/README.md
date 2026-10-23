# Especificação técnica

**Status:** esqueleto. Cada seção será detalhada no passo F0.4 (convenções) e nos passos em que o módulo for implementado, sempre com referências e tolerâncias.

## Já fixado

- **Azimute:** a partir do Norte geográfico, sentido horário (0° = N, 90° = L).
- **Orientação da fachada:** azimute da normal externa.
- **Posição solar:** NREL SPA (Reda e Andreas, 2004). Tolerância contra pvlib: 0,01°.
- **Tempo:** os instantes do EPW estão em hora padrão local (sem horário de verão) e são convertidos para UTC com o fuso do cabeçalho do arquivo, nunca com meridiano fixo. A hora solar verdadeira, quando exibida, deriva do ângulo horário.
- **Convenção do EPW:** a linha da hora h descreve o intervalo que termina em h. Radiação é a energia integrada nesse intervalo e é associada à posição do sol no meio dele (h − 0,5); temperatura e umidade são valores no instante h.
- **Projeção estereográfica:** r = R·tan(z/2), com z o ângulo zenital; o horizonte fica em r = R.
- **Unidades:** SI (°C, m/s, W/m², Wh/m²).

## Estrutura prevista

1. **Convenções geométricas.** Definição exata de α1/α2, β1/β2 e γ1/γ2, com figuras, conforme a literatura (Bittencourt, *Uso das cartas solares*; Frota e Schiffer, *Manual de conforto térmico*) e o comportamento do SOL-AR 6.2; referência interna e externa do transferidor.
2. **Tempo e posição solar.** SPA, conversões de horário, nascer e pôr do sol, linhas horárias em hora solar e em hora legal (analemas).
3. **Projeções e transferidores.** Estereográfica (padrão), equidistante e cilíndrica; transferidor correspondente a cada uma; transformação inversa para cliques.
4. **Máscaras.**
   - Por ângulos (modo clássico): regiões total e parcial a partir de α, β e γ.
   - Por geometria: janela e dispositivos (brise horizontal finito com afastamento e prolongamentos, brises verticais, grelha, lâminas inclinadas). Uma aresta reta vista de um ponto define um plano que passa pelo observador, logo se projeta num arco de círculo máximo; na projeção estereográfica, círculos da esfera viram circunferências ou retas.
   - Percentual sombreado: fração da área da janela (amostragem em grade) a partir da qual a direção do sol está obstruída; curvas de 0, 25, 50, 75 e 100%.
5. **Dados climáticos.** Campos do EPW usados; leitura do CSV legado do SOL-AR; controle de qualidade (calmarias, resolução de direção e velocidade, índice de claridade horário implausível, lacunas, origem da separação direta/difusa).
6. **Vento.** Setores (8 ou 16), classes de velocidade, limiar de calmaria (a definir), filtros por período e condição térmica. Correção de velocidade para altura e rugosidade do terreno como no EnergyPlus: V_z = V_met·(δ_met/z_met)^α_met·(z/δ)^α, com parâmetros de terreno da Engineering Reference.
7. **Classificação das horas.** Limiares editáveis; faixa do conforto adaptativo da ASHRAE 55 (T_conf = 0,31·T_pma,ext + 17,8 °C; ±3,5 K para 80% e ±2,5 K para 90% de aceitabilidade; válida para 10 °C ≤ T_pma,ext ≤ 33,5 °C) como referência; temperatura de equilíbrio por tipologia. A temperatura externa é um indicador aproximado da necessidade de sombra, e a interface deve dizer isso.
8. **Indicadores de sombreamento.** Radiação direta incidente na janela por hora, E = DNI·cos θ·f_ens (θ: ângulo de incidência; f_ens: fração ensolarada); parcelas bloqueada e admitida por classe de hora; difusa com fator de visão do céu na Fase 5.
9. **Tolerâncias de validação.**

| Grandeza | Referência | Tolerância |
|---|---|---|
| Posição solar | pvlib (NREL SPA) | 0,01° |
| Curvas de máscara em casos analíticos | solução analítica | 0,1° |
| Fração ensolarada horária | EnergyPlus, Surface Outside Face Sunlit Fraction | RMSE ≤ 0,02 |
| Estatísticas de vento | cálculo independente em Python | 0,1 ponto percentual |
| Escala de impressão | régua | ±1 mm no raio |

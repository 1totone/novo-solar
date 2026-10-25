# 9. Indicadores de sombreamento

**Status:** proposta (núcleo de cálculo do F3.5), 25/10/2026. Escrita antes do portão 2, numa branch separada, sem interface. As escolhas que dependem do Anthony estão na seção 9.7 e na decisão 0021 (proposta), cada uma com a recomendação adotada no código enquanto isso.

Os indicadores dizem quanto da radiação solar direta que chegaria à janela uma proteção bloqueia nas horas quentes e quanto ela deixa entrar nas horas frias. Combinam a fração ensolarada hora a hora (seção 7.6), a radiação direta normal do arquivo climático e a classificação das horas (seção 8).

## 9.1 Radiação direta incidente na janela

Para a linha r do arquivo (hora h do dia d), com a DNI do arquivo em Wh/m² (energia por m² de plano normal ao sol, integrada no intervalo (h − 1, h], seção 2.2) e as amostras k = 0 a N − 1 da hora (seção 7.6; padrão N = 6, no meio de subintervalos de 10 min):

  E₀,r = DNI_r · C_r,  C_r = (1/N) Σ c_k
  E_r = DNI_r · C_e,r,  C_e,r = (1/N) Σ c_k · f_e,k
  B_r = E₀,r − E_r

com c_k = cos θ_k quando o sol está na janela (seno da altura e cos θ de pelo menos 10⁻⁵, seção 7.2) e 0 caso contrário, e f_e,k a fração ensolarada da janela na amostra k. E₀ é a radiação direta que chegaria ao vidro sem a proteção, E a que chega com ela e B a bloqueada, todas em Wh por m² de janela (média sobre a área da janela, porque f_e é uma fração de área). Para a energia na janela inteira, multiplica-se pela área W · H.

**Hipótese: DNI constante na hora.** A DNI do arquivo é a energia da hora inteira; sem outra informação, ela é tratada como uma irradiância constante ao longo da hora (DNI_r Wh/m² em 1 h), e cada amostra pondera a fração ensolarada pelo cosseno do ângulo de incidência daquele instante. O cos θ só entra quando é positivo (sol diante da fachada); com o sol atrás da fachada ou abaixo do horizonte, a amostra não contribui.

**Consequência nas horas do nascer e do pôr do sol.** Se o sol fica acima do horizonte só numa parte da hora, a energia DNI_r chegou toda nessa parte, mas a hipótese a distribui pela hora inteira, e a parte com o sol abaixo do horizonte não conta: E₀ e E ficam subestimados nessas horas pela fração da hora com o sol acima do horizonte. A alternativa, **DNI constante enquanto o sol está acima do horizonte** (C e C_e divididos pela fração das amostras com o seno da altura de pelo menos 10⁻⁵, em vez de N), conserva a energia da hora; fica como opção do núcleo, e o relatório do F3.5 mede a diferença. O EnergyPlus também não conserva a energia dessas horas (seção 9.6).

## 9.2 Indicadores por classe de hora

Com as classes da seção 8 (quente, fria, neutra, sem classe) e as somas no ano sobre as horas de cada classe:

| Indicador | Definição | Leitura |
|---|---|---|
| Radiação direta incidente sem proteção, por classe | Σ E₀ (kWh/m² de janela por ano) | o tamanho do problema em cada classe |
| **Percentual bloqueado nas horas quentes** | P_q = Σ_quentes B / Σ_quentes E₀ | 100% é o ideal |
| **Percentual admitido nas horas frias** | P_f = Σ_frias E / Σ_frias E₀ | 100% é o ideal |
| Radiação admitida e bloqueada por classe | Σ E e Σ B | para comparar em energia |

Se Σ E₀ de uma classe é zero (por exemplo, nenhuma hora quente com sol na janela), o percentual daquela classe fica indefinido, e não 0% nem 100%. As horas neutras e sem classe entram só nas somas, não nos dois percentuais. Linhas sem DNI (ausente) ficam fora de todas as somas e são contadas.

## 9.3 Comparação entre alternativas

Para a mesma janela, na mesma fachada e com a mesma classificação, cada alternativa de proteção (inclusive "sem proteção", com P_q = 0% e P_f = 100%) recebe P_q, P_f e as somas da seção 9.2. A comparação é a tabela desses valores, sem um índice único: juntar P_q e P_f num número exige pesar o calor evitado contra o calor perdido, o que depende do edifício (ganhos internos, envoltória, uso) e não da geometria. Uma alternativa **domina** outra quando tem P_q e P_f pelo menos iguais e um deles maior; a lista das alternativas não dominadas é a única ordenação que o núcleo oferece.

## 9.4 Ano de referência e arquivos com 29 de fevereiro

A fração ensolarada é calculada nas 8760 horas do ano de referência (2026, seção 2.3); cada linha do arquivo usa a hora de mesmo mês, dia e hora. Nas linhas de 29 de fevereiro (arquivos de anos bissextos), usa-se a fração ensolarada de 28 de fevereiro, na mesma hora: a declinação muda cerca de 0,4° por dia nessa época, e a diferença na fração ensolarada de um dia para o outro é da ordem das que a média de um mês já mistura. A DNI e a classe continuam as do próprio 29 de fevereiro.

## 9.5 Implementação

`src/core/shading/indicators.ts`: alinhamento da fração ensolarada às linhas do arquivo, radiação por hora, somas por classe, percentuais e comparação entre alternativas. Usa `hourlyShading` (seção 7.6) e `classifyHours` (seção 8).

## 9.6 Validação

**Memória de cálculo à mão** (`docs/validacao/relatorios/F3.5-memoria-de-calculo.md`): janela de 1 m × 1 m numa fachada Norte com brise horizontal infinito, de 0,5 m e de 1,0 m de profundidade, na altura da verga; seis horas com o sol em posições escolhidas (no plano da normal, oblíquo, atrás da fachada, abaixo do horizonte em parte da hora) e DNI e classes dadas. No brise infinito sem saturação, f_s = D · tan α_perfil / H e cos θ · tan α_perfil = sen h_sol, então a radiação bloqueada é DNI · (D / H) · sen h_sol, independentemente do azimute: um caso analítico simples para conferir a ponderação por cos θ.

| Grandeza | Referência independente | Tolerância |
|---|---|---|
| E₀, E, B por hora, somas por classe e percentuais nos casos à mão | memória de cálculo (fórmulas fechadas) | 10⁻⁹ relativo |
| Somas por classe e percentuais, ano inteiro | pvlib (SPA) e shapely para a fração ensolarada, DNI lida do EPW em Python e classes da referência do F3.4 (`docs/validacao/scripts/indicadores.py`), 4 cenas em 3 locais e 3 alternativas | 10⁻⁶ relativo nas somas; 10⁻⁶ nos percentuais |
| Radiação direta incidente na janela com e sem as placas | EnergyPlus 26.2.0, *Surface Outside Face Incident Beam Solar Radiation Rate per Area* (modelos do F3.8) | conferência da contabilidade (abaixo); diferenças do método explicadas, sem tolerância de aceitação |

**Diferenças conhecidas do EnergyPlus** (`WeatherManager.cc` e `HeatBalanceSurfaceManager.cc`, versão 26.2.0), que a comparação separa uma a uma:

1. **Interpolação da DNI.** O EnergyPlus põe o valor horário no meio da hora e interpola linearmente entre os meios de horas vizinhas, avaliando no fim de cada passo de tempo (`SetupInterpolationValues`, pesos `SolarInterpolation`). Com 6 passos por hora, a DNI do passo k da hora h é a combinação de DNI_(h−1), DNI_h e DNI_(h+1) com pesos (2/6, 4/6, 0), (1/6, 5/6, 0), (0, 1, 0), (0, 5/6, 1/6), (0, 4/6, 2/6) e (0, 3/6, 3/6). A média da hora é 1/12 · DNI_(h−1) + 3/4 · DNI_h + 1/6 · DNI_(h+1): cada hora fica com 3/4 da sua energia e recebe parte da das vizinhas. Na soma do ano a energia se conserva (fora dos passos com o sol abaixo do horizonte), mas muda de hora: 1/6 da DNI de cada hora vai para a hora anterior e 1/12 para a seguinte, e o produto pelo cos θ e pela fração ensolarada de outro instante muda o resultado. Aqui a DNI é constante na hora (seção 9.1).
2. **Posição do sol.** O EnergyPlus usa o sol do fim de cada passo, com a declinação e a equação do tempo do `SUN3` (seção 7.10); aqui, o SPA no meio de cada passo.
3. **Sol abaixo do horizonte.** O EnergyPlus zera a DNI nos passos com o sol abaixo do horizonte (`SunIsUp`), como a hipótese da seção 9.1.
4. **Radiação incidente.** A saída do EnergyPlus é DNI do passo · fração ensolarada · cos θ (`SurfQRadSWOutIncidentBeam`), a mesma grandeza de E por passo.

A comparação reproduz o EnergyPlus em Python (DNI interpolada, sol do `SUN3` e `SUN4`, fração ensolarada do próprio EnergyPlus) para conferir a contabilidade, e então troca uma diferença por vez até chegar ao método daqui.

## 9.7 Escolhas propostas (decisão 0021)

1. **DNI constante na hora**, com a fração ensolarada ponderada por cos θ nas amostras da hora (cos θ ≥ 0); DNI constante enquanto o sol está acima do horizonte como opção.
2. **Dois percentuais** (bloqueado nas horas quentes e admitido nas horas frias), com as somas em kWh/m² por classe; percentual indefinido quando a classe não recebe radiação direta.
3. **Comparação sem índice único**, com a lista das alternativas não dominadas.
4. **29 de fevereiro** com a fração ensolarada de 28 de fevereiro.
5. Só a radiação **direta**; a difusa com o fator de visão do céu fica para o F5.1.

## Referências

- U.S. DOE. *EnergyPlus 26.2.0*, código-fonte: `src/EnergyPlus/WeatherManager.cc` (`SetupInterpolationValues`, interpolação horária dos dados climáticos) e `src/EnergyPlus/HeatBalanceSurfaceManager.cc` (`SurfQRadSWOutIncidentBeam`).
- U.S. DOE. *EnergyPlus Auxiliary Programs*, formato EPW (radiação integrada na hora anterior).
- Olgyay, A.; Olgyay, V. *Solar control and shading devices*. Princeton: Princeton University Press, 1957 (avaliação de proteções pelo período a sombrear).

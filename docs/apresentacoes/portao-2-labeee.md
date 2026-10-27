# SOL-AR, nova versão (v0.5): resumo para a demonstração ao Prof. Lamberts e ao LabEEE

- Preparado em 24/10/2026, para o portão 2 do roteiro (`docs/ROADMAP.md`): "tudo o que o antigo faz, com dados atuais e erros corrigidos; demonstração para quem pediu e retorno registrado".
- Endereço atual (prévia): https://1totone.github.io/novo-solar/
- Código aberto (licença MIT): https://github.com/1totone/novo-solar
- Autoria: Anthony Aliardi, a pedido do Prof. Roberto Lamberts, com desenvolvimento assistido por IA. Créditos da versão original mantidos na tela "Sobre": pesquisa e desenvolvimento de Roberto Lamberts e Alexandra Albuquerque Maciel, programação de Edson T. Ono.

## 1. Em poucas palavras

A nova versão do Analysis SOL-AR roda no navegador, sem instalação, inclusive em tablet e celular. Ela mantém o método ensinado no Brasil (carta solar estereográfica, transferidor, α, β e γ nas referências interna e externa) e corrige os erros encontrados no 6.2. Ela também usa dados climáticos atuais e calcula a máscara a partir dos ângulos. Não há servidor nem coleta de dados: os arquivos do usuário são lidos só no navegador.

## 2. O que a v0.5 faz

| Passo | Funções |
|---|---|
| 1. Local | 16 cidades: as 15 do SOL-AR 6.2 e Manaus, com coordenadas, fuso e elevação da estação do aeroporto. Dados históricos do 6.2 (TRY de 1951 a 1970 ou 1961 a 1970; IWEC em Concepción) abertos com um clique, com selo, origem, período e avisos. Link para o arquivo recente de cada cidade (TMYx 2011 a 2025, Climate.OneBuilding.org). Leitura de EPW e do CSV antigo do SOL-AR, com ou sem cabeçalho de local. |
| Carta | Projeção estereográfica, posição do sol pelo NREL SPA, trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses (com o mês no poente), linhas horárias em hora solar verdadeira. |
| 2. Fachada | Qualquer orientação, inclusive negativa; transferidor sobre a carta. |
| 3. Proteção | α, β e γ nas referências interna (α = AVS e β = AHS da INI-C) e externa; índices 2 (brise afastado da parede); γ das aletas. Máscara calculada: sombra total (100%) e parcial (50%, medida do centro da janela). Desenho à mão, como no 6.2. |
| 4. Dados sobre a carta | Temperatura, umidade e radiação global, direta e difusa em células (quinzena × hora do arquivo), no fuso do arquivo; cor pela média ou pela frequência de horas acima de um limiar; faixas do 6.2, digitadas ou pelos percentis do arquivo; tabela dos valores. |
| Rosa dos ventos | Frequência por setor e classe de velocidade, ou velocidade média; 8 ou 16 setores; filtros por estação e período do dia; calmaria; tabela; avisos sobre a resolução do arquivo e sobre a estação ser de aeroporto. |
| 5. Imprimir e exportar | Impressão em escala (raio em cm, padrão de 6 cm como no 6.2) com régua de 5 cm; só o transferidor, para imprimir em transparência; SVG, PNG e CSV dos dados mostrados; copiar imagem; comparação lado a lado de duas configurações. |
| Link | O endereço guarda a configuração inteira (local, fachada, ângulos, dados mostrados): basta copiá-lo para mandar a um colega ou a uma turma. |

## 3. Links de exemplo

Abrem prontos, sem carregar arquivo:

| Exemplo | O que mostra | Link |
|---|---|---|
| Recife: o método completo | Fachada noroeste (315°) com brise de α = 50° (referência interna) e a frequência de horas acima de 25 °C dos dados históricos no primeiro semestre: as horas quentes de tarde ficam fora da sombra. | https://1totone.github.io/novo-solar/#a1=50&dado=tbs&hist=1&limiar=25&local=recife&modo=freq&o=315 |
| Florianópolis: radiação direta | Fachada norte com brise de α = 40° e a radiação direta normal dos dados históricos sobre a carta. | https://1totone.github.io/novo-solar/#a1=40&dado=dni&hist=1&local=florianopolis&o=0 |
| Florianópolis: vento no verão | Rosa dos ventos de dezembro a fevereiro, dados históricos. | https://1totone.github.io/novo-solar/#aba=rosa&estacao=dez-fev&hist=1&local=florianopolis |
| Manaus: fuso UTC−4 | Fachada oeste com brise (α = 30°) e aletas dos dois lados (β = 30°). Manaus não estava no 6.2; com o arquivo recente carregado, as horas caem na posição certa no fuso de Manaus (o 6.2 as deslocaria 1 h). | https://1totone.github.io/novo-solar/#a1=30&bd1=30&be1=30&local=manaus&o=270 |

**Dados recentes:** no passo 1, o link "Baixar dados recentes" leva ao arquivo TMYx da cidade; descompactado, o `.epw` é carregado no mesmo passo. Com "Comparar lado a lado" (passo 5), os dados históricos e os recentes aparecem um ao lado do outro.

## 4. O que foi validado e contra quê

Todo cálculo físico tem um teste automático contra uma referência independente, com tolerância documentada na especificação (`docs/spec/`). Os relatórios estão em `docs/validacao/relatorios/`.

| O quê | Referência independente | Resultado |
|---|---|---|
| Posição do sol | pvlib (NREL SPA) em 6 locais de −1,4° a −36,8° de latitude, fusos UTC−3 e UTC−4; caso publicado do SPA | diferença máxima de 7 × 10⁻⁹° (tolerância de 0,01°); nascer, pôr e passagem meridiana a 0,001 s |
| Carta | pvlib (1722 posições nas trajetórias e 852 nas linhas horárias); solstícios e equinócios do U.S. Naval Observatory | 7 × 10⁻⁹° nas trajetórias; 0,0008° nas linhas horárias; datas a menos de 0,5 min |
| Transferidor | o código do próprio 6.2, desmontado: 8 casos, 64 curvas | iguais (diferença menor que 10⁻⁹ na carta de raio 1) |
| Máscara pelos ângulos | traçado de raios com janela e placas reais, 9 casos com 1500 direções do sol cada; exemplo do tutorial do SOL-AR da UFU em Brasília | nenhuma direção classificada errada onde o método é exato; nos demais casos, nunca maior que a sombra real |
| Dados sobre a carta | posição do sol de cada hora do EPW, calculada à parte, em Florianópolis (UTC−3) e Manaus (UTC−4) | todas as horas com sol na célula certa; com o fuso deslocado 1 h (o erro do 6.2), nenhuma |
| Rosa dos ventos | cálculo independente em Python (150 rosas); rosas pré-calculadas do 6.2 | diferença menor que 10⁻⁶ ponto percentual; com as estações do 6.2, até 0,5 ponto |
| Leitura dos arquivos | pvlib nos EPWs de teste; módulo `csv` do Python nos 16 CSV do 6.2 | iguais campo a campo |
| Impressão em escala | PDF rasterizado a 600 dpi | raio de 6 cm com até 0,1 mm de diferença |
| Regressão contra o 6.2 | modelo de cálculo do 6.2 reconstruído do executável, nas 15 cidades | diferenças explicadas na seção 5 |
| Interface | testes de ponta a ponta em computador e celular; revisão antes do teste com usuários (heurísticas, acessibilidade, robustez com 21 arquivos, desempenho) | 3 problemas graves achados e corrigidos (`docs/ux/F2.9-revisao-antes-do-teste.md`) |

## 5. Diferenças conhecidas em relação ao SOL-AR 6.2

Todas vêm da leitura do executável do 6.2 (`docs/referencias/diagnostico-solar-6.2.md` e relatório do F2.8):

| Item | SOL-AR 6.2 | Nova versão | Efeito |
|---|---|---|---|
| Fuso | converte a hora legal com o meridiano fixo de 45° O, para qualquer arquivo | usa o fuso do cabeçalho do arquivo | no 6.2, dados de UTC−4 (Manaus, Concepción) ficam deslocados 1 h na carta, e os do Acre (UTC−5), 2 h |
| Hora dos dados | desenha o valor da hora h no instante h − 1 | temperatura e umidade no instante h; radiação integrada de h − 1 a h | o 6.2 desenha a temperatura cerca de 1 h antes e a radiação cerca de 30 min antes |
| Equação do tempo | constante, −2,9 min (um parâmetro zerado antes do cálculo) | do SPA, dia a dia | somada ao meridiano fixo, a hora solar dos dados do 6.2 erra de −19 a +11 min ao longo do ano |
| Declinação das trajetórias | 7 valores fixos (±0,41, ±0,35, ±0,18 e 0 rad) | SPA em cada data (12 trajetórias) | até 1,7° de diferença nas trajetórias de abril e agosto |
| Semestres | dias 1 a 171 e 172 a 365 | 22/12 a 21/06 e 22/06 a 21/12 | 10 dias de dezembro mudam de semestre |
| Valor ausente | vale 0 (cor da faixa mais baixa) | "sem dados" | Concepción não tem radiação direta: o 6.2 a pinta inteira na faixa mais baixa |
| Rosa dos ventos | arquivos pré-calculados, com estações astronômicas | calculada do arquivo, estações pelos meses | de 2,6 a 13,6 pontos percentuais por setor; a escolha das estações fica para este portão |
| Máscara | pintada à mão sobre as curvas | calculada pelos ângulos; desenho à mão mantido | a região sai igual à do traçado de raios |
| Radiação dos dados históricos | as colunas vieram de um modelo com o sol na longitude de Florianópolis (48,34° O) | mostrada como está, com avisos na tela | em Recife a radiação chega cerca de 54 min depois do sol real |
| Orientação | só valores positivos | qualquer valor | −30° = 330° |

## 6. Limitações da v0.5

- Ainda não há máscara calculada pela geometria do brise, nem quantificação do efeito do sombreamento (Fase 3).
- Os dados recentes precisam ser baixados pelo usuário: arquivos de terceiros não são embutidos até a confirmação dos termos de uso (decisão 0010). Os EPWs do LabEEE (INMET) dependem de autorização (seção 9).
- A radiação dos dados históricos é estimada por modelo, com o deslocamento de horário descrito acima; a tela avisa.
- Só em português, sem funcionamento offline e sem guia de ajuda (Fase 4).
- No celular funciona, mas fica apertado com dados sobre a carta, e os rótulos da carta são pequenos sem zoom.
- O vento é o da estação meteorológica (aeroporto, 10 m de altura), sem correção de altura e rugosidade (Fase 4).
- O teste com alunos e um professor (F2.9) ainda vai ser aplicado; a impressão em escala foi conferida em PDF e falta a medida com régua em papel.

## 7. Próximos passos

| Fase | Versão | Conteúdo |
|---|---|---|
| 3. Máscara calculada e quantificação | v0.8 | Janela e dispositivos pelas dimensões (brise finito, aletas, grelha, lâminas inclinadas); máscara exata e curvas de 0 a 100% de sombra; fração ensolarada hora a hora e mapa mês × hora; classificação das horas (conforto adaptativo como referência); radiação direta bloqueada nas horas quentes e admitida nas frias; dimensionamento inverso; vista 3D; verificação contra o EnergyPlus. O núcleo de cálculo do F3.1 ao F3.3 já foi adiantado e conferido contra referências independentes, à espera deste portão. |
| 4. Dados, didática e lançamento | v1.0 | Catálogo nacional (TMYx e INMET) com mapa e qualidade dos arquivos; comparação de climas (TRY, recente e futuro); outras projeções e analemas; modo didático com exercícios; espanhol e inglês; acessibilidade; instalável e offline; ajuda; teste de usabilidade com 10 a 15 alunos. |
| 5. Avançado | v2.0 | Radiação difusa com máscara; exportação para o EnergyPlus; AVS, AHS e AOV da INI-C; entorno; zona da NBR 15220-3. |

## 8. Proposta de endereço (ROADMAP, seção 7.1)

O programa é um site estático: arquivos prontos, sem servidor nem banco de dados. Três caminhos:

| Caminho | O que o LabEEE faz | Prós | Contras |
|---|---|---|---|
| Link na página atual do SOL-AR | adiciona um botão para o endereço do GitHub | nenhum trabalho técnico | endereço do GitHub, que não é permanente |
| **Subdomínio (recomendado)**, ex.: solar.labeee.ufsc.br | pede à TI da UFSC um registro DNS, uma única vez | endereço oficial e permanente; hospedagem gratuita, HTTPS e atualização automática continuam no GitHub | depende da TI criar o registro |
| Pasta no servidor do LabEEE, ex.: labeee.ufsc.br/solar | copia a pasta do build a cada versão | tudo dentro da UFSC | cada atualização exige uma nova cópia |

**Como fica o subdomínio:**

1. A TI da UFSC cria o registro `solar.labeee.ufsc.br. CNAME 1totone.github.io.` (o nome do subdomínio é sugestão).
2. Recomendado: um registro TXT de verificação do domínio no GitHub, que impede que outra conta use o subdomínio. O GitHub informa o nome e o valor do registro.
3. Nas configurações do repositório (Pages, domínio personalizado), o subdomínio é cadastrado e o HTTPS é ativado. O certificado é emitido sem custo.
4. Se o repositório passar depois para uma organização do LabEEE no GitHub, só o destino do CNAME muda; o endereço público continua o mesmo.

O build já é portátil (caminhos relativos, estado no `#` do endereço): funciona sem mudanças em qualquer um dos três caminhos, o que foi verificado por teste automático servindo o site numa subpasta qualquer.

## 9. Pendências que dependem do LabEEE

1. **EPWs do INMET:** os arquivos climáticos do LabEEE podem ser embutidos na aplicação, como os dados históricos do 6.2? Em que termos (citação, versão)? Sem isso, o usuário baixa os arquivos à parte (decisões 0010, 0013 e 0017).
2. **Radiação dos CSV do 6.2:** o LabEEE sabe quem gerou as colunas de radiação e com que modelo? A análise indica um sol fixo em 48,34° O (relatório do F2.7).
3. **Numeração pública e nome:** "SOL-AR 7"? A numeração interna segue 0.x até o lançamento (v1.0). E quando trocar o link do 6.2 no site do LabEEE.
4. **Endereço:** o subdomínio da seção 8 (pedido à TI da UFSC).
5. **Manutenção:** se e quando o repositório passa para uma organização do LabEEE no GitHub (o projeto foi montado para isso).
6. **Arquivos climáticos futuros** (LabEEE e INPE), para a comparação de climas da Fase 4.
7. **Exportação para o EnergyPlus na v1.0?** A proposta é deixar as saídas para EnergyPlus, INI-C e NBR 15220-3 na v2.0 (decisão 0037). A exportação para o EnergyPlus (F5.2) é a de menor custo, porque o arranjo da verificação contra o EnergyPlus (F3.8) já gera e roda os modelos; trazê-la para a v1.0 atrasa o lançamento o tempo desse passo.

## 10. Roteiro sugerido para a demonstração (15 a 20 min)

1. Abrir o endereço e escolher Recife: a carta aparece com as trajetórias e o mês de cada uma.
2. Fachada noroeste (315°), brise de α = 50°: a sombra total em vermelho; trocar para a referência externa.
3. Abrir os dados históricos, mostrar origem, período e avisos; temperatura acima de 25 °C por frequência.
4. Baixar e carregar o arquivo recente de Recife; comparar lado a lado com o histórico.
5. Rosa dos ventos no verão.
6. Imprimir a carta com 6 cm de raio, só com o transferidor (transparência), e conferir com a régua impressa.
7. Copiar o endereço e abrir em outra aba: a mesma configuração.
8. Mostrar a tabela da seção 5 (diferenças em relação ao 6.2) e a da seção 4 (validação).

## 11. Retorno a registrar no portão

- Impressão geral e o que falta para substituir o 6.2 no site do LabEEE.
- Radiação dos dados históricos: manter como está, com avisos (decisão 0017)?
- Estações da rosa dos ventos: pelos meses (como agora) ou astronômicas, como as rosas do 6.2?
- Endereço (seção 8) e numeração pública.
- Prioridades da Fase 3 e uso em disciplinas.
- As respostas sobre as pendências da seção 9.

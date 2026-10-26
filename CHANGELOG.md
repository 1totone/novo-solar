# Changelog

Todas as mudanças relevantes do projeto. Formato baseado no [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versões seguem o [SemVer](https://semver.org/lang/pt-BR/), com 0.x durante o desenvolvimento.

## [Não lançado]

### Adicionado

- Protocolo do teste formal de usabilidade do F4.9 (`docs/ux/F4.9-protocolo-de-usabilidade.md`): 10 a 15 alunos de arquitetura, 10 tarefas do fluxo básico e avançado da v1.0 com respostas de referência, tamanho da amostra pela meia largura do IC da SUS, plano de análise com a definição operacional do critério "SUS ≥ 70" do portão 4 (decisão 0026, proposta: média de pelo menos 70, sempre com o intervalo de confiança); e rascunho do pacote para o comitê de ética (`docs/etica/`): enquadramento normativo (Resolução CNS nº 510/2016, Lei nº 14.874/2024, LGPD), textos para a Plataforma Brasil, TCLE, instrumentos, carta de anuência, orçamento e cronograma, com o que falta conferir ou preencher.
- Conferência do F2.3 com as figuras do tutorial do SOL-AR da UFU (Bortoli e Saramago), obtido no site do LabEEE: a zona total pintada no 6.2 na Figura 27 coincide com a máscara calculada pelos ângulos do tutorial (6277 pixels; trocar os lados de γ ou tirar o α2 não reproduz a figura), e a Figura 13 confirma o período (ano todo, das 9 h às 15 h em hora solar). A Figura 26 mede o α2 do brise afastado a partir do peitoril: com o brise desenhado, um traçado de raios independente não acha nenhuma posição de maio a julho com sombra total, ao contrário do que o tutorial conclui; o F2.3 mantém o α2 medido da verga (relatório do F2.3, seção 2).
- Material da demonstração do portão 2 (`docs/apresentacoes/portao-2-labeee.md`): o que a v0.5 faz, links de exemplo prontos (Recife, Florianópolis e Manaus), o que foi validado e contra quê, diferenças conhecidas em relação ao 6.2, limitações, próximos passos, proposta de subdomínio e pendências que dependem do LabEEE.
- Revisão antes do teste com usuários (`docs/ux/F2.9-revisao-antes-do-teste.md`): avaliação pelas heurísticas de Nielsen nas 9 tarefas do roteiro, acessibilidade (axe-core, teclado, contraste), robustez com 21 arquivos (inválidos, incompletos e com fusos de −5 a +5,5) e desempenho no celular com CPU e rede limitadas; 20 achados com gravidade e destino.
- Roteiro do primeiro teste com usuários (`docs/ux/F2.9-teste-com-usuarios.md`): 9 tarefas com respostas de referência, questionário SUS, folha de registro por participante e planilha de consolidação.
- Regressão contra o SOL-AR 6.2 (`docs/validacao/relatorios/F2.8-regressao.md`): modelo de cálculo do 6.2 reconstruído por desmontagem (`docs/validacao/scripts/modelo_solar62.py`) e comparado com a nova versão nas 15 cidades. Achados no 6.2: dados desenhados 1 h antes (temperatura) ou 30 min antes (radiação), equação do tempo constante, trajetórias com declinação aproximada (até 1,7°), rosas pré-calculadas com estações astronômicas e setor Norte estreito no cálculo de cidade incluída. Teste automatizado da rosa contra os arquivos do 6.2.
- Cidades e dados (decisão 0017): catálogo com as 15 cidades do SOL-AR 6.2 e Manaus, com coordenadas da estação do aeroporto e link para o arquivo recente (TMYx 2011 a 2025); dados históricos do 6.2 (TRY de 1961 a 1970 ou 1951 a 1970, IWEC em Concepción) publicados com a aplicação e abertos com um clique, com selo, origem, período e avisos sobre a radiação; importação do CSV antigo do SOL-AR, com ou sem cabeçalho de local (sem presumir o fuso), em UTF-8 ou Latin-1; período de registro do EPW quando o arquivo informa; valores ausentes por campo. Leitor do CSV conferido contra o módulo `csv` do Python nos 15 arquivos do 6.2.
- Passo 5, "Imprimir e exportar": impressão em escala (raio em cm, padrão 6) com régua de 5 cm e opções do que incluir, inclusive só o transferidor para transparência; exportação em SVG (com o tamanho da impressão), PNG e CSV dos dados mostrados; copiar imagem; comparação lado a lado de duas configurações.
- Tabela dos valores das células da carta, legível sem mouse.
- Rosa dos ventos (`src/core/wind/`, `src/ui/wind/`), numa aba ao lado da carta: frequência por setor e classe de velocidade com a calmaria no centro, ou velocidade média por setor; 8 ou 16 setores; filtros por estação e período do dia; resolução da velocidade com aviso de viés; tabela (decisão 0016). Conferida contra um cálculo independente em Python.
- Dados sobre a carta (`src/core/overlay/`, `src/ui/overlay/`): temperatura, umidade e radiação global, direta e difusa em células por quinzena e hora do arquivo, no fuso do arquivo; média ou frequência acima de um limiar; faixas padrão (as do 6.2 onde existiam), digitadas ou pelos percentis do arquivo; legenda e valores da célula sob o cursor (decisões 0013 e 0015). Conferido hora a hora contra os EPWs de Florianópolis e Manaus.
- Celular e tablet em pé: carta fixa no topo e passos rolando por baixo.
- Máscara pelos ângulos (`src/core/mask/`, `src/ui/mask/`): sombra total (100%, vermelha) e parcial (50%, amarela, ângulos medidos do centro da janela) calculadas a partir de α, β e γ, com índices 2 (brise afastado), γ das aletas e desenho à mão em "Mais opções" (decisão 0014). Conferida por traçado de raios em 9 casos e pelo exemplo do tutorial do SOL-AR da UFU em Brasília.
- Transferidor sobre a carta (`src/core/protractor/`, `src/ui/protractor/`): orientação da fachada (qualquer valor, inclusive negativo), referência interna e externa, α, β e γ à direita e à esquerda, índices 1 e 2, grade como a do SOL-AR 6.2. Passos "Fachada" e "Proteção" na tela, com o estado no link. Curvas conferidas contra o código do 6.2.
- Releases criadas pelo workflow `release.yml` a partir do CHANGELOG (decisão 0012).
- Wireframes navegáveis da Fase 2 (`.../wireframes/`), aprovados com ajustes (decisão 0013): fluxo em passos, sobreposição por células quinzenais, faixas do 6.2 e classes de vento.
- Spec 05: sobreposição de dados na carta (células como áreas, quinzenas, semestres pelos solstícios).

### Alterado

- As 6 cidades de teste dão lugar ao catálogo de cidades; os links antigos continuam abrindo o mesmo local.
- As mensagens de erro do cabeçalho de arquivos climáticos indicam a linha.
- O estado no `#` da URL passa a ser atualizado sem criar uma entrada no histórico a cada mudança.
- O transferidor mantém os índices 1 e 2 na ordem digitada (aresta externa e interna), em vez de ordená-los como o 6.2.
- Os campos avançados do passo "Proteção" ficam em "Mais opções", que não se fecha mais ao apagar um campo.
- Com dados sobre a carta, a máscara de sombra é desenhada em hachura.

### Corrigido

- O arquivo de teste `teste-hora.csv` do F2.8 (486 kB) deixa de ser copiado para o build; um teste confere que só os dados históricos das cidades do catálogo são publicados. Achado 19 da revisão antes do teste com usuários.
- CSV do SOL-AR salvo pelo Excel em português (ponto e vírgula entre os campos): mensagem própria, que cita o separador e a linha, no lugar de "a linha 2 deveria trazer o local". Achado 12 da revisão antes do teste com usuários.
- Fuso fracionário, positivo ou zero mal escrito no título da carta e na impressão: "UTC6" e "UTC+6" para +5,5 e "UTC0" para Lisboa passam a "UTC+5,5" e "UTC", como no painel do local. Os fusos do Brasil continuam escritos como antes. Achado 11 da revisão antes do teste com usuários.
- Celular: a carta fixa no topo não toma mais a tela. Com a tabela das células aberta, ou numa tela de até 600 px de altura (celular deitado ou pequeno), a carta rola com a página; antes, a área fixa passava de 85% da tela e escondia os passos e as linhas de baixo da tabela. Legendas mais compactas, dica curta na tela de toque e legenda da máscara só com os tipos de sombra presentes.
- Trajetórias da carta sem identificação: cada uma ganha o mês no poente, logo fora do horizonte (jan/nov, fev/out, mar/set, abr/ago, mai/jul, jun e dez; datas simétricas em relação ao solstício de junho têm quase a mesma trajetória e dividem o rótulo). Os pontos cardeais ficam um pouco mais afastados para não encostar nos rótulos. Achado da revisão antes do teste com usuários (as tarefas 1 e 3 do roteiro dependem de achar 21/6 e 21/12).
- Rosa dos ventos em branco: o contorno dos rótulos dos anéis tinha a largura em unidades do desenho e cobria as cunhas desde o F2.5. Um teste de ponta a ponta passa a conferir as cores da rosa na tela, e não só a presença do desenho.

## [0.1.0] - 2026-10-23 (v0.1, Esqueleto funcional)

Portão 1 aprovado pelo Anthony.

### Adicionado

- Interface mínima: escolha de uma das 6 cidades de teste ou leitura de um arquivo EPW no navegador (nada é enviado), com latitude, longitude, fuso, elevação e origem visíveis; mensagens de erro para arquivos inválidos; carta do local escolhido; o link reabre o mesmo local.
- Carta solar estereográfica (`src/core/chart/`, `src/ui/chart/`): horizonte, círculos de altura, azimutes, trajetórias nos solstícios, nos equinócios e no dia 21 dos outros meses, linhas horárias em hora solar verdadeira; solstícios e equinócios calculados pelo SPA. Prévia na página inicial, para Florianópolis.
- Posição solar pelo NREL SPA (`src/core/solar/`): ângulo zenital, azimute, ângulo horário, declinação, equação do tempo, nascer, pôr e passagem meridiana; conversão entre hora legal e UTC com o fuso do EPW e instantes das horas do EPW (fim e meio do intervalo). Conferida contra o pvlib e contra o caso publicado do SPA.
- Leitor de EPW (`src/core/epw/`): cabeçalho, 8760 ou 8784 horas, códigos de ausente, checagens de sequência e de valores, com mensagens de erro em português que indicam linha e campo. Conferido contra o `pvlib.iotools.read_epw` nos 6 EPWs de teste.
- CI baixa os EPWs de teste (com cache) e roda os testes de referência.

## [0.0.0] - 2026-10-23 (v0.0, Fundação)

Portão 0 aprovado pelo Anthony (decisão 0011).

### Adicionado

- Dados e casos de referência (`docs/validacao/`): manifesto e script de download dos 6 EPWs de teste, dados do SOL-AR 6.2 extraídos do instalador, posição solar de referência com o pvlib e o caso publicado do NREL SPA.
- Especificação v0 (`docs/spec/`): convenções geométricas com α, β e γ nas referências interna e externa do SOL-AR 6.2 (figuras e diagramas originais), tempo e posição solar (SPA, fuso do EPW, convenção de hora), projeção estereográfica e curvas exatas do transferidor, formato dos dados climáticos e tolerâncias.
- Estrutura técnica: Vite, React e TypeScript (strict), com `src/core/` (cálculos puros) separado de `src/ui/` e a separação verificada pelo ESLint; Prettier, Vitest e Playwright.
- Página "em construção" com a tela "Sobre" e os créditos da versão original; textos pela estrutura de tradução (português) e estado da tela no `#` da URL.
- CI no GitHub Actions (formatação, estilo, tipos, testes de unidade, build e ponta a ponta em computador e celular) e publicação no GitHub Pages com prévia de cada PR.
- Fundação do projeto: `CLAUDE.md` com as regras de trabalho, roteiro em `docs/ROADMAP.md`, decisões iniciais em `docs/decisoes/`, diagnóstico do SOL-AR 6.2, esqueletos da especificação e da validação, estacionamento de ideias.

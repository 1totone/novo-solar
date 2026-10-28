# 0047. Fontes de dados no passo 1: o que pintar e a comparação

- Data: 2026-10-27
- Status: proposta (itens e, f e h da decisão 0044; escolhas do Claude sem base clara, marcadas abaixo). Pela 0050 (28/10/2026), a lista de rádios das fontes vira uma lista de escolha, com "Abrir arquivo" e "Comparar" ao lado; o resto continua.

## Contexto

No piloto do F2.9 (`docs/ux/F2.9-piloto-P0.md`), os dados confundiram em quatro pontos: não ficou claro como mostrar na carta os dados do SOL-AR 6.2 (problema 5: abria-se no passo 1 e pintava-se no passo 4); não houve como ver se as horas quentes mudaram com o arquivo recente (problema 6); a rosa dos ventos disse que não havia dados depois da tarefa 6 (problema 7); e o arquivo carregado sumia ao voltar para a lista de cidades (problema 8). O Anthony pediu (decisão 0044): o que pintar oferecido ali mesmo, com um nome claro para os dados do 6.2 (item e); os dados históricos e cada arquivo carregado à escolha, mesmo depois de trocar de cidade e voltar (item f); e um botão visível, onde os dados aparecem, para comparar com outro arquivo e ver a diferença (item h).

## Decisão

1. **"Dados horários" no passo 1**, um grupo de opções no lugar do botão "Abrir dados históricos": "Só a carta, sem dados horários", "Dados do SOL-AR 6.2 (ano de referência de 1951 a 1970)" (ou "de 1961 a 1970"; em Concepción, "(arquivo IWEC)") e cada arquivo carregado que seja do mesmo lugar ("Arquivo …epw (dados de 2011 a 2025)", com o período do cabeçalho quando o arquivo o informa). O link dos dados recentes e o campo para carregar outro arquivo ficam logo abaixo.
2. **Proposta: o arquivo vai com a cidade quando é dela.** Um arquivo é da cidade quando o nome traz o código da estação (os TMYx do Climate.OneBuilding.org) ou, sem código, quando o cabeçalho fica a até 0,1° de latitude e de longitude, com o mesmo fuso (o critério da diferença entre climas, spec 05, seção 5.5). A lista de cidades continua na cidade, e o arquivo aparece entre os dados dela. Um arquivo de outro lugar entra na lista de cidades, num grupo "Arquivos carregados".
3. **Os arquivos ficam só na memória da página**, como antes: continuam à escolha enquanto ela estiver aberta, e o arquivo de projeto (F4.7) guarda os que estão em uso. O link reabre a carta e diz qual arquivo falta, como antes.
4. **"Pintar na carta" no passo 1**, com os dados abertos: a mesma lista de variáveis do passo 4. O semestre, as faixas e as horas acima de um limiar continuam no passo 4, com um botão "Abrir o passo 4" ao lado.
5. **"Comparar com outros dados" no passo 1**, com os dados abertos: guarda a configuração de agora como A (a comparação do F2.6) e, **proposta**, já liga a diferença B − A na carta (F4.2); a pessoa escolhe acima os dados de B, e a carta mostra a diferença assim que B tem dados do mesmo lugar. A frase abaixo do botão diz de onde vêm os dados da A. O botão do passo 5 ("Comparar lado a lado") continua, sem a diferença ligada.
6. **Tutorial:** a etapa dos dados passa a realçar o passo 1. Ajuda: o guia rápido e o tutorial descrevem o novo caminho.

## Alternativas consideradas

- **O botão "Abrir dados históricos" com o seletor de variável ao lado:** resolve o item e, mas não o f; um grupo de opções mostra de uma vez o que há para escolher e qual está aberto.
- **Separar o lugar da fonte de dados** (a cidade numa lista, os dados de qualquer arquivo em outra): permitiria pintar na carta de Recife os dados de outro lugar, o que mistura clima e geometria solar de locais diferentes.
- **Guardar os arquivos no navegador** (IndexedDB) para que voltem ao reabrir a página: útil, mas é armazenamento de dados do usuário sem ele pedir; fica para o arquivo de projeto, que já faz isso de forma explícita.
- **Comparar lado a lado por padrão:** mostra as duas cartas, mas a pergunta da tarefa 6 ("as horas quentes mudaram?") se responde de uma vez pela diferença; o lado a lado fica a um clique ("Diferença B − A na mesma carta").

## Consequências

- Interface: `src/ui/SitePanel.tsx`, `src/ui/data/sources.ts` (com teste de unidade) e a lista dos arquivos da sessão no `App`.
- Testes de ponta a ponta (`e2e/fontes.spec.ts`): dados do 6.2 e temperatura pelo passo 1, com pixels da célula; o arquivo de Recife com a cidade, depois de trocar de cidade e voltar; o arquivo de outro lugar na lista de cidades; a comparação com a diferença na carta (pixels da célula em azul, B mais frio); teclado, axe e celular. Os testes que abriam os dados pelo botão antigo passam a usar o grupo de opções.
- Página do teste (decisão 0042): as tarefas 5, 6 e 7 ficam mais curtas no caminho, sem mudar o que pedem; os textos da tarefa 6 mudam no PR do item j.

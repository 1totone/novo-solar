# 0044. Redesenho depois do piloto do F2.9

- Data: 2026-10-27
- Status: aceita (decisão do Anthony, 27/10/2026, depois do piloto P0). As escolhas de detalhe marcadas como **proposta** são do Claude, sem base clara, e podem ser revistas no teste com participantes ou no portão 2.

## Contexto

O Anthony fez o teste sem moderador (decisão 0042) como piloto (`docs/ux/F2.9-piloto-P0.md`): 12 problemas, 6 de gravidade 3. O que mais atrapalhou foi o leiaute: com os cinco passos abertos ao mesmo tempo, a coluna passa de 4.500 px no computador, e cada tarefa começava rolando a página. Os outros vêm de ler a carta, de digitar a fachada, de entender os ângulos, de achar os dados e a comparação, e de entender o link.

O teste com participantes ainda não foi aplicado, e a `main` está congelada até ele. Redesenhar a `main` e depois a integração da Fase 4 (que já contém a `main` e a Fase 3) seria fazer o trabalho duas vezes.

## Decisão

1. **O redesenho é feito sobre a integração da Fase 4** (`claude/fase-3-4-integracao-ro4t5b`, PR #51), um PR por item, com o mesmo padrão de qualidade (testes de ponta a ponta com pixels, axe, teclado e celular). A `main` continua congelada; tudo entra nela depois, pelo plano de integração (`docs/lancamento/plano-de-integracao-e-versoes.md`).
2. **O teste com participantes passa a ser aplicado na prévia dessa integração**, em `https://1totone.github.io/novo-solar/pr/51/teste/`, com a ferramenta da integração no iframe. Isso muda o item 1 da decisão 0042 (a ferramenta deixa de ser a da `main`); o resto da 0042 continua valendo.
3. **Itens do redesenho** (a a j do pedido do Anthony):
   - (a) **Passos em acordeão**, um aberto por vez; cada passo fechado mostra uma linha de resumo (por exemplo "Recife (PE) · dados de 1951 a 1970", "Fachada 315° (NO)", "Brise α 50° · referência externa"); a carta sempre à vista ao lado no computador e fixa no topo no celular. "Simples primeiro" continua valendo: os passos avançados seguem recolhidos no grupo "Avançado".
   - (b) **Leitura da carta**: passar o mouse ou tocar mostra altura, azimute, data e hora no ponto.
   - (c) **Fachada por rumos**: botões N, NE, L, SE, S, SO, O e NO; "NO" e as outras siglas aceitas no campo; o rumo por extenso ao lado do número.
   - (d) **Desenho dos ângulos**: corte e planta pequenos que mostram onde se mede α, β e γ, nas referências interna e externa, atualizados com os valores digitados; AVS e AHS saem do texto principal e ficam na ajuda e no glossário.
   - (e) **Dados na carta a partir do passo 1**: ao abrir os dados históricos, escolher ali mesmo o que pintar (temperatura, radiação); nome "Dados do SOL-AR 6.2 (ano de referência de 1951 a 1970)".
   - (f) **Fontes de dados que não somem**: os dados históricos e cada arquivo carregado ficam disponíveis para escolher, inclusive depois de trocar de cidade e voltar.
   - (g) **O .zip do TMYx carregado direto**, sem descompactar, por uma biblioteca pequena, sem servidor.
   - (h) **Comparação onde os dados aparecem**: um botão para comparar com outro arquivo e ver a diferença.
   - (i) **"Compartilhar" no cabeçalho**: copia o link e diz que ele reabre a mesma análise.
   - (j) **Página do teste e roteiro**: tamanho real do .zip; tarefa 8 como "salvar em PDF ou imagem para usar na aula" (a impressão em escala continua na ferramenta); tarefa 9 com um texto que se entenda; o roteiro com moderador igual.

### Detalhes do acordeão (item a)

4. **Mecânica:** cada passo é um `details` com o cabeçalho no `summary` (o mesmo dos passos avançados desde a decisão 0023), aberto e fechado pela aplicação: abrir um fecha o que estava aberto. Teclado: Tab chega a cada cabeçalho, Enter e Espaço abrem e fecham. O conteúdo de um passo fechado não fica na página (nem na árvore de acessibilidade); o que foi escolhido está no link e volta ao abrir.
5. **Proposta: passo aberto ao chegar.** O do tutorial (F4.5), quando há tutorial; o 3 num exercício de máscara; o passo avançado que o link traz (7, 6 ou as projeções); senão o 1. O passo aberto não vai para o link: o mesmo link abre os mesmos resumos.
6. **Proposta: botão "Próximo: passo n, nome"** no fim dos passos 1 a 4, que abre o seguinte e põe o foco no cabeçalho dele. Custa uma linha por passo e mantém o caminho básico em sequência para quem não percebe que os cabeçalhos abrem os passos.
7. **Proposta: resumos.** Passo 1: o local e de onde vêm os dados horários (dados do SOL-AR 6.2 com o período, arquivo com o período de registro, ou "só a carta"); 2: orientação e rumo, e "sem transferidor" quando oculto; 3: α do brise, β das aletas e γ (esquerda/direita) da sombra total, "e mais ângulos" quando há algo em "Mais opções", e a referência quando é a externa; 4: variável, semestre e o limiar da frequência; 5: raio e o que entra na folha. Os avançados mantêm os resumos que já tinham. Com o passo aberto, o resumo some (o conteúdo diz o mesmo).
8. **A carta fica sempre à vista no computador** (fixa ao lado dos passos, rolando por dentro quando é mais alta que a tela), e não só com um passo avançado aberto, como na decisão 0023. No celular, continua fixa no topo como na decisão 0013, com o limite de altura do achado 3 da revisão.
9. **O atalho entre passos (decisão 0040) continua só com o passo 6 ou o 7 aberto**: cada número abre o passo (fechando o atual) e põe o foco no cabeçalho; o aberto fica marcado. A marcação pela rolagem sai, porque o passo atual é o aberto.

## Alternativas consideradas

- **Redesenhar a `main` primeiro e depois a Fase 4:** o trabalho seria feito duas vezes, com conflitos em `App.tsx`, nos painéis e nos catálogos de texto em cada um dos três ramos.
- **Abas no lugar do acordeão:** escondem os resumos dos outros passos, que são o que deixa ver o estado inteiro sem rolar.
- **Vários passos abertos ao mesmo tempo:** é o leiaute que o piloto reprovou; o Anthony pediu um por vez.
- **Passo aberto no link:** o link mudaria a cada clique num cabeçalho, sem mudar a análise, e a tarefa 9 do teste passaria a depender de um detalhe que não é a análise.

## Consequências

- Decisão 0023: os passos 1 a 5 deixam de ficar "sem mudança"; a 0044 substitui esse ponto. A 0013 (carta fixa no topo do celular) continua.
- Decisão 0038 (resultados ao lado): continua, mas os passos 6 e 7 não ficam abertos juntos; o painel da direita mostra os resultados do passo aberto.
- Decisão 0040: o atalho continua, sem a marcação pela rolagem (item 9).
- Decisão 0042: o teste mede a ferramenta da integração da Fase 4, já redesenhada (item 2). Os resultados dos participantes respondem se o redesenho resolveu os problemas do piloto.
- Testes de ponta a ponta: os que mexem nos passos 1 a 5 abrem o passo antes (`e2e/fixtures/steps.ts`); novos testes do acordeão (`e2e/acordeao.spec.ts`).
- Os PRs dos itens b a j registram as próprias propostas em decisões seguintes, quando houver escolha sem base clara.
- Orçamento do JavaScript inicial (decisão 0039): o redesenho acrescenta código ao caminho básico. Para continuar abaixo de 480 kB, a aba da rosa dos ventos passa a ser carregada só quando escolhida, como a da vista 3D (de 477,7 para 468,6 kB).

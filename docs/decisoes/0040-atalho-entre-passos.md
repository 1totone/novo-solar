# 0040. Atalho entre passos com os passos avançados abertos

- Data: 2026-10-26
- Status: proposta (na integração da Fase 3; a confirmar com o Anthony no portão 3, com a decisão 0023)

## Contexto

Na inspeção visual da prévia da Fase 4, com os passos 6 e 7 abertos, a página passava de 7.900 px no computador (1366 × 900), e voltar do passo 7 ao passo 2 ou 4 exigia rolar várias telas. No caminho básico (passos 1 a 5, sem passo avançado aberto), a página é curta e o problema não existe; o atalho não pode complicar esse caminho (princípio 1).

## Decisão (proposta)

1. **Uma barra "Passos 1 2 3 4 5 6 7"** que **só aparece com o passo 6 ou o 7 aberto**. No caminho básico, nada muda na tela.
2. **No computador**, a barra fica fixa no alto da coluna dos passos; **no celular**, fixa no pé da tela (o alto já é da carta), com botões de 40 px.
3. **Cada número rola até o passo** e põe o foco no título dele (nos passos 6 e 7, no resumo que abre e fecha o passo), descontando a carta fixa no celular e a própria barra no computador. O número do passo em que se está fica marcado (`aria-current="step"`).
4. **Sem estado no link** e sem atalho de teclado novo: a barra é uma lista de botões comum (Tab e Enter), com o nome do passo no nome acessível ("Ir ao passo 4, Dados climáticos na carta").

## Alternativas consideradas

- **Recolher os passos 1 a 5** quando um avançado abre: muda o caminho básico e esconde a máscara e os dados que o passo 6 usa.
- **Barra sempre visível**: acrescenta um elemento ao caminho básico, que não precisa dele.
- **Links "voltar ao topo" e "próximo passo"** no fim de cada passo: dois cliques ou mais para ir do 7 ao 2, e mais texto em cada passo.
- **Atalhos de teclado (1 a 7)**: invisíveis para quem não lê a ajuda e conflitam com a digitação nos campos.

## Consequências

- Novo componente `src/ui/layout/StepNav.tsx`; a interface dos passos não muda.
- Teste de ponta a ponta `e2e/atalho-passos.spec.ts`: ausência no caminho básico, ida a cada passo sem o título ficar coberto, passo atual marcado, barra no pé da tela do celular.
- Se os passos ganharem outra numeração, a lista de passos do componente acompanha.

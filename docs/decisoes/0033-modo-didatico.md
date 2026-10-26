# 0033. Modo didático: tutorial guiado e exercício de máscara com métrica em ângulo sólido (F4.5)

- Data: 2026-10-26
- Status: proposta (F4.5 na branch de integração da Fase 4; a confirmar com o Anthony no portão 4)

## Contexto

O ROADMAP pede, no F4.5, um tutorial guiado, um modo exercício ("o aluno desenha a máscara e a ferramenta compara com a calculada") e textos curtos de apoio em cada tela. A instrução da sessão pede a métrica do exercício documentada. A comparação entre a máscara desenhada e a calculada não tem métrica padrão na literatura de ensino de cartas solares; o SOL-AR 6.2 não tinha exercício.

## Decisão (proposta)

1. **Tutorial guiado** em 8 etapas pelo caminho básico, com o caso de Brasília do tutorial da UFU, para continuar nos exemplos resolvidos da ajuda (decisão 0032). Cartão no alto dos passos (`tutorial=<etapa>`), aberto pela ajuda numa nova aba; cada etapa realça o painel em que o aluno vai mexer, diz quando a ação foi feita e oferece "Fazer por mim". Os textos de cada etapa são os **textos curtos de apoio** do caminho básico; os passos avançados já têm a sua introdução na tela.
2. **Exercícios de máscara**: 4 casos (brise infinito, brise com γ, aletas, grelha) dados pelos ângulos; o link do exercício traz o local e a fachada, sem os ângulos, e a carta mostra o transferidor sem a resposta. O aluno desenha com o desenho à mão que já existia (passo 3); "Conferir" compara e desenha a resposta hachurada sobre o desenho.
3. **Métrica** (spec 12, seção 12.3): índice de Jaccard (interseção sobre união) entre a região desenhada e a calculada, **em ângulo sólido** no céu diante da fachada, com a sombra que faltou e a sombra a mais relativas à região calculada; como complemento, o mesmo índice **nas posições do sol do ano** (a cada 30 min). Ângulo sólido, e não área na carta, porque a carta estereográfica aumenta as áreas perto do horizonte até 4 vezes: a medida não deve depender da projeção.
4. **Leitura proposta**, sem fonte: 90% ou mais, "coincide"; de 75% a 90%, "quase"; abaixo, "desenhe de novo". O número fica sempre visível, para o professor usar outro critério.
5. A conferência roda num web worker (as posições do sol do ano levam cerca de 0,5 s), com as posições guardadas por local.

## Alternativas consideradas

- **Área na carta (pixels):** simples, mas muda com a projeção e pesa o horizonte até 4 vezes mais que o zênite.
- **Só as horas de sol:** pesa o que importa para o sombreamento, mas ignora erros em partes do céu por onde o sol não passa, que ainda são erros de desenho da máscara; fica como complemento.
- **Acertos em pontos sorteados ou nos vértices:** fácil de explicar, mas instável com poucos pontos e sem sentido físico claro.
- **Desenhar o exercício pela geometria (corte da janela):** mais completo, mas mistura duas habilidades (achar os ângulos e desenhar a máscara); pode virar um segundo nível de exercícios.

## Consequências

- `src/core/mask/compare.ts` (ângulo sólido e Jaccard), `src/ui/didactic/` (tutorial, exercícios, cartões, worker); parte "Exercícios" na ajuda e botão do tutorial no guia rápido; chaves `tutorial`, `exercicio` e `conferir` no link.
- Testes: casos analíticos da métrica (cunhas da esfera, π − 2α e π/2 − β; brises encaixados) e contagem independente pelo ângulo de perfil (`tests/referencia/exercicioMascara.test.ts`); condições e "Fazer por mim" do tutorial; ponta a ponta com o desenho feito pelo mouse.
- Os limites de 90% e 75% e a escolha dos 4 exercícios ficam para a revisão do Anthony (e de um professor) no portão 4; o teste com alunos do F4.9 pode medir se ajudam.

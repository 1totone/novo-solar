# 12. Modo didático: tutorial guiado e exercício de máscara

**Status:** proposta (F4.5, decisão 0033), 26/10/2026, na branch de integração da Fase 4.

O modo didático tem duas partes: um **tutorial guiado** pelo caminho básico (passos 1 a 5), com um texto curto para cada tela, e um **exercício** em que o aluno desenha à mão a máscara de uma proteção dada pelos ângulos e a aplicação compara o desenho com a máscara calculada. Esta seção fixa o tutorial, os exercícios e a métrica da comparação.

## 12.1 Tutorial guiado

- Aberto pela ajuda numa nova aba, com `tutorial=<n>` no link (n de 1 ao número de etapas); o resto do link começa vazio (Florianópolis, fachada Norte, como ao abrir a aplicação).
- Cada etapa tem um título, um texto curto (até três frases) e, quando pede uma ação, uma condição sobre o estado do link que diz se ela foi feita (com tolerância a formas equivalentes: vírgula decimal, 390° = 30°) e um "Fazer por mim" que aplica a ação. O aluno pode avançar sem fazer a ação.
- A etapa realça o painel ou a aba a que se refere (contorno) e o traz para a tela.
- Etapas: (1) o que a ferramenta faz; (2) local: escolher Brasília; (3) a carta: zênite, horizonte, trajetórias e linhas horárias; (4) fachada: orientação de 30°; (5) transferidor e α: α = 55°, referência interna; (6) γ: direita 50° e esquerda 60°; (7) dados: abrir os dados históricos e pintar a temperatura; (8) imprimir e próximos passos (exemplo resolvido 1, exercícios, passos avançados). O caso é o de Brasília do tutorial da UFU, para continuar nos exemplos resolvidos da ajuda (decisão 0032).

## 12.2 Exercícios

Cada exercício fixa um local, a orientação da fachada, a referência dos ângulos e os ângulos da sombra total de uma proteção (seção 1.6). O link do exercício (`exercicio=<id>`) traz o local, a orientação e a referência, mas **não os ângulos**: a carta mostra o transferidor com as curvas de 10 em 10 graus e nenhuma máscara calculada. O aluno desenha a região de sombra total com "Desenhar à mão" (passo 3, tipo "Total"); o desenho fica no link (`dt`), como no uso normal.

| Exercício | Local | Fachada | Proteção (referência interna) |
|---|---|---|---|
| `brise` | Florianópolis | 0° (Norte) | brise horizontal infinito, α = 45° |
| `brise-gama` | Florianópolis | 0° | brise com limites, α = 40°, γ direita = 40°, γ esquerda = 40° |
| `aletas` | Florianópolis | 270° (Oeste) | aletas infinitas, β direita = 30°, β esquerda = 30° |
| `grelha` | Brasília | 30° | grelha, α = 50°, β direita = 30°, β esquerda = 30° |

"Conferir" (`conferir=1` no link) calcula a métrica da seção 12.3 e desenha a máscara calculada na carta, hachurada sobre o desenho do aluno, com a legenda das duas. Se o aluno mudar a orientação, a comparação continua na orientação do exercício, e o cartão avisa.

## 12.3 Métrica da comparação

Sejam C a região de sombra total calculada (seção 1.6, com os ângulos do exercício) e A a região desenhada pelo aluno (união dos polígonos de `dt`, com arestas retas na carta estereográfica, seção 3.5.3), as duas recortadas ao céu diante da fachada: Q = {direções acima do horizonte e diante da fachada} (um quarto da esfera, ângulo sólido π).

**Coincidência da forma (interseção sobre união, índice de Jaccard) em ângulo sólido:**

  J_Ω = Ω(A ∩ C) / Ω(A ∪ C),

com Ω o ângulo sólido. É a medida principal: não depende da projeção da carta (a estereográfica aumenta as áreas perto do horizonte até 4 vezes em relação ao zênite) e trata todas as direções do céu igualmente. Junto dela:

- **sombra que faltou:** Ω(C \ A) / Ω(C), parte da máscara calculada que o desenho deixou de fora;
- **sombra a mais:** Ω(A \ C) / Ω(C), região desenhada onde a proteção não sombreia a janela inteira, relativa ao tamanho da máscara calculada.

**Coincidência nas horas de sol:** o mesmo índice sobre as posições do sol do ano de referência, a cada 30 minutos (no meio de cada meia hora, em hora legal), diante da fachada e acima do horizonte no local do exercício: J_sol = n(A ∩ C) / n(A ∪ C). Pesa cada direção pela frequência com que o sol passa por ela: um erro numa parte do céu por onde o sol nunca passa não conta. Mostrada como complemento.

**Cálculo numérico.** Ω vem de uma grade de direções quase uniforme em ângulo sólido (espiral de Fibonacci com N = 60 000 pontos na esfera, dos quais cerca de 15 000 caem em Q): Ω(R) ≈ π · n(R ∩ Q) / n(Q). Cada direção é levada à carta estereográfica (x = L / (1 + C), y = N / (1 + C), com L, N e C as componentes Leste, Norte e Cima) e testada contra as regiões, com as mesmas funções que desenham a máscara. Com N = 60 000, o erro de J_Ω nos casos de referência fica abaixo de 0,005 (seção 12.4).

**O que a métrica pesa.** Em ângulo sólido, um erro de desenho perto do zênite pesa até 4 vezes mais que o mesmo erro, medido na carta, perto do horizonte (dΩ/dA = 4 cos⁴(z/2) na carta de raio 1). Um exemplo dos testes: um desenho que segue bem a curva de α = 45° mas fecha o polígono 1° acima da linha da fachada, em vez de sobre ela, perde uma faixa fina que passa pelo zênite e fica com cerca de 93% de coincidência; fechado sobre a linha da fachada, passa de 95%.

**Casos sem região.** Se C e A forem vazias, J não é definido; se só A for vazia, J = 0 e a sombra que faltou é 100%.

**Leitura proposta** (decisão 0033): J_Ω de 90% ou mais, "a máscara coincide com a calculada"; de 75% a 90%, "quase: veja as diferenças na carta"; abaixo de 75%, "confira as curvas do transferidor e desenhe de novo". Os limites são uma proposta didática, sem fonte; o número fica sempre visível.

## 12.4 Validação

Casos analíticos (`tests/referencia/exercicioMascara.test.ts`), com a métrica da aplicação:

| Caso | Valor exato | Tolerância |
|---|---|---|
| Ω do brise infinito, α externo | π − 2α (cunha entre o plano da fachada e o plano inclinado de α, de ângulo diedro 90° − α) | 0,5% |
| Ω da aleta infinita, β externo | π/2 − β (metade superior da cunha entre a fachada e o plano vertical de β) | 0,5% |
| J_Ω entre dois brises infinitos, α1 < α2 (regiões encaixadas) | (π − 2α2) / (π − 2α1) | 0,005 |
| J_Ω entre o brise de α e o desenho do aluno com 25 vértices sobre a curva de α | próximo de 1 | ≥ 0,99 |
| Desenho vazio | J = 0, sombra que faltou = 100% | exato |
| J_sol entre dois brises infinitos | contagem independente pelo ângulo de perfil do sol (tan α_sol = tan h / cos ψ, seção 1.3), nas mesmas posições | exato |

Tutorial e exercícios de ponta a ponta (`e2e/didatico.spec.ts`): etapas, condições, "Fazer por mim", realce; desenho de um polígono pelo mouse, conferência com o número esperado e a hachura da resposta na carta; teclado, axe e celular.

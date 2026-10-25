# F3: fluxo e wireframes da Fase 3

- Data: 2026-10-25
- Status: **proposta**, aceita provisoriamente para seguir com a interface na branch de integração da Fase 3 (decisão 0023). O Anthony revisa antes de a Fase 3 entrar na `main`.
- Página navegável: `public/wireframes/fase-3.html`, publicada em `.../wireframes/fase-3.html` (na prévia da branch de integração).

## Princípio que manda

"Simples primeiro": o fluxo básico (local, carta, transferidor, máscara) não fica mais complicado. Os passos 1 a 5 continuam com os mesmos números, textos e posições; quem não abre o que é da Fase 3 vê a mesma tela de hoje. Isso também protege o teste com usuários do F2.9 e o portão 2, que usam a tela atual.

## Fluxo

Básico, sem mudanças: **1. Local** → **2. Fachada** → **3. Proteção** (α, β, γ) → **4. Dados sobre a carta** → **5. Imprimir e exportar**.

Avançado, recolhido, depois do passo 5:

- **6. Proteção pelas dimensões** (F3.1, F3.2, F3.3 e F3.6). Só precisa do local (posição do sol e fuso), não do arquivo climático.
  - Janela (largura, altura, recuo do vidro) e peças (brise horizontal, aletas, lâminas horizontais e verticais), em metros.
  - Corte e vista desenhados na hora, exportáveis em SVG na escala escolhida, com cotas.
  - Na carta: curvas de 0, 25, 50, 75 e 100% da janela à sombra e, como opção, a máscara de um ponto da janela.
  - Sombra ao longo do ano: mapa mês × hora do percentual da janela sombreado pela proteção, com as horas sem sol na janela hachuradas.
  - Dimensionar pelo período: datas e horas (hora solar por padrão), ângulos exigidos com o ponto da carta que determina cada um e as dimensões das peças; botões para usar os ângulos no passo 3 ou as peças no passo 6.
- **7. Efeito no ano** (F3.4 e F3.5). Precisa dos dados horários.
  - Horas quentes e frias: método (faixa adaptativa da ASHRAE 55, limiares ou temperatura de equilíbrio), com as hipóteses sempre visíveis e a contagem das classes só nas horas com sol na janela.
  - Indicadores: radiação direta bloqueada nas horas quentes e admitida nas horas frias, com as somas por classe.
  - Alternativas: guardar a proteção atual e comparar numa tabela, sem índice único, marcando as superadas.
- **Aba "Vista 3D"** (F3.7), entre "Carta solar" e "Rosa dos ventos": sol, janela, peças e sombra, com data e hora; a biblioteca 3D só é carregada quando a aba abre.

## Propostas

| Nº | Proposta | Situação |
|---|---|---|
| 1 | Passos 1 a 5 inalterados; a Fase 3 em dois passos novos (6 e 7), recolhidos, abaixo do 5, sob o título "Avançado" | proposta |
| 2 | Passo 6 só com o que depende da geometria e do local (inclui o mapa mês × hora e o dimensionamento pelo período); passo 7 com o que depende do clima | proposta |
| 3 | Medidas em metros, com vírgula decimal; cada campo diz de onde é medido (plano da fachada, verga, lateral) | proposta |
| 4 | Curvas de 0 a 100% como linhas azul-petróleo com o percentual escrito, a de 100% com preenchimento leve; convivem com a máscara pelos ângulos do passo 3 (vermelha e amarela), e cada camada pode ser ocultada | proposta |
| 5 | Máscara de um ponto como opção, com o ponto escolhido na vista (clique) ou digitado (x, z); padrão no centro da janela | proposta |
| 6 | Mapa mês × hora com o percentual sombreado pela proteção nas horas com sol na janela (decisão 0018) e as horas sem sol hachuradas; tabela equivalente e CSV | proposta |
| 7 | Dimensionamento pelo período dentro do passo 6, com o período desenhado na carta (área verde, como a Figura 13 do tutorial da UFU) e avisos em texto quando a peça não serve | proposta |
| 8 | No passo 7, as hipóteses de cada número na própria tela; percentuais das classes só nas horas com sol na janela e ponderados pela radiação, nunca nas 8760 horas | proposta |
| 9 | Alternativas guardadas no link; "sem proteção" sempre na tabela como referência | proposta |
| 10 | Vista 3D numa aba, carregada sob demanda; a fração ensolarada mostrada é a do cálculo, e um teste confere a imagem contra ela | proposta |
| 11 | Corte e vista na impressão do passo 5 como opção, na escala escolhida | proposta |
| 12 | Cálculos do ano (sol nas 52 560 amostras, sombra hora a hora, curvas, indicadores, dimensionamento) num web worker, com cache por local | proposta |

## O que o Anthony deve conferir

1. Se a Fase 3 deve mesmo ficar fora da numeração básica (passos 6 e 7 recolhidos) ou se prefere um modo "avançado" que troque a tela inteira.
2. Se o mapa mês × hora e o dimensionamento pelo período ficam bem no passo 6 (geometria) ou se preferiria tudo o que é "avaliação" junto no passo 7.
3. As cores das curvas (azul-petróleo) e do mapa (um tom, do claro ao escuro), que ficam provisórias até a paleta da Fase 4, como a máscara do F2.3.
4. O texto das hipóteses do passo 7, que repete a spec 08 (seção 8.6) e a spec 09.

## Alternativas consideradas

- **Inserir os passos da Fase 3 entre o 3 e o 4:** mudaria a numeração do fluxo básico e o roteiro do F2.9.
- **Um modo "básico/avançado" para a tela inteira:** é o que o ROADMAP sugere no princípio 1, mas duas telas diferentes dobram o que testar e o que explicar; os passos recolhidos dão o mesmo efeito com menos mudança.
- **Mapa mês × hora e indicadores em abas ao lado da carta:** no celular as abas competem com a carta fixa no topo; dentro dos passos, rolam com o resto.
- **Uma página separada para a Fase 3:** perderia a carta sincronizada com a geometria, que é o que liga o método de ensino (transferidor) à máscara calculada.

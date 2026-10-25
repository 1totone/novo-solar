# 0023. Interface da Fase 3 (fluxo e wireframes)

- Data: 2026-10-25
- Status: proposta (aceita provisoriamente para construir a interface na branch de integração da Fase 3; a confirmar com o Anthony antes de integrar na `main`)

## Contexto

A Fase 3 acrescenta a proteção descrita pelas dimensões (F3.1), as curvas de percentual sombreado e a máscara de um ponto (F3.2), a fração ensolarada hora a hora e o mapa mês × hora (F3.3), a classificação das horas (F3.4), os indicadores e a comparação de alternativas (F3.5), o dimensionamento pelo período (F3.6) e a vista 3D (F3.7). O núcleo de cálculo já existe (decisões 0018 a 0022). O Anthony pediu, como no F2.1, uma proposta de fluxo e wireframes antes da interface, com a regra "simples primeiro": o fluxo básico atual não muda, e o que é da Fase 3 fica recolhido ou num passo próprio. A `main` está congelada no caminho das 9 tarefas do teste com usuários (F2.9), e a interface da Fase 3 é feita numa branch de integração até o portão 2.

## Decisão (proposta)

Detalhes e wireframes em `docs/ux/F3-fluxo-e-wireframes.md` e `public/wireframes/fase-3.html`.

1. **Passos 1 a 5 inalterados**, com a mesma numeração e os mesmos textos. A Fase 3 entra em dois passos novos, **6. Proteção pelas dimensões** e **7. Efeito no ano**, recolhidos, abaixo do 5, sob o título "Avançado". Abrem sozinhos quando o link já traz uma janela.
2. **Passo 6** reúne o que depende só da geometria e do local: janela, peças, corte e vista (SVG exportável em escala), curvas de 0, 25, 50, 75 e 100% e máscara de um ponto na carta, mapa mês × hora e dimensionamento pelo período.
3. **Passo 7** reúne o que depende dos dados horários: classificação das horas com as hipóteses na tela, os dois indicadores e as alternativas.
4. **Aba "Vista 3D"** entre "Carta solar" e "Rosa dos ventos", com a biblioteca 3D carregada só quando a aba abre.
5. **Camadas na carta:** as curvas do passo 6 são linhas azul-petróleo com o percentual escrito (a de 100% com preenchimento leve); a máscara pelos ângulos do passo 3 continua vermelha e amarela; cada camada pode ser ocultada. Cores provisórias até a paleta da Fase 4.
6. **Percentuais das classes de hora** sempre sobre as horas com sol na janela (e ponderados pela radiação direta), nunca sobre as 8760 horas.
7. **Estado no link** (#), inclusive peças e alternativas; cálculos do ano num web worker, com cache por local.
8. **Medidas em metros**, com vírgula decimal, e cada campo dizendo de onde é medido.

## Alternativas consideradas

- Passos da Fase 3 entre o 3 e o 4: renumeraria o fluxo básico e o roteiro do F2.9.
- Modo "básico/avançado" que troca a tela inteira: duas telas para manter, testar e explicar; os passos recolhidos dão o mesmo efeito com menos mudança.
- Mapa e indicadores em abas ao lado da carta: no celular competem com a carta fixa no topo.
- Página separada para a Fase 3: perderia a carta sincronizada com a geometria.

## Consequências

- A interface da Fase 3 segue a ordem do ROADMAP (F3.1 a F3.7), um passo por PR com base na branch de integração, e nada da Fase 3 é marcado como feito no ROADMAP antes de entrar na `main`.
- Os testes de ponta a ponta do F2 continuam valendo sem mudança; os da Fase 3 conferem pixels (curvas, mapa, sombra no 3D), acessibilidade (axe, teclado, contraste de 4,5:1) e a impressão em escala.
- Se o Anthony preferir outra organização (por exemplo, o mapa no passo 7 ou um modo avançado), a mudança fica na interface: o núcleo e o estado no link não dependem da posição dos passos.

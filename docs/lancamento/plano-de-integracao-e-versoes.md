# Plano de integração e de versões (v0.5, v0.8 e v1.0)

- Data: 26/10/2026
- Para: Anthony (decisões) e quem conduzir as integrações depois do teste do F2.9 e dos portões 2, 3 e 4.
- Estado de partida: a `main` congelada no caminho das 9 tarefas do F2.9; as Fases 3 e 4 nas branches de integração dos PRs #35 e #51; nenhum passo das Fases 3 e 4 marcado como feito.

## 1. Ensaio da integração (26/10/2026)

O ensaio confere que a integração da Fase 4 é exatamente a `main` mais a Fase 3 mais a Fase 4, sem nada perdido ou duplicado, e que a suíte completa passa nela. Resultado na seção 6.

### 1.1 O que foi conferido

1. **Ancestralidade.** A `main` é ancestral da integração da Fase 3, e a integração da Fase 3 é ancestral da da Fase 4 (`git merge-base --is-ancestor`). Assim, a Fase 4 contém todo commit da `main` e da Fase 3.
2. **Nada da `main` ficou de fora.** Um merge de ensaio da integração da Fase 4 na `main` atual (numa cópia local, sem enviar) termina sem conflito e com a árvore idêntica à da integração da Fase 4 (`git diff` vazio entre o resultado e a branch).
3. **Tamanho de cada etapa:** quantos arquivos mudam da `main` para a Fase 3, da Fase 3 para a Fase 4 e da `main` para a Fase 4.
4. **Suíte completa na integração da Fase 4**, no build de produção: estilo, tipos, testes de unidade e de referência (com os EPWs de teste baixados pelo manifesto), build, orçamento do JavaScript inicial e ponta a ponta em computador e celular.
5. **Integração por squash contra merge commit:** o mesmo ensaio, integrando antes a Fase 3 de cada jeito (seção 3).

## 2. Ordem das integrações

Cada integração só acontece depois do portão anterior e com as decisões da issue "Revisão pendente" resolvidas. Em cada uma, a `main` fica verde do começo ao fim.

### 2.1 v0.5 "SOL-AR atualizado" (portão 2)

1. **Teste do F2.9 aplicado** pelo Anthony; folhas consolidadas em `docs/ux/F2.9-registro.csv`.
2. **Problemas do teste resolvidos ou estacionados** na `main`, um PR por problema; com o teste aplicado, o congelamento da `main` acaba. Inclui decidir os achados de gravidade 2 da revisão antes do teste e integrar o PR #33 (achado 9, células num web worker), atualizado com a `main`.
3. **Portão 2**: demonstração ao Prof. Lamberts e ao LabEEE com `docs/apresentacoes/portao-2-labeee.md`; retorno registrado na seção 11 dele; decisões 0016 e 0017 confirmadas.
4. **PR da versão** (decisão 0012): no `CHANGELOG.md`, "Não lançado" vira `## [0.5.0] - AAAA-MM-DD (v0.5, SOL-AR atualizado)`, com um "Não lançado" novo e vazio acima; `package.json` em `0.5.0`; `CITATION.cff` ainda não existe na `main` (vem com a Fase 4). O workflow `release.yml` cria a release ao integrar.
5. **Atualizar as integrações**: `main` na integração da Fase 3 e esta na da Fase 4 (merge, não rebase). No `CHANGELOG.md` das branches, as entradas da Fase 2 saem do "Não lançado" (já estão na 0.5.0) e as das Fases 3 e 4 continuam nele.

### 2.2 v0.8 (portão 3)

1. **Portão 3** com `docs/apresentacoes/portao-3-fase-3.md`: decisões 0018 a 0024 e as desta rodada que são da Fase 3 (0038, 0039 na parte da Fase 3, 0040) confirmadas ou trocadas; trocas feitas na integração da Fase 3, cada uma num PR com teste.
2. **ROADMAP na própria integração da Fase 3**: F3.1 a F3.8 marcados `[x]` com as datas, "Você está aqui" na Fase 4.
3. **Integrar o PR #35 na `main` com merge commit, não squash** (proposta, seção 3). Antes: atualizar com a `main`, CI verde, prévia conferida.
4. **PR da versão 0.8.0**: "Não lançado" vira `## [0.8.0] - AAAA-MM-DD (v0.8, Máscara calculada e quantificação)`; `package.json` em `0.8.0`.
5. **Atualizar a integração da Fase 4** com a `main` (merge).

### 2.3 v1.0 (portão 4)

1. **F4.9**: comitê de ética aprovado, teste formal com 10 a 15 alunos, SUS pelo critério da decisão 0026 (média de pelo menos 70, com o intervalo de confiança); relatório consolidado de validação (`docs/validacao/relatorios/F4.9-validacao-consolidada.md`, na integração da Fase 4) revisado.
2. **Portão 4**: decisões 0025 a 0036 e as desta rodada da Fase 4 confirmadas; e-mails enviados (OneBuilding e Prof. Lamberts) e as respostas incorporadas (redistribuição dos TMYx, INMET, BrazFuture).
3. **F4.10**: endereço definitivo (subdomínio no LabEEE, ROADMAP 7.1), canal de retorno, Zenodo ligado ao repositório antes da release (o DOI só sai das releases criadas depois de ligado).
4. **ROADMAP na integração da Fase 4**: F4.1 a F4.10 marcados, "Você está aqui" na Fase 5 (sem começá-la sem pedido).
5. **Integrar o PR #51 na `main` com merge commit.**
6. **PR da versão 1.0.0**: "Não lançado" vira `## [1.0.0] - AAAA-MM-DD (v1.0, nome público combinado com o LabEEE)`; `package.json` e `CITATION.cff` em `1.0.0` (o teste `tests/metadados.test.ts` confere as duas); a release sai como lançamento, não pré-lançamento (versão 1.x).

## 3. Proposta: integrar as fases por merge commit

O `CLAUDE.md` manda integrar com merge squash, o que está certo para os PRs de um passo. Para os dois PRs de integração de fase, o squash cria um commit novo na `main` que não é ancestral da integração seguinte: depois de integrar a Fase 3 por squash, o merge da `main` na integração da Fase 4 conflita em todo trecho que a Fase 4 mexeu de novo (o mesmo arquivo alterado nos dois lados), e a resolução vira trabalho manual em dezenas de arquivos, com risco de perder uma correção.

**Recomendação:** integrar os PRs #35 e #51 com merge commit (o histórico de cada passo, que já entrou squash na branch de integração, fica preservado), mantendo o squash para todo o resto. Se o Anthony preferir o squash, a alternativa é integrar a Fase 3 e a Fase 4 juntas, de uma vez, depois do portão 4, com a v0.8 publicada a partir da integração da Fase 3 (sem passar pela `main`), o que o `release.yml` atual não faz. Decisão 0041 (proposta), item na issue "Revisão pendente".

## 4. Riscos conhecidos de cada integração

- **CHANGELOG:** as três branches têm "Não lançado" com as entradas da `main`; a cada versão, as entradas já lançadas saem do "Não lançado" das branches (seção 2.1, passo 5).
- **Decisões no README das decisões:** a `main` tem a 0037; a Fase 3 tem 0038 a 0040; a Fase 4 tem 0025 a 0036. A tabela fica em ordem numérica a cada merge.
- **Congelamento:** enquanto o F2.9 não for aplicado, nenhuma integração de fase acontece; documentação e correções objetivas fora do caminho das 9 tarefas continuam entrando na `main`.
- **Service worker (decisão 0031):** a v1.0 é a primeira versão com service worker no endereço principal; quem abriu a v0.8 passa à v1.0 ao fechar as abas antigas. Conferir no portão 4 que a primeira visita depois da troca baixa a versão nova.

## 5. Notas de versão (rascunho)

### v0.5, "SOL-AR atualizado"

O SOL-AR no navegador, com dados atuais e os erros do 6.2 corrigidos.

- **Carta solar** estereográfica com trajetórias (solstícios, equinócios e dia 21 de cada mês, com o mês no poente) e linhas horárias em hora solar verdadeira, pela posição do sol do NREL SPA e no fuso do arquivo climático (o 6.2 fixava o meridiano de 45° O).
- **Transferidor** em qualquer orientação, com referência interna e externa, α, β e γ à direita e à esquerda, índices 1 e 2.
- **Máscara pelos ângulos** calculada (sombra total e parcial, com o brise afastado e as aletas), além do desenho à mão.
- **Dados climáticos na carta**: temperatura, umidade e radiação global, direta e difusa por quinzena e hora, média ou frequência acima de um limiar, com faixas padrão, digitadas ou pelos percentis do arquivo, e a tabela das células.
- **Rosa dos ventos** por classe de velocidade ou velocidade média, com calmaria, 8 ou 16 setores, filtros por estação e período do dia.
- **Imprimir e exportar** em escala (raio em cm, régua de 5 cm), SVG, PNG e CSV; comparação lado a lado.
- **Dados**: as 15 cidades do 6.2 e Manaus, com o arquivo recente (TMYx 2011 a 2025) indicado e os dados históricos do 6.2 a um clique, com origem, período e avisos; leitura de EPW e do CSV antigo.
- **Validação**: posição solar contra o pvlib (erro da ordem de 10⁻⁸°), transferidor igual ao do 6.2 em 64 curvas, máscara por traçado de raios, regressão completa contra o 6.2 com as diferenças explicadas.
- Funciona no celular e no tablet, sem instalação, sem cadastro e sem enviar nada para fora do navegador.

### v0.8, "Máscara calculada e quantificação"

A proteção solar desenhada em metros e o efeito dela no ano.

- **Passo 6, proteção pelas dimensões**: janela e até 9 peças (brise, aletas, lâminas), corte e vista em escala, curvas de 0 a 100% da janela à sombra e máscara de um ponto na carta, mapa mês × hora da sombra e dimensionamento pelo período (do período a sombrear para os ângulos e as dimensões, com o vidro recuado).
- **Passo 7, efeito no ano**: classificação das horas (padrão: limiar de 20 °C de Lamberts, Dutra e Pereira, 2014; faixa adaptativa da ASHRAE 55 como alternativa), radiação direta bloqueada nas horas quentes e admitida nas frias, comparação entre alternativas, sempre com as hipóteses na tela.
- **Vista 3D** da janela, das peças e da sombra do cálculo.
- No computador, os resultados dos passos 6 e 7 ficam ao lado da carta; um atalho leva a cada passo; os passos avançados só carregam quando abertos.
- **Validação**: fração ensolarada contra o EnergyPlus 26.2 (mesmo sol: diferença de até 5 × 10⁻⁴; ponta a ponta: RMSE de 0,006 a 0,026, explicado pela posição do sol do EnergyPlus), percentual sombreado contra o shapely e o traçado de raios, classificação contra o pythermalcomfort, dimensionamento contra o tutorial do SOL-AR da UFU.
- Limitações: só a radiação direta; a temperatura externa é um indicador aproximado da necessidade de sombra.

### v1.0, nome público a combinar com o LabEEE

A versão pública completa, para ensino e projeto.

- **Catálogo nacional**: 579 estações TMYx do Brasil com mapa, busca, distância e desnível até a obra e relatório de qualidade de cada arquivo; arquivos futuros do BrazFuture indicados.
- **Comparação de climas** na mesma carta (diferença B − A), com o tempo da radiação de cada arquivo calculado e avisado.
- **Projeções** equidistante e cilíndrica, cada uma com o seu transferidor, e **analemas** em hora legal.
- **Vento avançado**: filtro pela condição térmica e correção para a altura e o terreno, como no EnergyPlus.
- **Modo didático**: tutorial guiado e exercícios de máscara com conferência; **ajuda** com guia rápido, exemplos resolvidos, glossário e perguntas frequentes.
- **Português, espanhol e inglês**; paleta conferida para daltonismo, uso por teclado; **instalável e funcionando sem internet**; projeto salvo em arquivo e link que reabre o mesmo estado.
- Citação com DOI pelo Zenodo; canal de retorno pelas issues do GitHub e pelo e-mail do LabEEE.
- **Validação**: relatório consolidado em `docs/validacao/relatorios/F4.9-validacao-consolidada.md`; usabilidade com alunos pela SUS.
- O que fica para a v2.0 (decisão 0037, aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente): exportação para o EnergyPlus, INI-C e zona da NBR 15220-3, radiação difusa com máscara, entorno.

## 6. Resultado do ensaio (26/10/2026)

Commits conferidos: `main` em `43a4611`, integração da Fase 3 em `59177b2` (PR #35), integração da Fase 4 em `3785efa` (PR #51; depois dele só entrou o guia do mantenedor, PR #74, só documentação).

| Conferência | Resultado |
|---|---|
| `main` ancestral da Fase 3; Fase 3 ancestral da Fase 4; `main` ancestral da Fase 4 | sim nos três (`git merge-base --is-ancestor`). A ancestralidade da Fase 3 na Fase 4 tinha se perdido no PR #70 (integrado por squash) e foi refeita no PR #71 (merge `-s ours`, sem mudar arquivo). |
| Merge de ensaio da Fase 4 na `main` (`git merge --no-ff`, sem enviar) | 0 conflitos; a árvore do resultado é idêntica à da integração da Fase 4. |
| Arquivos alterados | `main` → Fase 3: 176; Fase 3 → Fase 4: 213; `main` → Fase 4: 350. |
| Mesmo ensaio, integrando a Fase 3 por squash e depois a Fase 4 | 28 arquivos em conflito (decisão 0041). Integrando a Fase 3 por merge commit: 0. |
| `npm run check` (Prettier, ESLint, TypeScript, Vitest com os EPWs de teste) | verde: 77 arquivos, 868 testes de unidade e de referência. |
| `npm run build` e `npm run orcamento` | verdes: JavaScript inicial de 472,3 kB (152,0 kB com gzip), orçamento de 480 kB (156 kB). |
| `npm run test:e2e` (build de produção numa subpasta, computador e celular) | verde: 249 testes passando; 9 pulados de propósito (os só de computador no celular e os só de celular no computador). |
| CI de cada PR da rodada (#66 a #75) | verde antes de cada integração. |

Conclusão: a integração da Fase 4 é a `main` mais a Fase 3 mais a Fase 4, sem conflito com a `main` atual, e passa na suíte completa. O que falta para integrar é o que a seção 2 lista (teste do F2.9, portões e decisões), não trabalho técnico.

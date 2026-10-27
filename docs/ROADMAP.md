# Novo SOL-AR: roteiro mestre

> **Fonte da verdade do projeto.** Atualize a cada passo concluído (marcar `[x]`, "Você está aqui", data).
>
> Diagnóstico do programa atual e justificativa das funções: [`docs/referencias/diagnostico-solar-6.2.md`](referencias/diagnostico-solar-6.2.md). Regras de trabalho do Claude: [`CLAUDE.md`](../CLAUDE.md).

**Você está aqui:** Fase 2, passo F2.9 (primeiro teste com usuários). Roteiro, folha de registro e planilha de consolidação prontos em `docs/ux/` (F2.9-*); revisão antes do teste feita em 24/10/2026 (`docs/ux/F2.9-revisao-antes-do-teste.md`), com os 3 problemas de gravidade 3 e 4 corrigidos e os achados 11, 12 e 19, fora do caminho das 9 tarefas (PRs #27 a #29). **Congelamento:** até o teste ser aplicado, a `main` não muda em nada que as 9 tarefas mostram (textos, leiaute, fluxo, tempo de resposta); o achado 9 (células num web worker) está pronto no PR #33, para integrar depois do teste. Material da demonstração do portão 2 em `docs/apresentacoes/portao-2-labeee.md`.

**Fase 3 adiantada** na branch de integração `claude/fase-3-autonomous-work-xwt1mh` (PR #35, em rascunho; prévia em https://1totone.github.io/novo-solar/pr/35/): núcleo de F3.1 a F3.6 e F3.8 com conferência contra o EnergyPlus 26.2, interface de F3.1 a F3.7 (passos 6 e 7 recolhidos abaixo do passo 5 e a aba Vista 3D, com os passos 1 a 5 sem mudança) e o material do portão 3 (`docs/apresentacoes/portao-3-fase-3.md`, na branch). Decisões 0018 a 0024, aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente; o limiar de 20 °C como padrão da classificação das horas (0024) está aplicado na integração. Acabamento de 26/10/2026 (PRs #66 a #69): resultados dos passos 6 e 7 ao lado da carta no computador (decisão 0038), rótulos da carta sem se atropelar, passos 6 e 7 e vista 3D carregados sob demanda com orçamento do JavaScript inicial no CI (0039) e atalho entre passos (0040), as três decisões aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente.

**Fase 4 adiantada** na branch de integração `claude/fase-3-4-integracao-ro4t5b`, que parte da da Fase 3 (PR #51, em rascunho; prévia em https://1totone.github.io/novo-solar/pr/51/, com o roteiro de revisão na descrição): F4.3 projeções e analemas, F4.4 vento avançado, F4.7 arquivo de projeto, F4.6 idiomas, acessibilidade e uso sem internet, F4.8 ajuda, F4.5 modo didático, F4.1 catálogo nacional, F4.2 comparação de climas e a preparação do F4.10 (PRs #53 a #63). Decisões 0025 e 0027 a 0036, aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Acabamento de 26/10/2026 (PRs #70 a #75): atualização com a Fase 3, idiomas, ajuda, modo didático e catálogo sob demanda (JavaScript inicial de 699 kB para 472 kB; 220 para 152 kB com gzip), mapa do catálogo ao lado da carta, meses da carta cilíndrica sem se atropelar, guia do mantenedor (`docs/manutencao/guia-do-mantenedor.md`) e relatório de validação consolidado da v1.0 (`docs/validacao/relatorios/F4.9-validacao-consolidada.md`). Na `main`, o protocolo do teste de usabilidade e o rascunho do pacote do comitê de ética (F4.9, PR #52, decisão 0026). Nenhum passo das Fases 3 e 4 é marcado como feito antes de entrar na `main`; a Fase 5 não começou. Ensaio da integração (main + Fase 3 + Fase 4) e plano das versões v0.5, v0.8 e v1.0, com as notas de versão em rascunho: `docs/lancamento/plano-de-integracao-e-versoes.md`.

**Achado que pede atenção** (relatórios do F4.1 e do F4.2, na branch da Fase 4): o tempo da radiação dos arquivos climáticos. Nos TMYx 2011-2025 do Brasil, a radiação vem cerca de 30 min depois da convenção do EPW (descontado o viés das nuvens, de 26 a 34 min em 12 das 14 cidades com TRY); nos BrazFuture conferidos, cerca de 35 min antes do sol com o REMO e 110 min depois com o RegCM. A aplicação avisa e não corrige. Se o atraso dos TMYx se confirmar, ele afeta também as simulações no EnergyPlus feitas com esses arquivos, sobretudo em fachadas leste e oeste (decisão 0035, na branch da Fase 4); o e-mail ao Climate.OneBuilding.org leva o achado.

**Parada:** revisão da issue #65 em 27/10/2026: o Anthony delegou ao Claude a revisão provisória das decisões, e a [pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303) aceita os itens 1 a 25. As decisões 0018 a 0041 ficam aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente; a 0037 corrige o escopo da 0006. Nenhum código mudou; `docs/ux/F2.9-registro.csv` continua só com as linhas de exemplo, e a pré-revisão não aprova portões nem libera a integração na `main`. Aguardando o Anthony aplicar o teste do F2.9, revisar as prévias das Fases 3 e 4 e conduzir os portões 2 e 3. Depois: resolver ou estacionar os problemas do teste (inclusive os de gravidade 2 da revisão e o PR #33), apresentar o portão 2, integrar a Fase 3 na `main` com as decisões revisadas e, depois do portão 3, a Fase 4.

**Pendências do Anthony** (em ordem de prioridade). **Todas estão na issue [Revisão pendente](https://github.com/1totone/novo-solar/issues/65)**, uma caixa por item, com a recomendação, o que muda se discordar e o link da prévia; marcar a caixa = aceitar a recomendação.

- Decisões 0018 a 0041 (itens 1 a 25 da issue #65): aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Discordar de um item reabre a decisão pelo "Se discordar" da issue.

- Aplicar o teste com usuários (F2.9) com `docs/ux/F2.9-teste-com-usuarios.md` e trazer as folhas de registro (ou `docs/ux/F2.9-registro.csv` preenchido).
- Conduzir a demonstração do portão 2 com `docs/apresentacoes/portao-2-labeee.md` (roteiro na seção 10, retorno a registrar na seção 11, proposta de subdomínio na seção 8); levar ao Prof. Lamberts a pergunta da decisão 0037 sobre a exportação para o EnergyPlus na v1.0 (seção 9, item 7).
- Revisar a Fase 3 na prévia do PR #35 e conduzir o portão 3 com `docs/apresentacoes/portao-3-fase-3.md` (na branch): fluxo e posição dos passos 6 e 7 e da aba Vista 3D (decisão 0023), textos, cores e as capturas em `docs/ux/capturas/`; o padrão da classificação das horas (decisão 0024: limiar de 20 °C de Lamberts, Dutra e Pereira, 2014, aplicado na integração, no lugar da faixa adaptativa da ASHRAE 55 sobre o ar externo, que subestima as horas quentes); e as decisões de física 0018 (máscara pela geometria e fração ensolarada hora a hora), 0019 (verificação contra o EnergyPlus: RMSE ≤ 0,03 ponta a ponta), 0020 (classificação das horas), 0021 (indicadores: DNI constante na hora, dois percentuais sem índice único) e 0022 (dimensionamento inverso, inclusive a janela recuada). Essas decisões chegam ao portão aceitas por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente; o portão pode reabrir qualquer uma.
- Revisar a Fase 4 na prévia do PR #51, pelo roteiro da descrição: primeiro o tempo da radiação dos arquivos (acima) e a comparação de climas (0035); depois o catálogo (0034), o modo didático (0033), projeções e vento (0025 e 0027), idiomas, acessibilidade e uso sem internet (0029 a 0031), ajuda (0032), arquivo de projeto (0028) e lançamento (0036).
- Enviar os e-mails de `docs/dados/rascunhos-de-email.md` (na branch da Fase 4): ao Climate.OneBuilding.org (permissão de redistribuir os TMYx, CORS e o achado do tempo da radiação) e ao Prof. Lamberts (EPWs do INMET, BrazFuture e os achados sobre ele, hospedagem no LabEEE e quem gerou as colunas de radiação dos CSV do 6.2).
- Revisão do espanhol e do inglês por falantes nativos (interface, ajuda e `docs/i18n/glossario-tecnico.md`, na branch da Fase 4).
- F4.9: submeter o pacote ao comitê de ética (`docs/etica/`) e aplicar o teste formal quando aprovado.
- Confirmar no portão 2 o tratamento da radiação dos dados históricos: mostrada como está, com avisos (decisão 0017).
- Decidir no portão 2 as estações da rosa dos ventos: pelos meses (decisão 0016) ou astronômicas, como as rosas do 6.2 (diferença de até 13,6 pontos percentuais; relatório do F2.8).
- Conferir no texto da ANSI/ASHRAE 55-2023 a equação e os limites do modelo adaptativo e a faixa de α da média predominante (conferidos só no pythermalcomfort; spec 08 na branch de integração).
- Lançamento (F4.10, `docs/lancamento/roteiro-f4.10.md`, na branch da Fase 4): ligar o repositório no Zenodo quando quiser o DOI; levar ao LabEEE o subdomínio, o e-mail do canal de retorno e a proposta de não contar o uso.
- Ambiente das sessões: liberar `zenodo.org` e `www.ncei.noaa.gov` (seção 7.2), para conferir a licença e os arquivos originais do BrazFuture e os termos da NOAA.
- Opcional: conferir no 6.2 real, com `docs/validacao/casos/solar-6.2/teste-hora.csv`, a hora em que ele desenha os dados (relatório do F2.8, seção 6).
- Quando conseguir, fotos dos exemplos de máscara de Bittencourt e de Frota e Schiffer (casos adicionais da literatura; não bloqueiam).

**Última atualização:** 27/10/2026 (revisão da issue #65 por delegação).

---

## 1. Norte

**Visão.** Um SOL-AR para os dias de hoje: abrir no navegador, escolher a cidade, ver a carta solar e projetar a proteção solar com dados atuais, usando o mesmo método ensinado nas escolas (carta + transferidor), mas com a máscara calculada e o efeito quantificado.

**Para quem.**

- Estudante de arquitetura: entender a carta e projetar brises sem manual.
- Professor: imprimir em escala, propor exercícios, confiar nos números.
- Projetista ou consultor: rapidez, dados atuais, quantificação, saídas para INI-C e EnergyPlus.
- Pesquisador: transparência, validação, dados exportáveis.

**Como saberemos que deu certo.**

- Da abertura até a carta com transferidor em menos de 1 minuto, sem manual.
- Tudo o que o SOL-AR 6.2 faz, com dados atuais e os erros corrigidos.
- Cálculos validados contra referências independentes, com relatório público.
- Nota SUS (escala padrão de usabilidade) de pelo menos 70 em teste com alunos.
- Substituir o programa atual no site do LabEEE.

## 2. Princípios

Servem para desempatar qualquer decisão. Se uma ideia fere um princípio, ela não entra.

1. **Simples primeiro.** O caminho básico (local → carta → transferidor → máscara) nunca fica mais complicado por causa de recursos avançados. O que é avançado fica recolhido (modo básico e modo avançado).
2. **Correto e verificável.** Todo cálculo físico tem teste contra referência independente, com tolerância documentada.
3. **Transparente.** Origem, período e qualidade dos dados sempre visíveis; hipóteses de cada indicador explícitas.
4. **Didático.** Preserva o método e o vocabulário do ensino brasileiro (α, β, γ, transferidor, referência interna e externa).
5. **Acessível.** Navegador, sem instalação, funciona offline, PT/ES/EN, roda em computador modesto e tablet.
6. **Aberto e sustentável.** Código aberto, documentado, sem dependências pagas e sem servidor.

## 3. Escopo

**Dentro:** carta solar e transferidor; máscaras (por ângulos e calculadas pela geometria); sobreposição de dados climáticos; quantificação do efeito do sombreamento; rosa dos ventos; catálogo de arquivos climáticos; conferência com o EnergyPlus e dados exportáveis (v1.0); saídas para NBR 15220-3, INI-C e EnergyPlus (v2.0: F5.2, F5.3 e F5.6); modo didático. O escopo da ponte segue a decisão 0037, que corrige a 0006.

**Fora:** simulação energética (o EnergyPlus faz isso; nós exportamos para ele, na v2.0); iluminação natural; simulação de ventilação ou CFD; painel climático genérico (o CBE Clima faz isso); contas de usuário e servidor.

## 4. Método de trabalho (para não perder a direção)

### 4.1 Arquivos que mantêm o rumo (dentro do repositório)

| Arquivo | Para que serve |
|---|---|
| `CLAUDE.md` | Contexto, princípios, escopo, stack, convenções e regras de trabalho. O Claude Code lê automaticamente em toda sessão. |
| `docs/ROADMAP.md` | Este roteiro: fases, passos, critérios de pronto e o "você está aqui". |
| `docs/decisoes/` | Uma nota curta por decisão (contexto, decisão, alternativas, consequências). Evita rediscutir o que já foi decidido. |
| `docs/spec/` | Especificação técnica: convenções, fórmulas, algoritmos e tolerâncias, com referências. |
| `docs/validacao/` | Casos de teste de referência e relatórios de validação. |
| `docs/ideias.md` | Estacionamento de ideias novas. Nada entra na fase atual sem passar por aqui. |
| `CHANGELOG.md` | O que mudou em cada versão. |

### 4.2 Fluxo autônomo (sessões do Claude Code na nuvem)

1. **Abrir:** o Anthony abre uma sessão **na nuvem** (não local) em claude.ai/code, com o repositório `1totone/novo-solar` e o ambiente `novo-solar` selecionados (modo padrão ou Auto), e o pedido: *"Leia CLAUDE.md e docs/ROADMAP.md e continue o roteiro a partir do 'Você está aqui', no modo autônomo."*
2. **Executar:** o Claude segue os passos em sequência, sem pedir confirmação entre eles. Um passo por branch e por PR; quando há física, o teste de referência vem antes do código.
3. **Verificar:** verificação de estilo, testes e build passando; capturas de tela quando houver interface; prévia do PR publicada.
4. **Integrar:** o Claude marca o passo como feito (`[x]`), atualiza o "Você está aqui", o CHANGELOG e as decisões, e faz o merge quando o CI passa. O site se atualiza sozinho.
5. **Continuar:** se a sessão acabar ou o contexto ficar longo, o Anthony abre outra sessão com o mesmo pedido; ela retoma do "Você está aqui".

### 4.3 Definição de pronto (vale para todo passo)

- Código com testes automatizados passando no CI (testes que rodam sozinhos a cada alteração enviada).
- Cálculo físico: teste contra referência independente, dentro da tolerância da spec.
- Documentação atualizada (spec e/ou ajuda), ROADMAP marcado, CHANGELOG atualizado.
- Publicado na prévia.

### 4.4 Portões de fase

Cada fase termina num portão com critérios verificáveis. Ali o Claude para e apresenta ao Anthony um resumo, o link da prévia e o que conferir; só segue para a fase seguinte com a aprovação dele, e então marca uma versão (v0.1, v0.5, ...) como release. Se o projeto parar em qualquer portão, o que foi feito até ali já é utilizável.

### 4.5 Papéis

- **Anthony:** dono do produto e validador técnico (física, normas, didática). Decide nos portões e quando o Claude pede uma decisão não coberta pelo roteiro.
- **Claude:** conduz o roteiro, implementa, testa, documenta, integra e propõe.
- **Prof. Roberto Lamberts e LabEEE:** solicitantes e futuros mantenedores; retorno nos portões 2 e 4.

### 4.6 Acompanhamento

A qualquer momento, o estado do projeto está no "Você está aqui", na lista de PRs do GitHub e na prévia publicada. Nos portões, triagem do estacionamento de ideias (fica, vai para uma fase futura ou é descartada).

## 5. Roteiro

### Fase 0: Fundação (≈1 semana) → v0.0

- [x] **F0.1 Decisões iniciais.** Tomadas em 23/10/2026 e registradas em [`docs/decisoes/`](decisoes/):
  - [x] Repositório e site: GitHub, repositório público `novo-solar` na conta 1totone; site no GitHub Pages; transferível para o LabEEE depois.
  - [x] Ambiente: Claude Code na nuvem (claude.ai/code), em modo autônomo; Codespaces como complemento.
  - [x] Licença: MIT.
  - [x] Stack: TypeScript + Vite + React; D3/SVG para a carta; Three.js para o 3D; Vitest e Playwright para testes.
  - [x] Idiomas: interface em português primeiro, com estrutura de tradução desde o início; código em inglês; documentação em português.
  - [x] Público e escopo da v1.0: ensino + projeto, conforme seção 3.
  - [x] Origem, nome e créditos: nova versão oficial do SOL-AR, pedida pelo Prof. Roberto Lamberts; créditos originais mantidos; manutenção futura pelo LabEEE. Numeração pública (ex.: "SOL-AR 7") definida no lançamento, com o LabEEE.
- [x] **F0.2 Repositório e ambiente.**
  - [x] Repositório público `novo-solar` criado na conta 1totone, com README e licença MIT (23/10/2026).
  - [x] Primeira sessão em claude.ai/code conectada ao repositório, rodando um comando de teste (23/10/2026: Node 22, npm, Python 3.13, git e `gh api` funcionando; Chromium do Playwright pré-instalado na sessão).
  - [x] Configurações únicas do Anthony (seção 7.2), conferidas em 23/10/2026; a fonte do GitHub Pages foi confirmada pela primeira publicação (F0.3).

  Codespaces como complemento (benefícios do GitHub Education liberados por volta de 26/10/2026). Nada é instalado no PC.
- [x] **F0.3 Governança e estrutura.**
  - [x] Governança: `CLAUDE.md`, `docs/ROADMAP.md`, notas de decisão, `docs/ideias.md`, esqueletos de `docs/spec/` e `docs/validacao/`, diagnóstico do SOL-AR 6.2, `README.md`, `CHANGELOG.md` (23/10/2026).
  - [x] Estrutura técnica: Vite + React + TypeScript strict, `src/core/` e `src/ui/`, ESLint e Prettier, Vitest e Playwright; comandos registrados no `CLAUDE.md` (23/10/2026).
  - [x] CI (GitHub Actions): verificação de estilo, testes e build em cada PR e na `main` (23/10/2026).
  - [x] Publicação automática no GitHub Pages de uma página "em construção", com prévia de cada PR num endereço próprio (23/10/2026; decisão 0008).
  - [x] Build portátil: caminhos relativos, estado na URL (#) e nenhum servidor, para rodar sem mudanças no GitHub Pages, num subdomínio do LabEEE ou numa pasta do servidor deles (ver 7.1). Verificado por teste de ponta a ponta que serve o build numa subpasta arbitrária (23/10/2026).

  *Pronto quando:* CI verde e página no ar em 1totone.github.io/novo-solar.
- [x] **F0.4 Especificação v0.** Escrita em 23/10/2026 ([`docs/spec/`](spec/README.md)); os pontos que dependem do Anthony estão listados no README da spec. Convenções:
  - azimute a partir do Norte, sentido horário; orientação da fachada pela normal externa;
  - definição exata de α1/α2, β1/β2 e γ1/γ2 com figuras, reproduzindo o SOL-AR 6.2 e a literatura (Bittencourt; Frota e Schiffer); referência interna e externa;
  - hora solar e hora legal;
  - convenção de hora do EPW (valor da hora que termina; radiação integrada na hora anterior, posicionada no meio do intervalo);
  - unidades.

  Algoritmos e tolerâncias de cada módulo. *Pronto quando:* escrita, com referências; a aprovação do Anthony acontece no portão 0.
- [x] **F0.5 Dados e casos de referência.** Feito em 23/10/2026 ([`docs/validacao/`](validacao/README.md)): 6 EPWs TMYx 2011 a 2025 por manifesto com SHA-256 (não versionados, decisão 0010); 15 cidades do 6.2 extraídas do instalador oficial; 3456 posições e 72 nasceres e pores do sol com o pvlib, mais o caso publicado do SPA. EPWs de teste (Florianópolis, Brasília, Belém, Porto Alegre, Manaus em UTC-4 e Concepción); CSVs do SOL-AR 6.2; valores de referência de posição solar gerados com pvlib (NREL SPA). *Pronto quando:* arquivos e valores guardados em `docs/validacao/`.

**Portão 0:** decisões registradas; CI verde; página no ar; spec v0 aprovada. **Aprovado em 23/10/2026** (decisão 0011); release v0.0.

### Fase 1: Esqueleto funcional (≈1 a 2 semanas) → v0.1

O objetivo é ter o caminho inteiro funcionando de ponta a ponta, ainda que simples.

- [x] **F1.1 Leitor de EPW.** Feito em 23/10/2026: `src/core/epw/`, conferido contra o pvlib nos 6 EPWs de teste. Cabeçalho (local, latitude, longitude, fuso, elevação), 8760 horas, checagens básicas, mensagens de erro claras. *Pronto quando:* lê os EPWs de teste e rejeita arquivos corrompidos com mensagem útil.
- [x] **F1.2 Posição solar.** Feito em 23/10/2026: `src/core/solar/`; erro máximo de 10⁻⁸° contra o pvlib em 6 locais (relatório em `docs/validacao/relatorios/`). NREL SPA; conversão entre hora legal e hora solar com o fuso do arquivo; nascer e pôr do sol. *Pronto quando:* erro menor que 0,01° contra pvlib em 3 latitudes e 2 fusos (incluindo UTC-4).
- [x] **F1.3 Carta estereográfica.** Feito em 23/10/2026: `src/core/chart/` e `src/ui/chart/`, conferida contra o pvlib em 6 locais (relatório em `docs/validacao/relatorios/`). Horizonte, círculos de altura, azimutes, trajetórias (solstícios, equinócios e dia 21 de cada mês), linhas horárias. *Pronto quando:* coincide com os pontos de referência para latitudes equatorial, tropical e subtropical.
- [x] **F1.4 Interface mínima.** Feito em 23/10/2026: escolha da cidade de teste ou leitura de EPW no navegador, carta e dados do local, estado no link; testes de ponta a ponta em computador e celular. Carregar EPW ou escolher cidade de teste e ver a carta na tela, publicada. *Pronto quando:* testes de ponta a ponta passam em navegador de computador e em tela de celular (Playwright); o Anthony confere no portão 1.

**Portão 1:** carta correta para 4 locais de teste, publicada. **Aprovado em 23/10/2026**; release v0.1.

### Fase 2: Paridade com o SOL-AR 6.2, já corrigido (≈3 a 4 semanas) → v0.5

Ao fim desta fase, o novo já substitui o antigo.

- [x] **F2.1 Fluxo e wireframes.** Aprovados em 24/10/2026 com ajustes na sobreposição, nas faixas e no vento (`docs/ux/F2.1-fluxo-e-wireframes.md`, decisão 0013). Esboço da tela principal e do fluxo básico, publicado como página navegável. **Parada:** o Claude apresenta os wireframes e espera a aprovação do Anthony (que pode mostrar a 1 ou 2 alunos) antes de codar a interface. *Pronto quando:* wireframes aprovados.
- [x] **F2.2 Transferidor.** Feito em 24/10/2026: curvas iguais às do 6.2 (reconstruídas do executável) em 8 casos e 64 curvas; lado direito e índices 1 e 2 confirmados (relatório em `docs/validacao/relatorios/`). Qualquer orientação (inclusive negativa), referência interna e externa, α1/α2, β e γ (direita/esquerda, 1 e 2). *Pronto quando:* curvas iguais às do SOL-AR 6.2 nos casos de regressão.
- [x] **F2.3 Máscara pelos ângulos.** Feito em 24/10/2026: sombra total (100%) e parcial (50%, do centro da janela), índices 2 (brise afastado), γ das aletas e desenho à mão (decisão 0014); conferida por traçado de raios em 9 casos e pelo exemplo do tutorial do SOL-AR da UFU em Brasília (relatório em `docs/validacao/relatorios/`). Regiões total e parcial calculadas a partir de α, β e γ (o antigo exigia desenho à mão); desenho manual mantido como opção. *Pronto quando:* casos-teste da literatura reproduzidos.
- [x] **F2.4 Sobreposição de dados.** Feito em 24/10/2026: células por quinzena e hora do arquivo, média ou frequência acima de um limiar, faixas padrão, digitadas ou pelos percentis do arquivo, e leiaute do celular com a carta fixa no topo (decisões 0013 e 0015); todas as horas com sol de Florianópolis e Manaus caem na célula certa, e nenhuma com o fuso deslocado 1 h (relatório em `docs/validacao/relatorios/`). TBS, UR, GHI, DNI e DHI na carta, por semestre, com faixas editáveis e legenda; fuso correto. *Pronto quando:* cores no lugar certo para Florianópolis e Manaus (teste do fuso).
- [x] **F2.5 Rosa dos ventos.** Feito em 24/10/2026: aba própria, com frequência por classe de velocidade ou velocidade média por setor, calmaria no centro, filtros e tabela (decisão 0016); 150 rosas iguais às de um cálculo independente em Python (relatório em `docs/validacao/relatorios/`). 8 ou 16 setores, frequência e velocidade com classes, calmarias, por estação e período do dia. *Pronto quando:* estatísticas iguais às de um cálculo independente em Python.
- [x] **F2.6 Saídas.** Feito em 24/10/2026: passo 5 com raio em cm, régua de 5 cm, exportações SVG, PNG e CSV, copiar imagem, tabela das células e comparação lado a lado; raio conferido no navegador e num PDF rasterizado a 600 dpi (diferença de até 0,1 mm); a medida com régua numa impressão em papel fica para o Anthony no portão 2 (relatório em `docs/validacao/relatorios/`). Comparar lado a lado; imprimir em escala; exportar SVG, PNG e CSV dos dados mostrados; copiar. Inclui a tabela dos valores das células, acessível sem o mouse (decisão 0015). *Pronto quando:* carta impressa a 100% tem o raio pedido com até 1 mm de diferença (medido com régua).
- [x] **F2.7 Dados.** Importar EPW e o CSV antigo do SOL-AR; as 15 cidades do programa antigo com dados recentes; as TRY antigas marcadas como históricas. *Pronto quando:* as 15 cidades abrem com origem e período visíveis.
- [x] **F2.8 Regressão contra o SOL-AR 6.2.** Mesmas entradas nos dois programas; diferenças documentadas e justificadas (ex.: fuso, dados). Fontes de comparação: o modelo de cálculo do 6.2 reconstruído no diagnóstico e capturas de tela do 6.2 (rodado sob Wine na sessão, se possível, ou fornecidas pelo Anthony). *Pronto quando:* relatório em `docs/validacao/`.
- [ ] **F2.9 Primeiro teste com usuários.** Roteiro e folha de registro prontos em 24/10/2026 (`docs/ux/F2.9-teste-com-usuarios.md`); aguardando a aplicação. Revisão antes do teste (heurísticas de Nielsen, acessibilidade, robustez e desempenho no celular) em 24/10/2026: rosa dos ventos em branco, trajetórias sem a data e carta fixa tomando a tela do celular corrigidas (PRs #21 a #23); os achados de gravidade 2 ficam para decidir com o teste (`docs/ux/F2.9-revisao-antes-do-teste.md`), exceto o 11 e o 12, corrigidos em 25/10/2026 por estarem fora do caminho das tarefas (PRs #27 e #28), como o 19, de gravidade 1 (PR #29); o achado 9 espera no PR #33, em rascunho. 3 a 5 pessoas (alunos e um professor), observação de uso e ajustes. **Parada:** o Claude prepara o roteiro do teste e um formulário de registro; o Anthony aplica e traz os resultados. *Pronto quando:* problemas encontrados resolvidos ou estacionados.

**Portão 2 (v0.5, "SOL-AR atualizado"):** tudo o que o antigo faz, com dados atuais e erros corrigidos; demonstração para quem pediu e retorno registrado.

### Fase 3: Máscara calculada e quantificação (≈4 a 6 semanas) → v0.8

- [ ] **F3.1 Janela e dispositivos.** Brise horizontal finito (com afastamento e prolongamentos), brises verticais, grelha, lâminas paralelas com inclinação; formulário com corte e vista esquemáticos, exportáveis em SVG. *Pronto quando:* geometria editável e desenhada corretamente.
- [ ] **F3.2 Máscara exata e percentual.** Máscara por ponto e percentual sombreado sobre a área da janela (curvas de 0, 25, 50, 75 e 100%). *Pronto quando:* casos analíticos reproduzidos (ex.: brise infinito gera exatamente a curva α).
- [ ] **F3.3 Fração ensolarada hora a hora e mapa mês × hora.** O mapa elimina a ambiguidade dos dois semestres. *Pronto quando:* consistente com a máscara em todas as horas do ano.
- [ ] **F3.4 Classificação das horas.** Limiares editáveis; faixa de conforto adaptativo (ASHRAE 55) como referência; temperatura de equilíbrio por tipologia; aviso de que a temperatura externa é um indicador aproximado da necessidade de sombra. *Pronto quando:* hipóteses visíveis na tela.
- [ ] **F3.5 Indicadores.** Percentual da radiação direta incidente (DNI·cos θ) bloqueada nas horas quentes e admitida nas horas frias; comparação entre alternativas de brise. *Pronto quando:* conferido à mão em casos simples, com a memória de cálculo em `docs/validacao/`; revisão do Anthony no portão 3.
- [ ] **F3.6 Dimensionamento inverso.** Do período a sombrear para ângulos e dimensões; subdivisão em lâminas mantendo os ângulos. *Pronto quando:* reproduz o exemplo de Brasília do tutorial do SOL-AR.
- [ ] **F3.7 Vista 3D sincronizada.** Sol, janela, brise e sombra animada. *Pronto quando:* a sombra em 3D bate com a fração ensolarada calculada.
- [ ] **F3.8 Verificação contra o EnergyPlus.** Fração ensolarada hora a hora contra "Surface Outside Face Sunlit Fraction", com o ShadowCalculation atualizado a cada passo de tempo (ou a cada dia) para comparação justa. *Pronto quando:* erro dentro da tolerância da spec (proposta: RMSE ≤ 0,02).

**Portão 3 (v0.8):** máscaras validadas; indicadores revisados.

### Fase 4: Dados, didática e lançamento (≈6 a 8 semanas) → v1.0

- [ ] **F4.1 Catálogo nacional.** Arquivos TMYx e INMET com mapa e busca; aviso de distância e diferença de altitude até a estação; relatório de qualidade de cada arquivo; termos de redistribuição verificados.
- [ ] **F4.2 Comparação de climas.** TRY histórico, arquivo recente e arquivos futuros (LabEEE/INPE) na mesma carta.
- [ ] **F4.3 Outras projeções e hora legal.** Projeções equidistante e cilíndrica, cada uma com seu transferidor; linhas horárias em hora legal (analemas) para ensinar a diferença entre hora solar e hora legal.
- [ ] **F4.4 Vento avançado.** Filtros por condição térmica; correção de altura e rugosidade como no EnergyPlus; aviso de que o vento é da estação, não do terreno.
- [ ] **F4.5 Modo didático.** Tutorial guiado; modo exercício (o aluno desenha a máscara e a ferramenta compara com a calculada); textos curtos de apoio em cada tela.
- [ ] **F4.6 Idiomas, acessibilidade e offline.** PT/ES/EN; paletas seguras para daltonismo, uso por teclado e contraste; instalável e funcionando sem internet.
- [ ] **F4.7 Projeto salvo e compartilhável.** Salvar e abrir arquivo de projeto; link que reabre o mesmo estado.
- [ ] **F4.8 Ajuda.** Guia rápido, glossário, perguntas frequentes e 3 exemplos resolvidos (o antigo não tinha manual nem suporte).
- [ ] **F4.9 Validação formal e usabilidade.** Relatório de validação (geometria, máscaras, vento, indicadores); teste com 10 a 15 alunos (SUS). **Parada:** o Claude prepara o protocolo e o questionário; o Anthony aplica e traz os resultados.
- [ ] **F4.10 Lançamento.** Endereço definitivo (ver 7.1); página no LabEEE se houver parceria; canal de retorno dos usuários; DOI pelo Zenodo para citação acadêmica; decidir se haverá contagem anônima de uso.

**Portão 4 (v1.0):** publicada; relatório de validação; SUS ≥ 70.

### Fase 5: Avançado (≈2 a 4 meses, conforme demanda) → v2.0

- [ ] **F5.1 Radiação difusa com máscara** (fator de visão do céu; modelos isotrópico e Perez) e radiação incidente total na janela.
- [ ] **F5.2 Exportação para EnergyPlus** (Shading:Overhang:Projection, Shading:Fin:Projection, Shading:Zone:Detailed), com teste de ida e volta; exportação de corte e vista em DXF.
- [ ] **F5.3 INI-C:** cálculo de AVS, AHS e AOV.
- [ ] **F5.4 Entorno:** obstruções por blocos ou modelo OBJ.
- [ ] **F5.5 Cargas horárias do EnergyPlus:** classificar as horas pela necessidade real do ambiente (lógica do método celular).
- [ ] **F5.6 Zona da NBR 15220-3:2024** por município.
- [ ] **F5.7 Artigo** (validação + avaliação didática).

**Portão 5 (v2.0).**

### Contínuo

Correções, atualização dos arquivos climáticos quando saírem novas séries e versões alinhadas ao calendário acadêmico (antes do início de cada semestre).

## 6. Cronograma indicativo

Supõe dedicação parcial (cerca de 6 a 10 horas semanais de revisão e decisão do Anthony). O código anda mais rápido que isso; o ritmo real é dado pela validação.

| Fase | Duração | Versão | O que fica utilizável | Meta indicativa |
|---|---|---|---|---|
| 0 Fundação | ≈1 semana | v0.0 | Repositório, regras, página no ar | início de nov/2026 |
| 1 Esqueleto | 1 a 2 semanas | v0.1 | Carta solar correta a partir de EPW | meados de nov/2026 |
| 2 Paridade | 3 a 4 semanas | v0.5 | Substitui o SOL-AR 6.2 | antes do recesso de fim de ano |
| 3 Máscara e quantificação | 4 a 6 semanas | v0.8 | Brise calculado e avaliado | fev/2027 |
| 4 Lançamento | 6 a 8 semanas | v1.0 | Versão pública completa | início do semestre 2027.1 (pode escorregar) |
| 5 Avançado | 2 a 4 meses | v2.0 | Ponte com INI-C e EnergyPlus | 2º semestre de 2027 |

## 7. Infraestrutura e GitHub

**Decidido em 23/10/2026:** repositório público `novo-solar` na conta pessoal 1totone; desenvolvimento em sessões do Claude Code na nuvem; Codespaces como complemento; site no GitHub Pages; licença MIT.

- **Claude Code na nuvem** (claude.ai/code; também pelo app desktop escolhendo "Cloud", ou pelo celular): roda em máquinas da Anthropic e trabalha direto no repositório do GitHub; cada passo vira um PR, integrado pelo Claude quando o CI passa. Incluído nos planos Pro, Max e Team (e Enterprise com assentos específicos), sem cobrança separada pela máquina; consome o mesmo limite de uso das outras conversas com o Claude.
- **Codespaces:** computador na nuvem do GitHub, aberto no navegador, para ver o programa rodando ao vivo. Plano gratuito: 120 horas-núcleo por mês (60 h numa máquina de 2 núcleos). Com o GitHub Education (aprovado em 23/10/2026, benefícios em até 72 h): 180 horas-núcleo (90 h). O codespace para sozinho após 30 minutos sem uso.
- **Actions e Pages:** gratuitos em repositório público; não consomem a cota de minutos da conta, que vale só para repositórios privados (em 23/10/2026 estava em 90%, gasta por outros projetos; com o Education sobe de 2.000 para 3.000 minutos por mês).
- Os orçamentos de US$ 0 configurados na conta ficam como estão: impedem qualquer cobrança.
- Se um dia for preciso, o repositório pode ser transferido para uma organização ou para o LabEEE (o GitHub redireciona o repositório, mas não o endereço do GitHub Pages). GitLab e Codeberg são alternativas ao GitHub, mas as sessões na nuvem do Claude Code exigem GitHub.

### 7.1 Levar para o site do LabEEE

O programa é um site estático (arquivos prontos, sem servidor nem banco de dados), então qualquer lugar que sirva arquivos consegue publicá-lo. Três caminhos, do mais simples ao mais institucional:

| Caminho | O que o LabEEE faz | Prós | Contras |
|---|---|---|---|
| Link na página atual do SOL-AR | Adiciona um botão para o nosso endereço | Nenhum trabalho técnico | Endereço do GitHub |
| **Subdomínio (recomendado)**, ex.: solar.labeee.ufsc.br | Pede à TI da UFSC um registro DNS (CNAME) apontando para 1totone.github.io, uma única vez | Endereço oficial e permanente; hospedagem gratuita, HTTPS e atualização automática continuam no GitHub | Depende da TI criar o registro |
| Servidor do LabEEE, ex.: labeee.ufsc.br/solar | Copia a pasta do build para o servidor a cada versão | Tudo dentro da UFSC | Cada atualização exige nova cópia |

Cuidados desde já:

- Build portátil (F0.3), para que qualquer um dos caminhos funcione sem mudanças.
- Não divulgar o endereço do GitHub como definitivo; ele serve para prévias. Se o repositório mudar de conta, esse endereço não é redirecionado; o subdomínio protege contra isso.
- Sem coleta de dados pessoais e sem servidor, a aprovação institucional (LGPD) fica simples. Se um dia houver contagem de uso, que seja anônima e sem cookies.
- A licença MIT permite ao LabEEE hospedar e modificar livremente, mantidos os créditos.
- Já definido: o projeto foi pedido pelo Prof. Roberto Lamberts, os créditos originais (Lamberts, Maciel e Ono) ficam mantidos e o LabEEE será o mantenedor. Na demonstração do portão 2 (v0.5), propor ao LabEEE o subdomínio e a numeração pública.

### 7.2 Configurações únicas (Anthony)

Feitas uma vez, para que o Claude trabalhe sem interrupções:

- [x] **Claude GitHub App com acesso ao repositório:** no GitHub, Settings > Applications > Installed GitHub Apps > Claude > Configure > Repository access: incluir `novo-solar` (necessário para o Claude enviar branches e integrar PRs).
- [x] **GitHub Pages:** no repositório, Settings > Pages > Build and deployment > Source: **GitHub Actions**.
- [x] **Ambiente próprio na nuvem:** em claude.ai/code, criar um ambiente novo chamado `novo-solar` (não alterar os ambientes de outros projetos), sem script de configuração, com acesso de rede "Custom", a lista padrão de gerenciadores de pacotes marcada e estes domínios: `climate.onebuilding.org`, `labeee.ufsc.br`, `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`, `playwright.azureedge.net`.

**Conferência de 23/10/2026 (primeira sessão):**

- App do Claude: o repositório aparece com permissão de administração para a sessão; push e PR pela API funcionam.
- GitHub Pages: o repositório responde `has_pages: true`. O proxy da sessão não deixa ler a configuração do Pages (`/pages`); a fonte "GitHub Actions" foi confirmada pela primeira publicação (deployment `github-pages` em `success`, F0.3).
- Ambiente `novo-solar`: em uso. Respondem `registry.npmjs.org`, `pypi.org`, `labeee.ufsc.br`, `climate.onebuilding.org` (devolve 429 a pedidos sem identificação de navegador e 200 com ela) e os domínios do Playwright; domínios fora da lista são bloqueados, como esperado.
- Limites do proxy: os caminhos `/actions` e `/pages` da API REST são bloqueados para o `gh api`; o estado do CI é lido pelas ferramentas do GitHub disponíveis na sessão.

## 8. Riscos e como evitamos

| Risco | Como evitamos |
|---|---|
| Escopo crescer sem parar | Estacionamento de ideias; portões; princípios como filtro |
| Perder a simplicidade | Modo básico e avançado; teste com usuários nas fases 2 e 4 |
| Erro físico silencioso | Teste de referência antes do código; validação contra pvlib e EnergyPlus |
| Depender de uma pessoa | Código aberto; spec e decisões documentadas |
| Dados (licença e qualidade) | Verificação de termos; relatório de qualidade visível |
| Questão institucional (nome, LabEEE) | Definida na decisão 0007; endereço e numeração pública combinados no portão 2 |
| Tempo do mestrado | A v0.5 já entrega valor; as fases seguintes são incrementais |

## 9. Referências-chave

- Diagnóstico do SOL-AR 6.2 e proposta: [`docs/referencias/diagnostico-solar-6.2.md`](referencias/diagnostico-solar-6.2.md).
- Tutorial do SOL-AR (Bortoli e Saramago, UFU) e documento de inclusão de cidades (arquivos do projeto ANALYSIS_SOL-AR no Claude).
- Bittencourt, L. Uso das cartas solares. Frota, A.; Schiffer, S. Manual de conforto térmico.
- Reda, I.; Andreas, A. Solar Position Algorithm (NREL SPA), 2004.
- EnergyPlus: Engineering Reference e Input Output Reference.
- ABNT NBR 15220-3:2024; INI-C (Inmetro).
- GitHub, planos: https://docs.github.com/en/get-started/learning-about-github/githubs-plans
- GitHub Education para estudantes: https://docs.github.com/en/education/about-github-education/github-education-for-students/about-github-education-for-students
- Claude Code na web (requisitos): https://code.claude.com/docs/pt/web-quickstart
- Claude Code na nuvem (planos, limites, GitHub): https://code.claude.com/docs/en/claude-code-on-the-web

# Guia do mantenedor do SOL-AR (nova versão)

Para quem vai manter o programa no LabEEE/UFSC sem ter acompanhado o desenvolvimento. Diz onde está cada coisa, como rodar, testar e publicar, como atualizar dados e traduções, como refazer as validações e o que nunca pode ser quebrado.

- Escrito em 26/10/2026, na branch de integração da Fase 4 (contém as Fases 0 a 4).
- Estado do projeto naquela data: a `main` está na Fase 2 (passo F2.9, teste com usuários); as Fases 3 e 4 estão em branches de integração, à espera dos portões 2, 3 e 4. As decisões 0018 a 0041 citadas aqui estão aceitas por delegação (pré-revisão do Claude, 27/10/2026), com validação por colegas pendente (`docs/decisoes/README.md`). O estado corrente fica sempre no "Você está aqui" de `docs/ROADMAP.md`, que prevalece sobre este guia.
- Onde este guia disser "depende do Anthony ou do LabEEE", a informação não existe no repositório: não suponha, pergunte.

## 1. O que é o programa e onde está

O SOL-AR (nova versão) é a carta solar, o transferidor de ângulos (α, β, γ, referência interna e externa) e o projeto de proteções solares no navegador, com dados climáticos atuais. É a nova versão do Analysis SOL-AR 6.2, pedida pelo Prof. Roberto Lamberts; a manutenção futura é do LabEEE (decisão 0007). O dono do produto e validador técnico durante o desenvolvimento é Anthony Aliardi.

| O quê | Onde |
|---|---|
| Repositório | `https://github.com/1totone/novo-solar` (público, conta pessoal 1totone) |
| Site (build da `main`) | `https://1totone.github.io/novo-solar/` |
| Prévia de cada PR aberto | `https://1totone.github.io/novo-solar/pr/<número>/`, com link no status "Prévia" do PR |
| Versão anterior (6.2) | `https://labeee.ufsc.br/downloads/softwares/analysis-sol-ar` |
| Roteiro e estado | `docs/ROADMAP.md` |

O endereço do GitHub serve para prévias e não deve ser divulgado como definitivo: se o repositório mudar de conta, o GitHub redireciona o repositório, mas não o endereço do GitHub Pages (ROADMAP, seções 7 e 7.1). O endereço definitivo depende do Anthony e do LabEEE (seção 3.4 abaixo).

**Licença e créditos.** Licença MIT (`LICENSE`, decisão 0003). Os créditos da versão original são obrigatórios e aparecem no `README.md`, na tela "Sobre" (chaves `about.*` em `src/ui/i18n/messages.pt-BR.ts`), no `CITATION.cff` e no `.zenodo.json`:

- Versão original (Analysis SOL-AR 6.2, LabEEE/UFSC): pesquisa e desenvolvimento de **Roberto Lamberts** e **Alexandra Albuquerque Maciel**; programação de **Edson T. Ono**.
- Nova versão (2026): Anthony Aliardi, a pedido do Prof. Roberto Lamberts; desenvolvimento assistido por IA (Claude, Anthropic); manutenção futura: LabEEE/UFSC.

O teste `tests/metadados.test.ts` falha se os três nomes da versão original saírem do `CITATION.cff` ou do `.zenodo.json`.

## 2. Arquitetura

### 2.1 Princípios técnicos (decisão 0004)

- **100% estático:** HTML, JavaScript e dados prontos, sem servidor, sem banco de dados, sem contas, sem rastreamento. Qualquer lugar que sirva arquivos publica o programa.
- **Pilha:** TypeScript (strict), Vite, React; SVG para a carta e os gráficos; Three.js (0.186.1) só na aba "Vista 3D", num bloco carregado quando a aba abre (cerca de 580 kB, comentário em `vite.config.ts`); Vitest para testes de unidade e de física; Playwright para ponta a ponta.
- **Build portátil:** `base: './'` em `vite.config.ts`; todos os caminhos são relativos. O mesmo `dist/` funciona na raiz de um domínio, num subdomínio ou numa subpasta. Os testes de ponta a ponta provam isso servindo o build em `/qualquer/pasta/` (`playwright.config.ts`).
- **Estado na URL, depois do `#`** (decisão 0009, `src/ui/state/hashState.ts`): pares `chave=valor` em ordem alfabética, por exemplo `#hist=1&local=recife`. O `#` nunca chega ao servidor, então não há rota de servidor. As chaves do link não se traduzem. Os dados horários de um arquivo carregado nunca vão para a URL; o arquivo de projeto (JSON, spec 11, decisão 0028) guarda o link e os arquivos carregados.

### 2.2 `src/core` e `src/ui`

| Pasta | Conteúdo | Regra |
|---|---|---|
| `src/core/` | Física e cálculo puros: `solar/` (NREL SPA, tempo), `chart/` (projeções), `protractor/`, `mask/`, `shading/` (máscara pela geometria, fração ensolarada, indicadores, dimensionamento inverso), `comfort/` (classificação das horas), `overlay/` (células e diferença de climas), `epw/` (leitores de EPW e do CSV do 6.2, tempo da radiação), `wind/` (rosa e perfil de vento), `angles.ts` | Não importa React nem `src/ui/`; não usa `window`, `document`, `localStorage` nem `navigator`. O ESLint (`eslint.config.js`) reprova a mudança se isso acontecer. |
| `src/ui/` | Componentes React, estado na URL (`state/`), traduções (`i18n/`), ajuda (`help/`), catálogo (`catalog/`), dados (`data/`), workers, exportação, vista 3D | A interface nunca contém física: chama o núcleo. |

Consequência prática: todo cálculo físico pode ser testado sem navegador, em `src/core/**/*.test.ts` e em `tests/referencia/`.

### 2.3 Web workers

Os cálculos pesados rodam fora da linha principal, em cinco workers: `src/ui/overlay/cells.worker.ts` (células da carta), `src/ui/shading/shading.worker.ts` (curvas de sombra), `src/ui/annual/annual.worker.ts` (fração ensolarada do ano), `src/ui/sizing/sizing.worker.ts` (dimensionamento pelo período) e `src/ui/didactic/exercise.worker.ts` (conferência dos exercícios). Todos usam a fila comum `src/ui/workers/workerQueue.ts`: um pedido por vez, cache por chave, cancelamento, e o cálculo volta para a linha principal se o worker não carregar ou quebrar (por isso os testes de unidade rodam sem workers). Os workers chamam o mesmo código de `src/core/`.

### 2.4 Uso sem internet (decisão 0031)

- `public/manifest.webmanifest` com `start_url` e `scope` relativos; ícones em `public/`, gerados por `scripts/pwa/icones.mjs` a partir de `public/favicon.svg`.
- O `sw.js` é gerado no build por `scripts/pwa/plugin.ts` a partir de `scripts/pwa/sw-template.js`, com a lista dos arquivos e a versão (`package.json` mais o commit). Só é registrado no build de produção (`src/main.tsx`).
- Na instalação, guarda a aplicação (cerca de 1,2 MB). Os dados históricos (CSV do 6.2, cerca de 10 MB) não: cada cidade fica guardada quando é aberta.
- A página vem da rede quando há internet e da cópia guardada quando não há. Uma versão nova passa a valer quando as abas antigas fecham.
- Cada prévia de PR tem o seu service worker, fora do escopo do endereço principal.
- Nenhuma requisição sai do endereço da aplicação; `e2e/offline.spec.ts` confere.

### 2.5 O que carrega sob demanda (decisão 0039)

O bloco inicial de JavaScript tem só o caminho básico (passos 1 a 5, carta, transferidor, máscara, dados, rosa). Vêm em blocos próprios, com `import()` e `React.lazy`: os passos 6 e 7 (enquanto recolhidos, `src/ui/layout/AdvancedStepStub.tsx` desenha só o título e o resumo), a vista 3D e o Three.js, os textos em espanhol e inglês (`loadLocale` em `src/ui/i18n/i18n.ts`), a ajuda por idioma (`src/ui/help/useHelpContent.ts`, com `use()`), os cartões do modo didático, o catálogo nacional e os dados dele. Ao acrescentar algo que o caminho básico não usa, carregue sob demanda; o CI falha se o bloco inicial passar do orçamento (`npm run orcamento`, seção 3.2).

No computador, os resultados pesados dos passos (mapa do catálogo, mapa mês × hora, classificação e indicadores) aparecem no painel da direita por um portal do React (`src/ui/layout/SideResults.tsx`, decisão 0038); no celular, ficam dentro do passo. Os testes que procuram esses resultados devem procurar na página, não dentro do passo.

### 2.6 Mapa das pastas

| Caminho | O que tem |
|---|---|
| `src/` | Código (seção 2.2); `src/main.tsx` é a entrada |
| `tests/referencia/` | Testes de física contra referências independentes (pvlib, shapely, EnergyPlus, SOL-AR 6.2) |
| `tests/acessibilidade/`, `tests/scripts/`, `tests/metadados.test.ts` | Paleta e contraste; leitura do CHANGELOG; metadados de citação |
| `e2e/` | Testes de ponta a ponta (Playwright), com `e2e/fixtures/` |
| `scripts/` | Release (`changelog.ts`, `release.ts`), servidor estático dos testes (`serve-static.mjs`), service worker e ícones (`pwa/`), catálogo nacional (`catalogo/gerar_catalogo.py`), medição da primeira abertura (`desempenho/primeira-abertura.mjs`) |
| `public/` | Manifesto, ícones, `favicon.svg` e `wireframes/` (esboços das Fases 2 e 3) |
| `.github/workflows/` | `ci.yml`, `pages.yml`, `release.yml` (seção 3) |
| `.github/ISSUE_TEMPLATE/` | Modelos de issue: erro, sugestão, divergência de cálculo (`calculo.yml`) |
| `CHANGELOG.md`, `CITATION.cff`, `.zenodo.json` | Versões, citação e metadados do Zenodo (seção 8) |
| `CLAUDE.md` | Instruções para as sessões do Claude Code; também resume princípios, convenções e comandos |

| Documento | Para que serve |
|---|---|
| `docs/ROADMAP.md` | Fases, passos, critérios de pronto, "Você está aqui", pendências. Fonte da verdade. |
| `docs/decisoes/` | Uma nota por decisão (contexto, decisão, alternativas, consequências); índice em `docs/decisoes/README.md`. Para mudar algo decidido, escreva uma nota nova que substitua a anterior. |
| `docs/spec/` | Especificação técnica: convenções, fórmulas, algoritmos e **tolerâncias** (tabela em `docs/spec/README.md`). |
| `docs/validacao/` | Casos de referência (`casos/`), relatórios (`relatorios/`) e scripts Python (`scripts/`). |
| `docs/referencias/diagnostico-solar-6.2.md` | Engenharia reversa do SOL-AR 6.2: interface, fórmulas, dados e erros conhecidos. |
| `docs/dados/` | Termos de redistribuição das fontes de dados e rascunhos de e-mail às fontes. |
| `docs/i18n/glossario-tecnico.md` | Glossário PT, ES e EN, base das traduções. |
| `docs/lancamento/roteiro-f4.10.md` | Roteiro do lançamento (DOI, endereço, canal de retorno). |
| `docs/ux/`, `docs/apresentacoes/`, `docs/etica/` | Testes com usuários, material dos portões, pacote do comitê de ética. |
| `docs/ideias.md` | Estacionamento de ideias fora da fase atual. |

## 3. Rodar, testar e publicar

### 3.1 Preparar a máquina

1. Node 22 (`.nvmrc` diz `22`; o `package.json` exige `>=22`).
2. `npm ci` na raiz (instala as versões exatas do `package-lock.json`).
3. Para os testes de física que usam EPW real: Python 3 e `python3 docs/validacao/scripts/baixar_epw.py` (seção 3.3).
4. Para os testes de ponta a ponta: o Chromium do Playwright (seção 3.3).

### 3.2 Comandos

| Comando | O que faz |
|---|---|
| `npm ci` | Instala as dependências exatas do `package-lock.json`. |
| `npm run dev` | Servidor de desenvolvimento do Vite (sem service worker). |
| `npm run build` | `tsc -b` e build de produção em `dist/`, com caminhos relativos e o `sw.js`. |
| `npm run preview` | Serve o `dist/` com o Vite. |
| `npm run check` | Formatação, ESLint, tipos e testes de unidade: o que o CI roda antes do build. |
| `npm run format` / `npm run format:check` | Prettier (Markdown e `docs/` ficam de fora, `.prettierignore`). |
| `npm run lint` | ESLint com zero avisos tolerados; inclui a regra que isola `src/core/`. |
| `npm run typecheck` | TypeScript em todos os projetos (`tsc -b`). |
| `npm test` | Vitest: `src/**/*.test.ts` e `tests/**/*.test.ts`, inclusive os de física. |
| `npm run test:watch` | Vitest em modo contínuo. |
| `npm run orcamento` | Soma o JavaScript inicial do `dist/` (script de entrada, `modulepreload` e o que eles importam), com e sem gzip, e falha acima do orçamento de `scripts/orcamento-js.mjs` (decisão 0039). Roda no CI depois do build. Rode `npm run build` antes. |
| `npm run test:e2e` | Playwright sobre o `dist/` servido em `/qualquer/pasta/` (porta 4173), nos projetos "computador" (Desktop Chrome) e "celular" (Pixel 7). Rode `npm run build` antes. |

Versões fixadas que exigem cuidado ao atualizar (CLAUDE.md): TypeScript 6.0 (o `typescript-eslint` ainda não aceitava o 7) e `@playwright/test` 1.63.0.

### 3.3 EPWs de teste e navegador

- **EPWs de teste.** Seis TMYx 2011 a 2025 (Florianópolis, Brasília, Belém, Porto Alegre, Manaus, Concepción), listados em `docs/validacao/casos/epw/manifesto.json` com URL e SHA-256. Não são versionados (decisão 0010). `python3 docs/validacao/scripts/baixar_epw.py` baixa para `.cache/epw/` (pasta ignorada pelo git) e confere o SHA-256; só usa a biblioteca padrão. Sem esses arquivos, os testes de `tests/referencia/` que dependem deles são pulados (`describe.skipIf`) em vez de falhar; no CI eles rodam sempre.
- **Chromium.** Localmente, `npx playwright install chromium` (o CI usa `npx playwright install --with-deps chromium`). Nas sessões do Claude Code na nuvem, o Chromium já vem em `/opt/pw-browsers`. Ao atualizar o Playwright, confira se o navegador correspondente está disponível.
- **Medição da primeira abertura no celular** (opcional): `npm run build && node scripts/desempenho/primeira-abertura.mjs dist 5` (Pixel 7 emulado, CPU 4 vezes mais lenta, rede "Slow 4G"; mediana de N aberturas com cache vazio).

### 3.4 Publicação

| Workflow | Quando roda | O que faz |
|---|---|---|
| `ci.yml` ("CI") | Cada PR, cada push na `main`, ou manual | Job 1: Prettier, ESLint, TypeScript, EPWs de teste (com cache), Vitest, build. Job 2: build e Playwright; em caso de falha, publica `playwright-report/` e `test-results/` como artefato por 7 dias. |
| `pages.yml` ("Pages") | Depois de cada CI verde (`workflow_run`), ou manual | Reconstrói o site inteiro: build da `main` na raiz e build de cada PR aberto do próprio repositório em `pr/<número>/`; publica no GitHub Pages e põe o status "Prévia" com o link em cada PR. |
| `release.yml` ("Release") | Push na `main` que altera o `CHANGELOG.md`, ou manual | Cria as releases que faltam (seção 8). |

Detalhes da publicação (decisão 0008): PRs de forks não ganham prévia; a prévia de um PR fechado sai na publicação seguinte; o build dos PRs roda num job sem permissão de publicar. O GitHub Pages do repositório usa a fonte "GitHub Actions" (ROADMAP, seção 7.2). O rodapé da aplicação mostra "Versão · rótulo · commit" (`BUILD_LABEL` é `main` ou `PR #n` no workflow e `local` num build feito à mão).

### 3.5 Levar para o LabEEE (ROADMAP, seção 7.1)

| Caminho | O que o LabEEE faz | Situação |
|---|---|---|
| Link na página atual do SOL-AR | Botão para o endereço do GitHub | Texto proposto em `docs/lancamento/roteiro-f4.10.md`, seção 4 |
| **Subdomínio (recomendado)**, ex.: `solar.labeee.ufsc.br` | A TI da UFSC cria uma vez um registro CNAME apontando para `1totone.github.io` | Depende do Anthony e do LabEEE. Quando o nome existir, falta configurar o domínio no Pages, trocar o `url` do `CITATION.cff` e os links do README (roteiro, seção 3). Nada disso está feito. As prévias `/pr/<número>/` passariam a ficar sob o domínio oficial. |
| Pasta no servidor do LabEEE, ex.: `labeee.ufsc.br/solar` | Copia a pasta do build a cada versão | Rode `npm ci && npm run build` no commit da versão e copie o **conteúdo** de `dist/` para a pasta. Não há configuração de servidor a fazer: não existem rotas, e os caminhos são relativos. Cada atualização exige nova cópia. |

Cuidados para a pasta no servidor: o servidor precisa entregar os tipos de arquivo do build (o servidor dos testes, `scripts/serve-static.mjs`, declara `.html`, `.js`, `.css`, `.svg`, `.png`, `.json`, `.webmanifest`, `.epw` e `.csv`); o service worker só é aceito pelo navegador em HTTPS (ou `localhost`), então sem HTTPS a aplicação abre, mas não funciona sem internet.

### 3.6 Fluxo de mudança

O projeto foi conduzido assim (CLAUDE.md e ROADMAP, seção 4), e o fluxo continua válido para o LabEEE:

1. Uma mudança por branch e por PR; nunca direto na `main`.
2. Se a mudança toca física: primeiro o teste contra referência independente, depois o código (seção 9).
3. CI verde e prévia conferida antes do merge (squash). Nunca integrar com o CI vermelho nem fazer force-push na `main`. Exceção (decisão 0041): os PRs de integração de fase e os que atualizam uma branch de integração com outra entram por merge commit, para não perder a ancestralidade entre as branches.
4. No mesmo PR: `CHANGELOG.md` ("Não lançado"), spec ou ajuda, ROADMAP e, se houver decisão nova, uma nota em `docs/decisoes/`.

## 4. Atualizar o catálogo nacional (TMYx do Climate.OneBuilding.org)

O catálogo (decisão 0034, spec 04, seção 4.5) lista as 579 estações do Brasil com TMYx 2011-2025: metadados, indicadores de qualidade calculados por nós e o link para o zip oficial. **Os arquivos climáticos não vêm com a aplicação**; o usuário baixa o zip, descompacta e carrega o EPW no passo 1.

### 4.1 Passo a passo

1. Ambiente Python com as dependências da validação (seção 7.2):
   ```
   python3 -m venv .venv && .venv/bin/pip install -r docs/validacao/scripts/requirements.txt
   ```
2. Gerar, com uma pasta de cache **fora do repositório**:
   ```
   .venv/bin/python -I scripts/catalogo/gerar_catalogo.py --cache /caminho/da/cache
   ```
   Opções: `--limite N` (só as N primeiras estações, para testar) e `--pausa S` (segundos entre downloads, padrão 0,5). A primeira execução baixa cerca de 245 MB, um arquivo por vez, e leva cerca de 20 minutos; as seguintes usam a cache.
3. Conferir (seção 4.3) e abrir um PR com os arquivos gerados e o relatório atualizado.

### 4.2 O que o script lê e escreve

Lê, todos do Climate.OneBuilding.org salvo o mapa: o KML da Região 3 (lista das estações, com fonte, período e anos), o índice do BrazFuture (só para marcar as estações que têm arquivos futuros), cada zip TMYx do Brasil (o EPW é lido dentro do zip, sem extrair) e o Natural Earth 1:50m v5.1.2 (domínio público, SHA-256 conferido; o script para se o SHA-256 ou o número de UFs, 27, não baterem). Não usa nenhum código da aplicação.

| Arquivo gerado | Conteúdo |
|---|---|
| `src/ui/data/catalogo/tmyx-brasil.json` | Uma linha por estação (id WMO, nome, UF, coordenadas, altitude, fuso, período, anos, fonte, link relativo, indicadores de qualidade) |
| `src/ui/data/catalogo/brasil-ufs.json` | Contornos das 27 UFs projetados para o mapa |
| `docs/validacao/casos/catalogo/qualidade-tmyx.csv` | Todos os indicadores, por estação |
| `docs/validacao/casos/catalogo/fontes.json` | Endereço e SHA-256 de cada arquivo lido |

Os indicadores são os da spec 04, seção 4.3: horas, valores ausentes, calmarias, resolução do vento, horas com índice de claridade acima de 0,8, fechamento GHI = DNI · cos z + DHI, tempo da radiação, somas anuais e temperaturas. A UF vem das coordenadas, não do nome do arquivo (o nome erra a sigla em alguns casos); o script corrige a pasta `PB_Paraíba` do KML (404) para `PB_Paraiba`.

### 4.3 Como conferir

```
npx vitest run src/ui/catalog
npm run build && npx playwright test e2e/catalogo.spec.ts
```

`src/ui/catalog/catalogData.test.ts` confere: 579 estações sem id repetido nas 27 UFs; coordenadas, fusos (−2 a −5), período dentro de 2011 a 2025, 8760 ou 8784 horas; formato dos links; as duas estações só de reanálise (Guarantã do Norte e Urubici); e que as cidades de `src/ui/cities.ts` aparecem com as mesmas coordenadas, altitude e fuso. Depois, compare o resumo com `docs/validacao/relatorios/F4.1-catalogo.md` e registre ali o que mudou. Os avisos na tela (distância acima de 50 km, desnível acima de 200 m, menos de 10 anos de dados, arquivo só de reanálise) são propostas da decisão 0034, sem fonte normativa.

### 4.4 Quando sair uma nova série de TMYx

O script e os testes estão escritos para a série 2011-2025: o nome da série aparece fixo no script (expressão do KML), em `src/ui/catalog/catalog.ts`, em `src/ui/cities.ts`, nos textos das traduções e da ajuda, nos testes e nos scripts de validação. Para trocar de série, encontre todas as ocorrências com `grep -rn "2011-2025\|2011 a 2025\|2011 to 2025" src scripts tests e2e docs/validacao/scripts`, troque em conjunto e refaça as referências que dependem dos arquivos (manifesto dos EPWs de teste, `catalogo-cidades.json`, seção 5). Isso é uma mudança de dados com efeito em testes de física: trate como passo próprio, com PR e relatório.

### 4.5 Termos de redistribuição

Resumo de `docs/dados/termos-de-redistribuicao.md` (pesquisa de 26/10/2026, não é parecer jurídico). **Regra do projeto: sem permissão escrita e clara, não redistribuir; o catálogo traz metadados e o link oficial.**

| Fonte | Redistribuir? | Situação |
|---|---|---|
| Climate.OneBuilding.org, TMYx | Indeterminado; tratar como não | Sem licença ("All Rights Reserved"); base ISD da NOAA com aviso de não redistribuição fora dos EUA; dados da ASHRAE no arquivo. Sem CORS: o navegador não consegue baixar o arquivo para dentro da aplicação. |
| EPW do INMET (LabEEE) | Indeterminado | Fora do catálogo até a resposta do Prof. Lamberts; o próprio LabEEE os marca como "not recommended". |
| BrazFuture (Zenodo) | Sim, condicionado (CC BY 4.0 na v1.0; licença da v1.1.1 a conferir) | Link para o Zenodo e citação; embutir só depois de conferida a licença da versão. |
| Natural Earth | Sim (domínio público) | Embutido no mapa, com crédito na legenda. |

O pedido de permissão e de CORS ao OneBuilding está em rascunho em `docs/dados/rascunhos-de-email.md`; o envio e a resposta dependem do Anthony. Com permissão escrita, embutir os arquivos exige revisar a decisão 0034 (e a 0010) numa nota nova.

## 5. Dados históricos e cidades

### 5.1 Como chegam à aplicação

- **Cidades:** `src/ui/cities.ts` tem as 16 cidades (as 15 do SOL-AR 6.2 e Manaus, caso de UTC−4), em ordem alfabética, com Florianópolis como padrão. Coordenadas, fuso e elevação vêm do cabeçalho do EPW TMYx da estação do aeroporto, a mesma das TRY (decisão 0017). Cada cidade tem o link `sourceUrl` do TMYx e, se tiver dados do 6.2, o bloco `historical` (arquivo, tipo `try` ou `iwec`, período, atraso da radiação em minutos, horas de global incoerente).
- **Dados históricos:** os 15 CSV do 6.2 ficam em `docs/validacao/casos/solar-6.2/<cidade>.csv` (dados do próprio LabEEE, versionados pela decisão 0010). `src/ui/data/historical.ts` os inclui no build com `import.meta.glob` (exceto `Latitudes.csv`, os `*.ventos.csv` e `teste-hora.csv`); o Vite os copia para `dist/assets/` e cada um só é baixado quando o usuário abre os dados históricos daquela cidade. Os arquivos não têm cabeçalho: o local vem do catálogo de cidades. Origem dos CSV: o instalador `Analysis_SolAr_6_2.zip`, extraído por `docs/validacao/scripts/extrair_solar62.py` (SHA-256 em `docs/validacao/casos/solar-6.2/README.md` e `SHA256SUMS-original.txt`).
- **Catálogo nacional:** separado das cidades (seção 4), em `src/ui/data/catalogo/` e `src/ui/catalog/`, carregado só quando aberto.

### 5.2 O que a decisão 0017 manda mostrar

Para os dados históricos (código em `src/ui/SitePanel.tsx`, textos `site.*` nas traduções):

- selo "dados históricos";
- origem: TRY da estação do aeroporto, de Goulart, Lamberts e Firmino (1998); Concepción: IWEC (ASHRAE);
- período: ano de referência escolhido entre 1961 e 1970 (entre 1951 e 1970 em Natal, Porto Alegre, Recife e São Paulo); Concepción sem período informado;
- fuso −3 nas cidades brasileiras e −4 em Concepción;
- avisos sobre a radiação, **sem alterar nenhum valor**: "radiação estimada por modelo" (TRY); atraso ou adiantamento em relação ao sol real quando for de 5 min ou mais (o modelo pôs o sol na longitude de Florianópolis, 48,34° O, em todas as cidades); horas em que a global contradiz a extraterrestre do próprio arquivo (Concepción).

O tratamento da radiação histórica (mostrar como está, com avisos) estava para confirmar no portão 2 (pendência do Anthony no ROADMAP).

### 5.3 Acrescentar ou trocar uma cidade

1. Acrescente a cidade à lista `CITIES` de `docs/validacao/scripts/catalogo_cidades.py` (id, nome, arquivo do 6.2 ou `None`, nome no `Latitudes.csv`, caminho do TMYx no OneBuilding) e rode `python3 docs/validacao/scripts/catalogo_cidades.py`. Ele baixa os zips, confere o cabeçalho `LOCATION` e grava `docs/validacao/casos/epw/catalogo-cidades.json`.
2. Acrescente a cidade em `src/ui/cities.ts` com os valores desse JSON, na mesma ordem.
3. Rode `npm test`: `tests/referencia/catalogoCidades.test.ts` confere ordem, nome, coordenadas, fuso, elevação, link, estação e WMO contra o JSON; `src/ui/catalog/catalogData.test.ts` confere contra o catálogo nacional.
4. Os ids dos seis EPWs de teste não podem mudar: links antigos dependem deles (o mesmo teste confere).

### 5.4 Acrescentar ou corrigir dados históricos

1. Ponha o CSV (formato do 6.2, seção 4.2 da spec 04) em `docs/validacao/casos/solar-6.2/`, em UTF-8, e registre a origem e o SHA-256 no `README.md` da pasta.
2. Rode `python3 docs/validacao/scripts/analisar_radiacao_csv62.py` (grava `radiacao-csv.json`, com o atraso da radiação e as horas incoerentes, para as cidades de `catalogo-cidades.json`) e `python3 docs/validacao/scripts/gerar_referencia_csv62.py` (grava `referencia-csv.json`, usado por `tests/referencia/csvSolar62.test.ts`).
3. Preencha o bloco `historical` da cidade em `src/ui/cities.ts`. O `radiationLagMin` e o `inconsistentGlobalHours` têm de ser os de `radiacao-csv.json`; `tests/referencia/catalogoCidades.test.ts` confere, e `src/ui/data/historical.test.ts` confere que os CSV publicados são exatamente os das cidades.
4. Se a origem ou o período forem outros (nem TRY nem IWEC), os textos de origem e período em `SitePanel.tsx` e nas traduções precisam de chaves novas; a decisão 0017 não cobre esse caso, então registre uma decisão nova.
5. Os CSV também alimentam a regressão contra o 6.2 (`regressao_solar62.py`, relatório F2.8); confira se ela precisa ser refeita.

## 6. Traduções e ajuda

### 6.1 Como funciona (decisões 0009 e 0029)

- Módulo próprio em `src/ui/i18n/`, sem biblioteca externa. Todo texto da interface passa por `t('chave')`; nenhum texto fica fixo nos componentes.
- **O português é a referência:** `messages.pt-BR.ts`, que junta `messages.pt-BR.fase3.ts` e `messages.pt-BR.fase4.ts`. As chaves do português definem o tipo `MessageKey`. `messages.es.ts` e `messages.en.ts` são do tipo `Catalog` (as mesmas chaves): chave faltando ou sobrando não compila.
- Parâmetros no formato `{nome}`. Listas separadas por vírgula (`chart.monthsShort`, `annual.monthsLong`, `compass.points`) têm o mesmo número de itens em todos os idiomas.
- Formatos em `src/ui/i18n/i18n.ts`: números com `Intl.NumberFormat` (vírgula em PT e ES, ponto em EN); hora "11h32" em português e "11:32" em ES e EN; dia e mês "11/02" em PT e ES e "11 Feb" em EN. O CSV exportado mantém ponto decimal e os nomes das colunas.
- Idioma: o primeiro do navegador que a aplicação tem, senão português; a escolha no seletor fica só neste navegador (`localStorage`, chave `sol-ar:idioma`, em `I18nProvider.tsx`). **O idioma não vai para o link.** O `lang` do documento acompanha o idioma.
- **Glossário técnico primeiro:** `docs/i18n/glossario-tecnico.md`. α, β e γ ficam com as letras gregas e as definições do 6.2 nas três línguas (sem trocar por VSA ou HSA, só com a equivalência onde ajuda); referência interna e externa traduzidas ao pé da letra; termos do EnergyPlus e da ASHRAE com o nome dessas fontes; chaves do link e do arquivo de projeto não se traduzem.

### 6.2 Revisar ou acrescentar textos

1. Escreva ou altere o texto em português (no arquivo da fase correspondente) e, na mesma mudança, em `messages.es.ts` e `messages.en.ts`.
2. Use os termos do glossário; se surgir um termo técnico novo, acrescente-o primeiro ao glossário, com a fonte.
3. Rode `npm test`. `src/ui/i18n/i18n.test.ts` confere: as mesmas chaves nos três idiomas; os mesmos marcadores `{nome}` em cada chave; nenhum texto vazio; **nenhum travessão** (caracteres U+2013 e U+2014); texto igual ao português só quando curto (no máximo 3 palavras de 4 letras ou mais), para pegar frase esquecida sem tradução; listas com o mesmo número de itens.
4. `e2e/idiomas.spec.ts` abre a aplicação em inglês e em espanhol (texto, números, pontos cardeais, acessibilidade) e confere a preferência e o link.

As traduções em espanhol e inglês ainda precisam de revisão por falantes nativos da área antes da v1.0 (pendência do Anthony no ROADMAP).

### 6.3 Ajuda

A ajuda (decisão 0032) tem tutorial, exercícios, guia, exemplos resolvidos, glossário, perguntas frequentes e hipóteses. O texto está em `src/ui/help/help.pt-BR.ts`, `help.es.ts` e `help.en.ts`, com a estrutura definida em `src/ui/help/content.ts`. `src/ui/help/help.test.ts` confere a mesma estrutura nos três idiomas, os mesmos ângulos, percentuais e medidas dos exemplos, α, β e γ no glossário, ausência de travessões e de espaços duplos, e que cada exemplo é um link válido. Os números dos exemplos são conferidos pelo núcleo em `tests/referencia/ajudaExemplos.test.ts`: se mudar um exemplo, esse teste diz se os números do texto ainda batem com o cálculo.

### 6.4 Acrescentar um idioma

Não há procedimento documentado além do que o código mostra. Pelo código, os pontos a mexer são:

1. `src/ui/i18n/messages.<código>.ts`, do tipo `Catalog`, a partir do inglês ou do espanhol.
2. `src/ui/i18n/i18n.ts`: `LOCALES`, `LOCALE_NAMES`, o mapa `catalogs` e `detectLocale`; se o formato de hora ou de data for diferente, `formatClock` e `formatDayMonth` (há também um caso `locale === 'en'` em `src/ui/sizing/SizingSection.tsx`).
3. `src/ui/help/help.<código>.ts` e o mapa `CONTENT` em `src/ui/help/useHelpContent.ts`.
4. Testes: os idiomas listados em `src/ui/i18n/i18n.test.ts` (o teste dos idiomas disponíveis espera exatamente `['pt-BR', 'es', 'en']`) e em `src/ui/help/help.test.ts`; um caso em `e2e/idiomas.spec.ts`.
5. Uma coluna nova no glossário técnico e uma decisão nova (a 0029 fixa PT, ES e EN).

Os mapas `catalogs`, `LOCALE_NAMES` e `CONTENT` são do tipo `Record<Locale, ...>`: depois de acrescentar o código em `LOCALES`, o `npm run typecheck` aponta os que faltam.

## 7. Scripts de validação

### 7.1 Para que serve cada um

Todos em `docs/validacao/scripts/`, salvo indicação. Cada um diz no cabeçalho o uso, as entradas, as saídas e as dependências. Rode da raiz do repositório.

| Assunto | Script | O que faz |
|---|---|---|
| Dados de teste | `baixar_epw.py` | Baixa os EPWs do manifesto para `.cache/epw/` e confere o SHA-256 (só biblioteca padrão). |
| | `gerar_referencia_epw.py` | Referência do leitor de EPW com o `pvlib.iotools.read_epw` (`casos/epw/referencia-pvlib.json`). |
| | `catalogo_cidades.py` | Cabeçalhos dos TMYx das 16 cidades e coordenadas das TRY (`casos/epw/catalogo-cidades.json`). |
| | `scripts/catalogo/gerar_catalogo.py` (fora desta pasta) | Catálogo nacional, qualidade e mapa (seção 4). |
| SOL-AR 6.2 | `extrair_solar62.py` | Extrai CSV, rosas e `Latitudes.csv` do instalador do 6.2. |
| | `gerar_referencia_csv62.py` | Referência do leitor do CSV do 6.2, com o módulo `csv` do Python. |
| | `analisar_radiacao_csv62.py` | Tempo e coerência da radiação dos CSV do 6.2 (`radiacao-csv.json`). |
| | `modelo_solar62.py` | Modelo de cálculo do 6.2 reconstruído por desmontagem (módulo usado pela regressão). |
| | `regressao_solar62.py` | Regressão contra o 6.2: carta, hora dos dados e rosa (`regressao.json`). |
| | `transferidor_solar62.py` | Curvas do transferidor como o 6.2 desenha (`casos/transferidor/solar62.csv`). |
| | `figura_teste_hora.py` | Figura do que o 6.2 deve desenhar com `teste-hora.csv`. |
| Sol e carta | `gerar_posicao_solar.py` | Posição solar, nascer e pôr com o pvlib (NREL SPA). |
| | `gerar_linhas_horarias.py` | Pontos das linhas horárias em hora solar verdadeira. |
| | `gerar_projecoes_analemas.py` | Analemas em hora legal, projeções equidistante e cilíndrica e transferidor por fórmulas fechadas. |
| Máscara e sombra | `mascara_tracado_raios.py` | Traçado de raios para a máscara pelos ângulos (só biblioteca padrão). |
| | `tutorial_ufu_figura27.py` | Figura 27 do tutorial da UFU; precisa do PDF do tutorial (não versionado) e do `pdfimages` (poppler-utils). |
| | `tutorial_ufu_fresta.py` | Brise afastado da Figura 26 do tutorial da UFU, por traçado de raios. |
| | `mascara_geometria.py` | Máscara pela geometria com shapely (`casos/mascara/geometria.json`). |
| | `fracao_ensolarada_horaria.py` | Fração ensolarada hora a hora e mapa mês × hora. |
| Ano e indicadores | `classificacao_horas.py` | Classificação das horas com numpy e pythermalcomfort. |
| | `indicadores.py` | Indicadores de sombreamento com pvlib, shapely e a DNI do EPW. |
| | `dimensionamento_inverso.py` | Ângulos exigidos no dimensionamento inverso, com o pvlib. |
| Vento | `rosa_dos_ventos.py` | Estatísticas da rosa em Python puro. |
| | `rosa_vento_avancado.py` | Rosas com filtro térmico e correção de altura e terreno. |
| EnergyPlus | `energyplus_fracao_ensolarada.py` | Fração ensolarada contra o EnergyPlus (F3.8). |
| | `energyplus_indicadores.py` | Radiação direta incidente na janela com e sem as placas (F3.5). |
| | `energyplus_vento.py` | Vento local por altura e terreno (F4.4). |
| Tempo da radiação | `vies_nuvens_try.py` | Viés das nuvens dos dias claros no método do tempo da radiação. |
| | `tempo_radiacao_brazfuture.py` | Tempo da radiação de arquivos BrazFuture (precisa de `--cache`). |

Os scripts **geram** as referências, que ficam versionadas em `docs/validacao/casos/`. Os testes em `tests/referencia/` leem essas referências e rodam sempre, sem Python. Só é preciso rodar um script para criar ou regenerar uma referência. O que cada caso contém está em `docs/validacao/README.md`; o método e os resultados, nos relatórios de `docs/validacao/relatorios/`.

### 7.2 Ambiente Python

`docs/validacao/scripts/requirements.txt` (Python 3.13) fixa: pvlib 0.16.1, pandas 3.1.0, numpy 2.5.4, pillow 13.0.0, shapely 2.2.0, olefile 0.47, cabarchive 0.2.5, pythermalcomfort 4.6.2.

```
python3 -m venv .venv && .venv/bin/pip install -r docs/validacao/scripts/requirements.txt
.venv/bin/python -I docs/validacao/scripts/<script>.py
```

Os scripts que leem EPW esperam os arquivos em `.cache/epw/` (rode `baixar_epw.py` antes). O `-I` (modo isolado) aparece no uso de vários scripts.

### 7.3 Arranjo do EnergyPlus (F3.8)

- **Versão:** EnergyPlus 26.2.0 (build 26.2.0-4bd7a1f26f), pacote Linux oficial `EnergyPlus-26.2.0-4bd7a1f26f-Linux-Ubuntu24.04-x86_64.tar.gz`, de `https://github.com/NREL/EnergyPlus/releases/tag/v26.2.0`. Roda direto no Ubuntu 24.04, sem Docker. **O EnergyPlus não roda no CI.**
- **Modelos:** 8 cenas em 5 locais (Florianópolis, Manaus, Porto Alegre, Belém, Concepción), cobrindo brise, aletas, grelha, lâminas horizontais e verticais, recuo e placas livres. Cada cena: zona em caixa atrás da fachada, janela na parede da frente, cada placa como *Shading:Building:Detailed*; *Solar Distribution* FullExterior; *ShadowCalculation* PolygonClipping com atualização a cada passo de tempo; 6 passos por hora no ano de 2026. O local vem do cabeçalho do EPW de teste.
- **Saídas usadas:** *Surface Outside Face Sunlit Fraction* da janela e os cossenos de incidência (*Surface Outside Face Beam Solar Incident Angle Cosine Value*) da janela, da cobertura e das paredes laterais.

| O quê | Onde |
|---|---|
| Modelos (`.idf`, abrem no EP-Launch ou no IDF Editor) | `docs/validacao/casos/energyplus/modelos/` (8 cenas e `vento.idf`) |
| Referências versionadas | `docs/validacao/casos/energyplus/fracao-ensolarada.json`, `indicadores.json`, `vento.json` (formato em `casos/energyplus/README.md`) |
| Saídas brutas do EnergyPlus (não versionadas) | `.cache/energyplus/`, `.cache/energyplus-f35/`, `.cache/energyplus/vento-*/` |
| Testes (rodam no CI, sem EnergyPlus) | `tests/referencia/energyplus.test.ts`, `energyplusIndicadores.test.ts`, `ventoAvancado.test.ts` |
| Relatórios | `docs/validacao/relatorios/F3.8-energyplus.md`, `F3.5-indicadores.md`, `F4.4-vento.md` |

**Refazer a comparação** (relatório do F3.8, seção 8), por exemplo numa versão nova do EnergyPlus:

1. Baixar e extrair o pacote Linux do EnergyPlus 26.2.0.
2. `python3 docs/validacao/scripts/baixar_epw.py`.
3. Num ambiente com o `requirements.txt`:
   ```
   ENERGYPLUS_DIR=/caminho/EnergyPlus-26.2.0-4bd7a1f26f-Linux-Ubuntu24.04-x86_64 python3 -I docs/validacao/scripts/energyplus_fracao_ensolarada.py
   ```
   O script regrava os modelos e a referência e imprime o resumo. `energyplus_indicadores.py` e `energyplus_vento.py` usam a mesma variável `ENERGYPLUS_DIR`.
4. `npm test` e comparar o resumo impresso com o relatório. O teste reproduz o sol do EnergyPlus 26.2.0 (`SUN3` e `SUN4`) e confere essa reprodução contra 24 passos de cossenos de saída gravados na referência; numa versão nova do EnergyPlus, refaça também essa conferência.

**Critérios da decisão 0019**, na spec 07, seção 7.10. A diferença entre os programas tem duas fontes, e cada uma tem o seu critério:

1. **Geometria, com o mesmo sol** (o sol do EnergyPlus reproduzido no teste, conferido contra os cossenos de saída a 10⁻¹²): por passo, com cos θ ≥ 10⁻³, diferença ≤ 5 × 10⁻⁴ e percentil 99 ≤ 5 × 10⁻⁵; com cos θ < 10⁻³, diferença × cos θ ≤ 5 × 10⁻⁴; hora a hora no ano, ≤ 10⁻⁴ fora das horas com passo rasante, que não podem passar de 1% das horas; nenhum passo com fração positiva no EnergyPlus e sol fora da janela aqui.
2. **Ponta a ponta, cada programa com o seu sol** (SPA na aplicação, `SUN3`/`SUN4` no EnergyPlus): sobre as horas com sol na janela, RMSE ≤ 0,03, viés ≤ 0,002 em módulo, e a mesma geometria com os dois sóis dá o mesmo RMSE (diferença ≤ 0,002).

A aplicação continua com o SPA; o sol do EnergyPlus não é adotado. A tabela de tolerâncias de `docs/spec/README.md` ainda traz "RMSE ≤ 0,02" para essa linha: ela muda quando a decisão 0019 for confirmada na integração da Fase 3. Limitações do EnergyPlus encontradas (úteis em qualquer comparação): geometria em inteiros de 0,01 mm, que apaga frestas de sombra de menos de 0,06 mm, e sombra errada com o sol rasante à fachada.

## 8. Fazer uma versão

As versões saem do `CHANGELOG.md` (decisão 0012). Cada seção `## [X.Y.Z] - AAAA-MM-DD (vX.Y, Nome)` é uma versão lançada; o que ainda não foi lançado fica em `## [Não lançado]`. Versões 0.x são pré-lançamentos (SemVer).

### 8.1 Passo a passo

Num PR (o do portão aprovado, no fluxo do projeto):

1. Mova o conteúdo de "Não lançado" para uma seção nova, exatamente no formato `## [X.Y.Z] - AAAA-MM-DD (vX.Y, Nome)`, e deixe "Não lançado" vazio. Exemplo existente: `## [0.1.0] - 2026-10-23 (v0.1, Esqueleto funcional)`.
2. Atualize a versão no `package.json`. Na v0.1.0, o `package-lock.json` foi atualizado junto (os dois campos `version` do topo).
3. Atualize `version` no `CITATION.cff`. O comentário do arquivo pede também `date-released`; o campo ainda não existe no arquivo e precisa ser acrescentado na primeira versão que o usar. O `tests/metadados.test.ts` confere só a versão.
4. Merge na `main` com o CI verde. O push que altera o `CHANGELOG.md` dispara o `release.yml`, que roda `node scripts/release.ts`: cria a tag `vX.Y.Z` no commit que introduziu o cabeçalho da versão, com o título "vX.Y: Nome" e as notas iguais ao texto da seção; versões que já existem são puladas. O workflow também pode ser disparado à mão.

### 8.2 Conferir antes

- `npm run check`, `npm run build` e `npm run test:e2e` passando; CI verde no PR; prévia conferida.
- O cabeçalho segue o formato (um cabeçalho fora do formato não vira release; o parser tem teste em `tests/scripts/changelog.test.ts`).
- Versões iguais no `CHANGELOG.md`, no `package.json` e no `CITATION.cff`.
- Créditos da versão original no `README.md`, na tela "Sobre", no `CITATION.cff` e no `.zenodo.json`.
- ROADMAP marcado e "Você está aqui" atualizado.

### 8.3 Citação e DOI (decisão 0036)

- `CITATION.cff` (formato 1.2.0): o GitHub mostra "Cite this repository" quando o arquivo está na `main`. Traz o autor da nova versão, a licença, o repositório, o endereço e, nas referências, o Analysis SOL-AR 6.2 com Lamberts, Maciel e Ono.
- `.zenodo.json`: metadados que o Zenodo usa ao arquivar cada release, com os três autores originais como colaboradores ("RelatedPerson") e a relação "nova versão de" com a página do 6.2. Se os autores originais entram como colaboradores ou como autores do depósito é para o LabEEE confirmar (roteiro do F4.10, seção 2).
- **O Zenodo ainda não está ligado ao repositório**: é uma ação única do Anthony (roteiro do F4.10, seção 2). Depois de ligado, cada release do `release.yml` é arquivada e ganha um DOI da versão; para citar o programa em geral, usa-se o DOI do conceito. O DOI ainda não existe; quando existir, entra no `CITATION.cff`, no README e na tela "Sobre".
- O canal de retorno proposto são as issues do GitHub (modelos em `.github/ISSUE_TEMPLATE/`) e um e-mail do LabEEE para quem não tem conta; **o e-mail e quem responde ainda não foram definidos** (dependem do LabEEE). Na v1.0, não há contagem de uso.

## 9. Regras que não podem ser quebradas

1. **Licença MIT e créditos.** Não mudar a licença; não remover os créditos de Roberto Lamberts, Alexandra Albuquerque Maciel e Edson T. Ono.
2. **Sem servidor, sem coleta.** Nada de backend, contas, cookies de rastreamento, coleta de dados pessoais ou dependências pagas. Arquivos climáticos carregados são lidos só no navegador. Se um dia houver contagem de uso, que seja anônima e sem cookies, numa decisão nova.
3. **Sem redistribuir dados sem permissão escrita** (seção 4.5).
4. **Teste de referência antes de mudar física.** Todo cálculo físico tem teste contra referência independente (pvlib/NREL SPA, casos analíticos, shapely, EnergyPlus), e o teste vem antes da implementação. Nunca afirmar que algo "faz sentido físico" sem verificação.
5. **Tolerâncias na spec.** Cada teste de física usa a tolerância escrita em `docs/spec/` (tabela em `docs/spec/README.md`); mudar uma tolerância é mudar a spec, com justificativa e decisão. Exemplos: posição solar contra o pvlib, 0,01°; nascer, pôr e passagem meridiana, 10 s; curvas do transferidor e de máscara em casos analíticos, 0,1°; impressão, ±1 mm no raio.
6. **`src/core/` puro.** Física só no núcleo, sem interface; a interface nunca contém física.
7. **Build portátil.** Caminhos relativos, estado no `#`, nenhuma rota de servidor.
8. **Convenções físicas** (spec 01 e 02; aprovadas no portão 0, decisão 0011):
   - azimute a partir do Norte geográfico, no sentido horário (0° = N, 90° = L);
   - orientação da fachada pelo azimute da **normal externa**;
   - α, β e γ como no SOL-AR 6.2, com as duas referências; externo = 90° − interno; referência interna como padrão ao abrir;
   - posição solar pelo **NREL SPA**, com ΔT fixo de 69 s e ano de referência 2026;
   - o EPW está em hora padrão local; a conversão para UTC e para a hora solar usa o **fuso do cabeçalho do EPW**, **nunca um meridiano fixo** (o 6.2 fixava 45° O, o que desloca os dados em 1 h em UTC−4 e em 2 h no Acre);
   - **convenção horária do EPW:** a linha da hora h descreve o intervalo que termina em h; a radiação é a energia integrada nesse intervalo e é associada ao sol no meio dele (h − 0,5); temperatura e umidade são valores no instante h;
   - unidades SI na interface (°C, m/s, W/m², Wh/m²), vírgula decimal em português.
9. **Nunca** force-push na `main` nem merge com o CI vermelho.

## 10. Quando algo quebrar

### 10.1 Onde olhar

| Sintoma | Onde olhar |
|---|---|
| CI vermelho num PR | Aba "Actions" do GitHub, workflow "CI": o passo que falhou diz se foi formatação, ESLint, tipos, testes ou build. |
| Teste de ponta a ponta falhou no CI | Artefato `playwright-report` do job "Ponta a ponta (Playwright)" (7 dias), com os traces das falhas. |
| PR sem prévia | Workflow "Pages": só roda depois do CI verde; PRs de forks não têm prévia; o log mostra "Não foi possível montar a prévia do PR #n" se o build daquele PR falhou. |
| Release não saiu | Workflow "Release": só roda em push na `main` que altera o `CHANGELOG.md`; confira o formato do cabeçalho. |
| Diferença num cálculo | A spec do módulo, o relatório de validação correspondente e o teste em `tests/referencia/`; os erros conhecidos do 6.2 em `docs/referencias/diagnostico-solar-6.2.md`. |
| Por que algo é assim | `docs/decisoes/` (seção "Alternativas consideradas" de cada nota). |

### 10.2 Perguntas frequentes de manutenção

**O CI falhou em "Formatação (Prettier)".** Rode `npm run format` e envie de novo. Markdown e `docs/` não passam pelo Prettier.

**O ESLint diz "src/core não pode depender de src/ui" ou "src/core não usa React".** Um cálculo do núcleo importou algo da interface. Mova a dependência para `src/ui/` e passe os dados ao núcleo como parâmetro.

**Os testes de referência passam aqui, mas falham no CI (ou o contrário).** Localmente, sem `.cache/epw/`, os testes que usam EPW real são pulados. Rode `python3 docs/validacao/scripts/baixar_epw.py` e repita `npm test`.

**`baixar_epw.py` deu "SHA-256 diferente do manifesto".** O arquivo mudou na fonte. Não atualize o manifesto às cegas: as referências geradas a partir desses EPWs (por exemplo `referencia-pvlib.json`) e os testes que dependem delas precisam ser refeitos e revistos juntos. O Climate.OneBuilding.org devolve 429 a pedidos sem identificação de navegador; os scripts já mandam um User-Agent.

**Falhou `i18n.test.ts`.** A mensagem diz o idioma e a chave: chave faltando, marcador `{nome}` diferente, texto vazio, travessão, ou frase igual ao português (sem tradução).

**Falhou `tests/metadados.test.ts`.** A versão do `CITATION.cff` não é a do `package.json`, ou os créditos saíram de um dos arquivos de citação.

**Falhou `catalogData.test.ts` depois de regenerar o catálogo.** O número de estações (579), as UFs ou os links mudaram na fonte. Confira o que mudou no `fontes.json` e no relatório do F4.1 antes de ajustar o teste; ajustar o teste é aceitar a mudança dos dados.

**Publiquei uma versão nova e o navegador mostra a antiga.** É o service worker: a versão nova se instala em segundo plano e passa a valer quando todas as abas da aplicação fecham. O rodapé mostra a versão e o commit em uso. No `npm run dev` não há service worker.

**A aplicação numa pasta do servidor não funciona sem internet.** Confira se o endereço é HTTPS (seção 3.5).

**Preciso mexer num ponto que o ROADMAP, as decisões e a spec não cobrem.** Registre a proposta em `docs/decisoes/` (modelo no `README.md` da pasta) e, se for física, didática ou produto, leve ao responsável técnico antes de implementar. Ideias fora da fase atual vão para `docs/ideias.md`.

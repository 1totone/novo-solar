# 0029. Idiomas: português, espanhol e inglês (F4.6)

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 12 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). As traduções precisam de revisão por falantes nativos da área.

## Contexto

A decisão 0005 previu a estrutura de tradução desde o início; o ROADMAP pede PT, ES e EN no F4.6, e a instrução da sessão pede o glossário técnico antes das traduções. Faltava decidir como o idioma é escolhido, se ele vai para o link, como ficam os números, as horas e as datas, e o que não se traduz.

## Decisão

1. **Três catálogos com as mesmas chaves** (`src/ui/i18n/messages.pt-BR*.ts`, `messages.es.ts`, `messages.en.ts`); o português é a referência. Um teste confere chaves, marcadores `{nome}`, listas (meses, rosa dos ventos), ausência de travessão e de frases longas sem tradução.
2. **Glossário técnico primeiro** (`docs/i18n/glossario-tecnico.md`): α, β e γ continuam com as letras gregas e as definições do SOL-AR 6.2 nas três línguas, com a equivalência da literatura em inglês onde ajuda (α externo = *vertical shadow angle*; β externo = *horizontal shadow angle*); referência interna e externa traduzidas ao pé da letra; termos do EnergyPlus e da ASHRAE com os nomes dessas fontes.
3. **Idioma pelo navegador, com escolha guardada neste navegador:** o primeiro idioma do navegador que a aplicação tem (pt, es ou en de qualquer região; senão, português); o seletor no cabeçalho troca o idioma e guarda a escolha só neste navegador. **O idioma não vai para o link**: o mesmo link abre no idioma de quem o abre, e as chaves do link e do arquivo de projeto não se traduzem.
4. **Formatos:** números pelo idioma (vírgula decimal em PT e ES, ponto em EN); hora do relógio "11h32" em português (como no ensino brasileiro) e "11:32" em ES e EN; dia e mês "11/02" em PT e ES e "11 Feb" em EN (sem a ambiguidade de 11/02 em inglês); "hora legal" vira "hora oficial" em ES e *standard time* em EN. O CSV exportado mantém ponto decimal e os nomes das colunas; só as linhas de comentário (`#`) mudam de idioma.
5. **`lang` do documento** acompanha o idioma (leitores de tela pronunciam certo).

## Alternativas consideradas

- **Idioma no link** (`#idioma=es`): um professor mandaria o link já em espanhol, mas o mesmo link abriria em espanhol para um aluno brasileiro; o idioma é preferência de quem lê, não estado da análise.
- **Traduzir α, β e γ para VSA e HSA no inglês:** mais familiar para leitores da literatura em inglês, mas quebraria o método e o vocabulário do ensino brasileiro (princípio 4) e confundiria quem alterna idiomas.
- **Hora "11:32" também em português:** mais internacional, mas o material de ensino brasileiro escreve "11h32", e os testes e as figuras do F2 e do F3 já usam esse formato.

## Consequências

- Seletor de idioma no cabeçalho (some na impressão); `src/ui/i18n/` com detecção, preferência e formatos; textos que estavam fixos no código (meses dos períodos, letras dos lados, frase do separador do CSV, horas e datas) passaram ao catálogo ou aos formatos do idioma.
- Os testes de ponta a ponta rodam com o navegador em português; `e2e/idiomas.spec.ts` abre em inglês e em espanhol (texto, números, pontos cardeais, axe) e confere a preferência e o link.
- **Pendência:** revisão das traduções em espanhol e inglês por falantes nativos da área (lista para o Anthony), antes da v1.0.

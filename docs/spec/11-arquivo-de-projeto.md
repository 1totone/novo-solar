# 11. Arquivo de projeto e link

**Status:** proposta (F4.7, decisão 0028). Implementação: `src/ui/state/projectFile.ts` (formato, leitura e versões) e `src/ui/project/ProjectSection.tsx` (salvar, abrir e copiar o link, no passo 5). Testes: `src/ui/state/projectFile.test.ts`, o projeto de exemplo `src/ui/state/fixtures/projeto-v1.json` e `e2e/projeto.spec.ts`.

O estado da análise vive no `#` da URL (decisão 0004): o link reabre o mesmo local, a fachada, a proteção, os dados sobre a carta, as opções e os passos 6 e 7. O arquivo de projeto guarda esse mesmo estado e o que o link não pode levar.

## 11.1 O que o link guarda e o que só o projeto guarda

| Parte | Link | Projeto |
|---|---|---|
| Local do catálogo, dados históricos, local de um arquivo (nome, latitude, longitude, fuso, altitude) | sim | sim (o mesmo texto do link) |
| Fachada, proteção, dados sobre a carta, rosa dos ventos, passos 6 e 7, projeção, comparação (configuração A) | sim | sim |
| Arquivo climático carregado do computador (EPW ou CSV do SOL-AR) | não: fica só na memória do navegador e nunca sai dele | sim, o texto inteiro, como foi lido |
| Arquivo climático da configuração A da comparação, quando é outro arquivo carregado | não | sim |
| Opções de impressão do passo 5 (raio, o que incluir) | não | sim |
| Desenho à mão em andamento, painéis abertos ou fechados, posição da rolagem | não | não |

O link não leva o arquivo climático porque ele pode ter 1,6 MB e porque o link é feito para ser compartilhado: o arquivo do usuário só sai do computador dele se ele mesmo mandar o projeto. Sem o arquivo, o link de um local de arquivo abre com o local e pede os dados de novo, como hoje.

## 11.2 Formato (esquema 1)

JSON em UTF-8, extensão `.json`, nome sugerido `solar-<local>-projeto.json`. Campos:

| Campo | Tipo | Conteúdo |
|---|---|---|
| `format` | texto | sempre `"sol-ar-project"`; identifica o arquivo |
| `schema` | inteiro | versão do esquema; esta seção descreve a 1 |
| `app` | objeto | `version` e `commit` da aplicação que salvou (informativo) |
| `savedAt` | texto | data e hora em que foi salvo, ISO 8601 em UTC (informativo) |
| `state` | objeto de textos | o estado do link: as mesmas chaves e os mesmos valores do `#`, com o texto digitado (ex.: `"o": "30"`, `"va": "4,5"`) |
| `print` | objeto | opções de impressão: `radiusCm` (2 a 20), `protractor`, `mask`, `data`, `legend`, `protractorOnly`, `geometry` (lógicos) |
| `climateFile` | objeto ou `null` | o arquivo climático carregado, quando o local é um arquivo (`state.local` = `arquivo`) |
| `compareClimateFile` | objeto, `"same"` ou `null` | o arquivo da configuração A da comparação, quando ela usa um arquivo carregado; `"same"` quando é o mesmo da configuração atual |

Um arquivo climático é `{ "name", "format", "hours", "text" }`, com `format` `"epw"` ou `"csv"` (CSV do SOL-AR 6.2), `hours` o número de linhas horárias lidas e `text` o conteúdo do arquivo como foi lido (depois da decodificação para texto). Um CSV sem cabeçalho de local leva também `location`: `{ "name", "latitude", "longitude", "timeZone", "elevation" }`, o local digitado ao abrir o CSV.

Exemplo (sem arquivo climático):

```json
{
  "format": "sol-ar-project",
  "schema": 1,
  "app": { "version": "0.1.0", "commit": "f9b8675" },
  "savedAt": "2026-10-26T13:20:00.000Z",
  "state": { "local": "florianopolis", "o": "30", "a1": "55" },
  "print": { "radiusCm": 6, "protractor": true, "mask": true, "data": true, "legend": true, "protractorOnly": false, "geometry": true },
  "climateFile": null,
  "compareClimateFile": null
}
```

## 11.3 Abrir

1. O arquivo precisa ser JSON com `format` igual a `"sol-ar-project"`; senão, a tela diz que não é um projeto do SOL-AR e nada muda.
2. **Versões:** esquema maior que o da aplicação: recusado, com o aviso de que o projeto foi salvo numa versão mais nova. Esquema menor: convertido passo a passo até o atual (não há conversão no esquema 1). Cada mudança de esquema ganha uma função de conversão e um projeto de exemplo da versão anterior nos testes.
3. **Estado:** só os pares com valor de texto entram; o `#` passa a ser exatamente o do projeto (as chaves que não estão nele são apagadas). Chaves desconhecidas ficam no link e são ignoradas, como num link escrito à mão. As chaves antigas continuam valendo pelas mesmas regras dos links (ex.: um projeto sem `cm` e com `ca` abre a faixa adaptativa, decisão 0024).
4. **Arquivo climático:** lido de novo pelo mesmo leitor do passo 1 (EPW, ou CSV com o `location` guardado quando não tem cabeçalho). Se a leitura falhar, nada muda e a tela mostra o erro do leitor.
5. **Impressão:** valores ausentes ou fora da faixa ficam no padrão (raio de 6 cm, tudo incluído, sem "só o transferidor").
6. A tela confirma: nome do projeto, data em que foi salvo e o arquivo climático, se houver.

A comparação: a configuração A lê os dados do próprio link (dados históricos de uma cidade) ou do `compareClimateFile` (arquivo carregado). Com o mesmo raciocínio, um link de comparação com a A em dados históricos passa a abrir a A com os dados.

## 11.4 Salvar e copiar o link

- "Salvar projeto" grava o arquivo com o estado do link, as opções de impressão e os arquivos climáticos carregados que o estado usa. O tamanho aparece antes de salvar quando há arquivo climático (em geral de 1 a 2 MB).
- "Copiar link" copia o endereço da página com o `#` atual; é o jeito de pegar o link quando a aplicação está instalada e não mostra a barra de endereço (F4.6). A tela lembra o que o link não leva (seção 11.1).

## 11.5 Compatibilidade

- O `state` do projeto e o `#` do link são o mesmo objeto: abrir um projeto e copiar o link dá o link de quem salvou; salvar o projeto a partir de um link guarda exatamente as chaves dele (conferido nos testes com as chaves de todos os passos).
- Os links atuais não mudam. O formato do projeto não depende da língua da interface.
- Nenhum dado sai do navegador: salvar é um download local e abrir lê um arquivo local.

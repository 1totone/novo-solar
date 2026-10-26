# 0028. Arquivo de projeto e link (F4.7)

- Data: 2026-10-26
- Status: proposta (F4.7 na branch de integração da Fase 4; a confirmar com o Anthony no portão 4)

## Contexto

O ROADMAP pede, no F4.7, salvar e abrir um arquivo de projeto e um link que reabra o mesmo estado; a instrução da sessão pede JSON com versão de esquema, compatível com os links atuais. O estado da análise já vive no `#` da URL (decisão 0004), mas o link não leva o arquivo climático carregado pelo usuário (só fica na memória do navegador) nem as opções de impressão; e, com a aplicação instalada (F4.6), não há barra de endereço para copiar o link.

## Decisão (proposta)

1. **Projeto em JSON com esquema versionado** (`format: "sol-ar-project"`, `schema: 1`), com o estado do link (`state`, as mesmas chaves e os mesmos textos do `#`), as opções de impressão e o texto dos arquivos climáticos carregados que o estado usa (o da configuração atual e o da A da comparação, sem repetir quando é o mesmo). Spec 11.
2. **O link continua sendo o estado da análise**; o projeto é o link mais o que não cabe nele (arquivos climáticos e opções de impressão). Abrir um projeto troca o `#` inteiro pelo do projeto.
3. **Versões:** esquema mais novo que o da aplicação é recusado com aviso; esquemas antigos são convertidos passo a passo, com um projeto de exemplo de cada versão nos testes.
4. **Onde fica:** uma seção "Projeto" no passo 5, com "Salvar projeto", "Abrir projeto" e "Copiar link", e uma frase sobre o que o link não leva.
5. **A configuração A da comparação lê os próprios dados** (dados históricos pelo link, arquivo pelo projeto), em vez de guardar só uma cópia na memória.

## Alternativas consideradas

- **Opções de impressão no link:** o link de uma aula levaria o raio da impressão; mas são preferências de saída, como as do diálogo de impressão do navegador, e mudariam o link de quem só ajusta a impressão. Ficam no projeto.
- **Projeto sem o arquivo climático, com nome e soma de verificação**, pedindo o arquivo ao abrir: arquivo menor, mas o projeto deixaria de abrir sozinho (em outro computador ou sem o arquivo original), que é o motivo de existir além do link.
- **Abrir o projeto pelo mesmo campo do arquivo climático no passo 1:** um campo só, mas mistura duas coisas e muda o texto do passo 1 (usado nas tarefas do teste com usuários).
- **Projeto em formato compactado (zip):** menor, mas exige uma dependência e deixa de ser legível num editor de texto; o JSON com o EPW tem de 1 a 2 MB.

## Consequências

- Spec 11 (formato, abrir, salvar, compatibilidade); `src/ui/state/projectFile.ts` e a seção "Projeto" no passo 5; testes de ida e volta com as chaves de todos os passos, projeto de exemplo do esquema 1 e ponta a ponta (salvar, abrir em outra página, erros, copiar o link).
- O arquivo do usuário só sai do computador se ele mesmo mandar o projeto; a tela diz que o projeto leva o arquivo climático.
- Um link de comparação com a A em dados históricos passa a abrir a A com os dados (antes, só a comparação começada na própria sessão tinha os dados da A).
- Se o Anthony preferir a impressão no link, as opções passam para chaves do `#` e saem do projeto, sem mudar o esquema (o campo `print` fica opcional).

# 0049. Botão "Compartilhar" no cabeçalho

- Data: 2026-10-27
- Status: proposta (item i da decisão 0044; escolhas do Claude sem base clara, marcadas abaixo).

## Contexto

No piloto do F2.9 (problema 10 de `docs/ux/F2.9-piloto-P0.md`), a tarefa 9 pedia para mandar a um colega um link que abrisse exatamente o que se via, e a lógica do link não ficou clara. O endereço já guardava a análise (decisão 0009), mas nada na tela dizia isso; o "Copiar link" ficava na seção "Projeto" do passo 5. O Anthony pediu um botão "Compartilhar" no cabeçalho, que copie o link e diga que ele reabre a mesma análise (decisão 0044, item i).

## Decisão

1. **"Compartilhar" no cabeçalho**, ao lado de "Ajuda", sempre à vista. Copia o endereço da página e abre, logo abaixo, um painel com:
   - a confirmação e o que o link reabre ("Link copiado. Ele reabre esta mesma análise: o local, a fachada, os ângulos, os dados escolhidos e as opções da carta.");
   - como funciona: tudo fica no próprio endereço, depois do "#", nada é guardado num servidor, e o link muda a cada ajuste;
   - com um arquivo climático carregado (na análise ou na comparação), o aviso de que ele não vai no link e de que o projeto salvo no passo 5 o guarda;
   - o próprio link, num campo só de leitura, para conferir e para copiar à mão.
2. **Quando o navegador não deixa copiar** (sem HTTPS ou com a permissão negada), o painel diz isso, e o campo do link já vem pronto para selecionar e copiar.
3. **Proposta: copiar, sem a folha de compartilhamento do sistema** (Web Share API) no celular. O pedido foi copiar e explicar; a folha do sistema muda de um aparelho para outro e esconde o link. Fica em `docs/ideias.md`.
4. O painel fecha com "Fechar" ou Esc, e o foco volta ao botão. O "Copiar link" do passo 5 continua, junto de salvar e abrir projeto.

## Alternativas consideradas

- **Só uma mensagem passageira ("Link copiado")**: não responde à dúvida do piloto, que era o que o link guarda.
- **Encurtar o link:** precisaria de um serviço externo, contra o princípio 6 (sem servidor).

## Consequências

- `src/ui/layout/ShareButton.tsx`, no cabeçalho do `App`; textos nos três idiomas; a ajuda (guia rápido e perguntas frequentes) cita o botão.
- Teste de ponta a ponta (`e2e/compartilhar.spec.ts`): o link copiado é o endereço da página e, aberto em outra aba, reabre a mesma fachada, o mesmo brise e a mesma referência; o aviso do arquivo carregado; sem permissão para copiar, o campo selecionável e a frase para copiar à mão; Esc devolve o foco ao botão; axe no cabeçalho com o painel aberto; no celular, o painel cabe na tela.
- Página do teste: a tarefa 9 muda de texto no PR do item j.

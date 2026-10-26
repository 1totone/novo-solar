# F4.10: roteiro do lançamento

Preparação feita na integração da Fase 4 (decisão 0036, proposta). O que depende do Anthony e do LabEEE está marcado; o Claude faz o resto num PR quando cada resposta chegar.

## 1. O que já está pronto

- `CITATION.cff` (Citation File Format 1.2.0, validado com o `cffconvert`): o GitHub mostra "Cite this repository" com o autor da nova versão, a licença, o endereço e a versão original do SOL-AR (Lamberts, Maciel e Ono) nas referências.
- `.zenodo.json`: os metadados que o Zenodo usa ao arquivar cada release (título, descrição com os créditos da versão original, autor, licença MIT, palavras-chave e a relação "nova versão de" com a página do SOL-AR 6.2 no LabEEE).
- `tests/metadados.test.ts`: confere que a versão do `CITATION.cff` é a do `package.json` e que os créditos estão nos dois arquivos.
- Modelos de issue em `.github/ISSUE_TEMPLATE/` (erro, sugestão, divergência de cálculo): valem quando chegarem à `main`.
- Build portátil (F0.3) e releases pelo workflow `release.yml` a partir do `CHANGELOG.md` (decisão 0012).

## 2. DOI pelo Zenodo (Anthony, uma vez)

1. Entrar em zenodo.org com a conta do GitHub ("Log in" e "GitHub").
2. No menu da conta, "GitHub": ligar o repositório `1totone/novo-solar`.
3. A próxima release do workflow `release.yml` é arquivada pelo Zenodo, que gera dois DOIs: o da versão e o do conceito (todas as versões). Para citar o programa em geral, o do conceito.
4. Depois, o Claude põe o DOI do conceito no `CITATION.cff`, um selo no README e a citação na tela "Sobre".

Antes do primeiro depósito (opcional): ORCID e afiliação do Anthony nos dois arquivos; confirmar com o LabEEE se os autores da versão original entram como colaboradores (proposta, como "RelatedPerson") ou como autores; comunidade do LabEEE no Zenodo, se houver. O `zenodo.org` está bloqueado na rede das sessões: para o Claude conferir o depósito, liberar o domínio no ambiente (ROADMAP, seção 7.2).

O arquivo do Zenodo é o zip do código da release: não tem EPWs de terceiros (decisão 0010); tem os CSV do SOL-AR 6.2, já publicados com a aplicação (decisão 0017).

## 3. Endereço definitivo (Anthony e LabEEE)

Recomendação da seção 7.1 do ROADMAP: subdomínio, por exemplo `solar.labeee.ufsc.br`, com um registro CNAME da TI da UFSC apontando para `1totone.github.io`. Quando o nome existir, o Claude acrescenta o domínio ao workflow do Pages e troca o `url` do `CITATION.cff` e os links do README. O GitHub redireciona o endereço `github.io` para o domínio próprio. Atenção: as prévias de cada PR (`/pr/<número>/`) passariam a ficar sob o domínio oficial; se o LabEEE preferir, elas podem ir para outro lugar.

## 4. Página no LabEEE (se houver parceria)

Texto proposto para a página atual do SOL-AR:

> **SOL-AR (nova versão).** Carta solar, transferidor de ângulos e projeto de proteções solares no navegador, com dados climáticos atuais, em português, espanhol e inglês, sem instalação e sem coleta de dados. Nova versão do Analysis SOL-AR (pesquisa e desenvolvimento: Roberto Lamberts e Alexandra Albuquerque Maciel; programação: Edson T. Ono), feita por Anthony Aliardi a pedido do Prof. Roberto Lamberts. Código aberto (MIT). [Abrir o SOL-AR] · [Como citar] · [Enviar comentário]

## 5. Canal de retorno dos usuários

Proposta: issues do GitHub, com os modelos já prontos (erro, sugestão, divergência de cálculo), e um e-mail do LabEEE para quem não tem conta no GitHub. Sem formulário próprio, porque não há servidor. Falta decidir: quem responde (o LabEEE?) e o e-mail; depois, o link "Enviar comentário" na tela "Sobre" e na ajuda.

## 6. Contagem anônima de uso

Proposta: **não contar na v1.0.** O princípio 6 (sem servidor e sem coleta) e a análise simples de LGPD (ROADMAP, seção 7.1) pesam mais que o número. O GitHub Pages não dá estatísticas de acesso; um contador exigiria serviço de terceiros ou um servidor do LabEEE. Sem contador, há sinais indiretos: tráfego do repositório (GitHub, Insights, últimos 14 dias, visível só para quem tem acesso de escrita), downloads e citações pelo DOI e o canal de retorno. Se o LabEEE quiser números: um contador de código aberto, sem cookies e sem dados pessoais (por exemplo, GoatCounter, hospedado por eles ou pelo próprio LabEEE; conferir os termos), com aviso na tela "Sobre", numa decisão nova.

## 7. Lista do lançamento (v1.0)

- [ ] Portões 2, 3 e 4 aprovados; integrações das Fases 3 e 4 na `main`.
- [ ] Revisão nativa do espanhol e do inglês.
- [ ] Respostas sobre os termos dos dados (OneBuilding e LabEEE) e revisão da decisão 0034.
- [ ] Endereço definitivo no ar.
- [ ] Zenodo ligado; release v1.0 pelo workflow; DOI no `CITATION.cff`, no README e na tela "Sobre".
- [ ] Canal de retorno: e-mail e link na tela.
- [ ] Página no LabEEE.
- [ ] Decisão sobre a contagem de uso.

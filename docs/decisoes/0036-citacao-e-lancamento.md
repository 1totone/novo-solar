# 0036. Citação, DOI e canal de retorno; sem contagem de uso na v1.0 (preparação do F4.10)

- Data: 2026-10-26
- Status: proposta (preparação do F4.10 na integração da Fase 4; endereço, DOI, página no LabEEE e canal de retorno dependem do Anthony e do LabEEE)

## Contexto

O F4.10 pede o endereço definitivo, a página no LabEEE, um canal de retorno dos usuários, o DOI pelo Zenodo para citação acadêmica e a decisão sobre a contagem anônima de uso. A instrução da sessão: só preparar (CITATION.cff e metadados do Zenodo), porque o DOI e o endereço dependem do Anthony e do LabEEE. O roteiro completo está em `docs/lancamento/roteiro-f4.10.md`.

## Decisão (proposta)

1. **Citação:** `CITATION.cff` (formato 1.2.0) na raiz, com o autor da nova versão, a licença MIT, o endereço do repositório e, nas referências, o Analysis SOL-AR 6.2 com Roberto Lamberts, Alexandra Albuquerque Maciel e Edson T. Ono (LabEEE/UFSC). A versão acompanha a do `package.json` a cada release (teste em `tests/metadados.test.ts`).
2. **DOI:** pela integração do Zenodo com o GitHub, a partir das releases que o workflow `release.yml` já cria (decisão 0012); metadados em `.zenodo.json`, com os créditos da versão original na descrição, os três autores originais como colaboradores ("RelatedPerson") e a relação "nova versão de" com a página do SOL-AR 6.2. Para citar o programa, o DOI do conceito (todas as versões).
3. **Canal de retorno:** issues do GitHub com três modelos (erro, sugestão, divergência de cálculo) e um e-mail do LabEEE para quem não tem conta no GitHub; sem formulário próprio, porque não há servidor.
4. **Sem contagem de uso na v1.0**, pelo princípio 6 (sem servidor e sem coleta) e pela análise simples de LGPD; se o LabEEE quiser números, um contador de código aberto e sem cookies, com aviso na tela, numa decisão nova.

## Alternativas consideradas

- **Só o `CITATION.cff`, sem `.zenodo.json`:** o Zenodo também lê o `CITATION.cff`, mas não guarda nele colaboradores com papel nem a relação com a versão original; o `.zenodo.json` tem precedência e permite os dois.
- **Autores originais como autores do depósito:** possível, mas o código e a física da nova versão são novos; fica para o LabEEE confirmar (roteiro, seção 2).
- **Formulário de contato na aplicação:** exigiria servidor ou serviço de terceiros.
- **Contador de acessos desde já:** contraria o princípio 6 sem uma necessidade clara do LabEEE.

## Consequências

- O GitHub mostra "Cite this repository" quando o arquivo chegar à `main`; os modelos de issue também só valem na `main`.
- A cada release, a versão do `CITATION.cff` muda junto com a do `package.json` (o teste avisa se esquecer).
- O DOI, o endereço definitivo, a página no LabEEE e o e-mail do canal de retorno ficam na lista do roteiro, para quando houver as respostas.

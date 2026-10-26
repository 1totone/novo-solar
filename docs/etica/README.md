# Pacote para o comitê de ética: teste de usabilidade do F4.9 (rascunho)

- Data: 26/10/2026
- Status: rascunho preparado pelo Claude. Nada foi submetido: o Anthony decide, preenche, assina e submete.
- O que é: os documentos para submeter o teste formal de usabilidade da v1.0 (F4.9, critério "SUS ≥ 70" do portão 4) a um comitê de ética em pesquisa (CEP), pela Plataforma Brasil. O protocolo do teste, com tarefas, medidas e plano de análise, está em `docs/ux/F4.9-protocolo-de-usabilidade.md`.
- Por que o CEP: o resultado vai ser publicado (F5.7), e o CEP não avalia estudo já feito. O teste do F2.9 serve para melhorar a ferramenta, mas os resultados dele não podem ser publicados como resultado de pesquisa.
- Marcadores: `[PREENCHER: ...]` é campo que só o Anthony pode preencher; `[a conferir]` é afirmação que não pude verificar no texto original (a rede desta sessão não abre os sites oficiais nem o site da revista do artigo da SUS).

## 1. Documentos

| Arquivo | O que é | Onde entra na Plataforma Brasil |
|---|---|---|
| `01-resumo-do-projeto.md` | enquadramento normativo (seção 0) e textos dos campos da plataforma | campos das etapas de cadastro e base do projeto detalhado |
| `02-tcle.md` | Termo de Consentimento Livre e Esclarecido; anexo com a autorização de gravação da tela, só se adotada | anexo "TCLE" |
| `03-instrumentos.md` | questionário de perfil, cartões das tarefas, folha de observação, folha de problemas, SUS e perguntas abertas | anexo de instrumentos de coleta (ou dentro do projeto detalhado) |
| `04-termo-de-anuencia.md` | modelo de carta de anuência da coordenação do curso | anexo de declaração da instituição |
| `05-orcamento-e-cronograma.md` | orçamento e cronograma | campos de orçamento e de cronograma, e anexo |
| `../ux/F4.9-protocolo-de-usabilidade.md` | protocolo completo | base do projeto detalhado |

**Projeto detalhado:** o CEP pede um projeto completo em PDF. Montar com: título e equipe; introdução, hipótese e objetivos (`01`, seção 4); metodologia, amostra e análise (protocolo, seções 2 a 10); aspectos éticos (`01`, seção 0, e riscos e benefícios da seção 4); cronograma e orçamento (`05`); referências; instrumentos e TCLE como apêndices. O CEPSH/UFSC publica um modelo de projeto detalhado: https://cep.paginas.ufsc.br/files/2021/08/Projeto-detalhado.pdf [a conferir se é o vigente].

## 2. O que o Anthony precisa decidir ou preencher

### 2.1 Decisões

| # | Decisão | Recomendação | Por quê |
|---|---|---|---|
| 1 | Instituição proponente | a do programa de mestrado do pesquisador responsável [PREENCHER] | é ela que responde pela pesquisa e é o "órgão de pesquisa" da LGPD (`01`, seção 0.5) |
| 2 | CEP | o da instituição proponente; se for a UFSC, o CEPSH/UFSC (seção 5) | a Plataforma Brasil encaminha o projeto ao CEP da proponente [a conferir] |
| 3 | Pesquisador responsável e orientador | o Anthony como responsável e o orientador na equipe, se o CEP aceitar mestrando como responsável; se não aceitar, o orientador como responsável e o Anthony como assistente [PREENCHER: nome do orientador] | quem conduz as sessões assina o TCLE; pela Lei nº 14.874/2024, a assinatura é do pesquisador responsável [a conferir se o CEP aceita delegação] |
| 4 | Local da coleta e curso dos participantes | [PREENCHER] | se a coleta for numa instituição diferente da proponente, ela é coparticipante e pode precisar de avaliação do próprio CEP |
| 5 | Quem modera | o Anthony, ou outra pessoa treinada, de preferência fora do desenvolvimento | quem desenvolve a ferramenta tende a receber notas mais altas por cortesia |
| 6 | Segunda pessoa para as gravidades | [PREENCHER: por exemplo, um colega do LabEEE] | a gravidade dada por uma pessoa só varia muito |
| 7 | Declarar uma rodada 2 no CEP | sim | se a rodada 1 não atingir o critério e a ferramenta for corrigida, a segunda medida não exige projeto novo; a amostra declarada passa a ser de até 30 |
| 8 | Gravar a tela | não | as anotações bastam; gravar acrescenta risco, consentimento e guarda |
| 9 | Conjunto de dados aberto, com consentimento opcional | sim, sem o perfil | coerente com o princípio "transparente"; sem o perfil, o risco de identificação fica baixo |
| 10 | Ressarcimento de transporte | tarifa de ida e volta, em dinheiro, com recibo [PREENCHER: valor] | o TCLE precisa dizer como as despesas são cobertas |
| 11 | Definição operacional do portão 4 | média da SUS ≥ 70, sempre com o IC de 95% (decisão 0026, proposta) | o critério pelo limite inferior do IC exigiria cerca de 100 participantes se a média verdadeira fosse 75 (protocolo, seção 9.2); confirmar ou trocar antes da coleta |
| 12 | Data de submissão | até 01/12/2026 | parecer até 28/01/2027 sem pendências, ou até cerca de 01/03/2027 com pendências; coleta em abril e maio de 2027 (`05`, seção 2) |

### 2.2 Campos a preencher

- **`01-resumo-do-projeto.md`:** pesquisador responsável, equipe, instituições proponente e coparticipante, contato público, grande área e propósito na plataforma, financiamento, instituição e local da coleta, rodada 2 e tamanho da amostra, edição de Frota e Schiffer.
- **`02-tcle.md`:** nome e vínculo do pesquisador responsável e do orientador, instituição, finalidade da publicação (dissertação, artigo), local das sessões, local de guarda dos papéis e dos arquivos, valor e forma do ressarcimento, endereço do resumo dos resultados, contatos do pesquisador e do CEP, quem assina por delegação (se houver) e, depois do parecer, o CAAE e o número do parecer.
- **`03-instrumentos.md`:** os 10 itens da SUS e as âncoras da escala, a partir da Tabela 1 de Lourenço, Carmona e Lopes (2022); nada mais.
- **`04-termo-de-anuencia.md`:** instituição, pesquisador e orientador, sala, período, signatário e cargo.
- **`05-orcamento-e-cronograma.md`:** preços, tarifa de transporte, financiamento, datas se a submissão não for em 01/12/2026.
- **Protocolo:** instituição dos participantes, links de recuperação, segunda pessoa das gravidades, armazenamento digital e as respostas de referência das tarefas 7 a 10 (na versão testada, antes do piloto).

## 3. Passo a passo da submissão

Os nomes das etapas seguem os manuais do pesquisador da Plataforma Brasil (versões 3.2 e 3.7, publicados por CEPs) e podem ter mudado [a conferir no manual atual, dentro da plataforma].

1. **Falar com o CEP antes:** confirmar o modelo de TCLE, os documentos exigidos, o calendário de reuniões (e o recesso de fim de ano), quem pode ser pesquisador responsável, quem assina a folha de rosto e se a Inaep já publicou a norma de ciências humanas e sociais com notificação ou análise simplificada para risco baixo (`01`, seção 0.3).
2. **Cadastro na Plataforma Brasil** (https://plataformabrasil.saude.gov.br): pesquisador responsável e equipe, com CPF, documento com foto e currículo [a conferir a lista exata].
3. **Carta de anuência:** levar o `04` à coordenação do curso e obter a assinatura.
4. **Fechar os documentos:** resolver todos os `[PREENCHER]` e `[a conferir]` (seções 2 e 6), substituir os itens da SUS e gerar os PDFs: projeto detalhado, TCLE, instrumentos, carta de anuência e, se houver, a autorização de gravação.
5. **Cadastrar o projeto:** na plataforma, "cadastrar novo projeto" e preencher as etapas com os textos do `01`: informações preliminares (equipe e instituição proponente), área de estudo, desenho e financiamento, detalhamento do estudo, outras informações (cronograma, orçamento, bibliografia e anexos) e finalização. Em pesquisas com metodologias de ciências humanas e sociais, seguir a Carta Circular nº 110/2017/CONEP nos campos pensados para a área da saúde.
6. **Folha de rosto:** imprimir a folha gerada pela plataforma, colher as assinaturas do pesquisador responsável e do responsável pela instituição proponente (pessoas diferentes; em projeto de mestrado na UFSC, o coordenador do programa [a conferir, seção 5]), digitalizar e anexar.
7. **Enviar ao CEP** e guardar o comprovante com o CAAE.
8. **Acompanhar:** aceite da documentação em até 10 dias úteis e parecer em até 30 dias úteis depois do aceite (Lei nº 14.874/2024, art. 14 [a conferir]). Pendências: responder em até 10 dias úteis, prorrogáveis uma vez por igual período com justificativa; sem resposta, a análise pode ser cancelada.
9. **Aprovado:** guardar o parecer, pôr o CAAE e o número do parecer no TCLE e só então fazer o piloto e a coleta.
10. **Durante a pesquisa:** qualquer mudança no que o participante lê ou faz (cartões, TCLE, número de participantes, rodada 2 não declarada) pede emenda e só vale depois de aprovada; atraso de cronograma, notificação ou emenda, conforme o CEP.
11. **No fim:** relatório final pela Plataforma Brasil e guarda dos dados por 5 anos.

## 4. Lista de conferência antes de enviar

- [ ] Decisões da seção 2.1 tomadas; a do portão 4 confirmada (decisão 0026).
- [ ] Nenhum `[PREENCHER]` sobrando nos documentos que vão ao CEP.
- [ ] Itens da SUS iguais aos da Tabela 1 de Lourenço, Carmona e Lopes (2022), sem os marcadores "a conferir".
- [ ] Itens "a conferir" das normas conferidos no texto oficial (seção 6).
- [ ] TCLE no modelo do CEP, com todos os elementos da tabela das notas do `02`, em linguagem simples, com as páginas numeradas e as assinaturas na mesma folha.
- [ ] Os mesmos números em todos os documentos: tamanho da amostra (15, ou 30 com a rodada 2), duração da sessão (60 a 75 min), datas, local.
- [ ] Cronograma com o piloto e a coleta depois da data prevista do parecer.
- [ ] Orçamento com valores reais e a fonte do financiamento.
- [ ] Carta de anuência assinada.
- [ ] Folha de rosto assinada pelo pesquisador responsável e pela instituição proponente.
- [ ] Equipe cadastrada na Plataforma Brasil, se o CEP exigir.
- [ ] Alguém disponível para responder pendências em até 10 dias úteis durante a análise.

## 5. CEPSH/UFSC: o que foi encontrado

Se a instituição proponente for a UFSC, o CEP é o Comitê de Ética em Pesquisa com Seres Humanos (CEPSH/UFSC). Achados de 26/10/2026, por resumos de busca, todos a conferir no site:

- **Orientações de submissão** (https://cep.ufsc.br/orientacoes-para-a-submissao-de-um-novo-projeto/): não avalia projetos já iniciados ou concluídos (com contato com participantes ou acesso a dados pessoais); cada projeto com objetivos, métodos ou finalidades diferentes é submetido em separado, e macroprojetos não são avaliados; a página cita as Resoluções nº 466/2012 e nº 510/2016, a orientação da Conep para pesquisas com etapas em ambiente virtual e a Carta Circular nº 110/2017.
- **Sistema próprio:** o site aponta um sistema do CEPSH (https://sistema.cep.ufsc.br), com cadastro por CPF, um menu de submissão com a lista de documentos e o cronograma das reuniões. A página sugere a senha do Sisnep, o sistema anterior à Plataforma Brasil, então pode ser antigo [a conferir se ainda é exigido além da Plataforma Brasil].
- **Calendário de reuniões:** https://cep.ufsc.br/calendario-de-reunioes/ (o de 2026 foi publicado; o de 2027, a conferir). O site fala em até 40 dias de trâmite (10 de validação documental e 30 de parecer) [a conferir se já conta em dias úteis, como manda a Lei nº 14.874/2024].
- **Modelos:** roteiro de TCLE (https://cep.paginas.ufsc.br/files/2021/09/Termo-de-Consentimento-Livre-e-Esclarecido-TCLE.pdf) e de projeto detalhado (https://cep.paginas.ufsc.br/files/2021/08/Projeto-detalhado.pdf), ambos de 2021 [a conferir se vigentes].
- **Pesquisador responsável e folha de rosto:** uma orientação de um programa de pós-graduação da UFSC, de 2020 (https://posodonto.paginas.ufsc.br/files/2020/03/Orienta%C3%A7%C3%B5es-para-assinatura-de-FOLHA-DE-ROSTO-DA-PLATAFORMA-BRASIL.pdf), diz que mestrandos podem ser ou não pesquisadores responsáveis; se não forem, o orientador submete como responsável e inclui o aluno como assistente; em projetos de mestrado, a folha de rosto é assinada pelo coordenador do programa como responsável pela instituição; e o pesquisador responsável e o responsável institucional não podem ser a mesma pessoa [a conferir com o CEPSH: a orientação é de um programa, não do comitê].
- **Pendências frequentes:** https://cep.ufsc.br/pendencias-frequentes-em-protocolos-de-pesquisa-clinica/ (voltada à pesquisa clínica); para ciências humanas e sociais, o manual da Conep de 2025 (`01`, seção 0.8).
- **Contato:** cep.propesq@contato.ufsc.br [a conferir; endereço, telefone e horário no site].

## 6. O que ficou a conferir

1. **Itens da SUS validada** (Lourenço, Carmona e Lopes, 2022): o artigo é de acesso aberto, mas a rede desta sessão não alcança o site da revista nem o Redalyc; o texto provisório é a tradução livre do F2.9 (`03`, seção E). Bloqueia a submissão: copiar a Tabela 1 do artigo (https://www.redalyc.org/journal/741/74172630008/74172630008.pdf ou o site da *Aquichan*).
2. **Texto oficial da Lei nº 14.874/2024:** art. 14 (prazos e em que dispositivo está o aceite em 10 dias úteis), art. 2º, LIII, e art. 18 (TCLE), art. 63 (alcance); lidos em transcrições.
3. **Decreto nº 12.651/2025:** art. 35 e parágrafos (ciências humanas e sociais), art. 40 (transição); e se a Inaep já publicou a norma de ciências humanas e sociais, que pode trazer notificação ou análise simplificada para risco baixo.
4. **Inaep:** Despacho nº 2/2026 (contagem de prazos) e as orientações transitórias; papel da nova Conep do Conselho Nacional de Saúde.
5. **Resolução CNS nº 510/2016:** numeração dos incisos do art. 17 e o artigo que trata do consentimento de quem está sujeito a relação de autoridade ou de dependência.
6. **Resolução CNS nº 674/2022:** se as modalidades de tramitação estão em uso na Plataforma Brasil.
7. **CEPSH/UFSC:** tudo o que está na seção 5.
8. **Nomes e limites dos campos da Plataforma Brasil.**
9. **Calendário acadêmico de 2027** da instituição da coleta (na UFSC, 2027.1 previsto de 01/03 a 07/07/2027).
10. **Licença do artigo da SUS** na página do próprio artigo (a revista publica sob CC BY 4.0).
11. **Literatura do protocolo:** a porcentagem de Tullis e Stetson (2004) com 12 participantes (90% ou 100%), os adjetivos extremos de Bangor, Kortum e Miller (2009) e as faixas de aceitabilidade de Bangor, Kortum e Miller (2008), lidos em fontes secundárias.
12. **Respostas de referência que dependem da versão final:** tarefas 6 e 7 (60,3%, e 69,2% e 48,9%, valores da prévia da Fase 3 com o limiar de 20 °C da decisão 0024, a refazer se o padrão mudar no portão 3), tarefas 8 a 10 e a tolerância da hora legal na tarefa 2 (protocolo, seção 11).

## 7. Depois da aprovação

- Guardar o parecer com os documentos do projeto.
- Congelar a versão candidata e preencher as respostas de referência (protocolo, seção 11).
- Piloto, convite e coleta, como no protocolo.
- Mudanças só por emenda aprovada; relatório final pela Plataforma Brasil no fim; dados guardados por 5 anos e depois destruídos.

# 0042. Teste do F2.9 sem moderador

- Data: 2026-10-27
- Status: proposta. Item 26 da issue #65.

## Contexto

O roteiro do F2.9 (`docs/ux/F2.9-teste-com-usuarios.md`) prevê 3 a 5 sessões com moderador, de 45 a 60 minutos cada, com pensar em voz alta e anotação de onde a pessoa procura. O Anthony não tem tempo para aplicá-las, e o F2.9 segura tudo o que vem depois: o congelamento da `main`, o PR #33, o portão 2 e a integração das Fases 3 e 4 (plano de integração, seção 2).

O F2.9 é um teste formativo: o objetivo é achar os problemas mais frequentes do fluxo básico com poucas pessoas, não medir desempenho (roteiro, seção 1). O teste somativo, com o critério "SUS ≥ 70" do portão 4, é o do F4.9 (decisão 0026).

## Decisão

1. **O F2.9 é aplicado sem moderador**, pela página `teste/` da própria publicação (`https://1totone.github.io/novo-solar/teste/`): o roteiro ao lado da ferramenta (no celular, em cima) e a ferramenta da `main` num iframe. Participantes como no roteiro: 3 a 5 pessoas, alunos e um professor, cada uma com um código de P1 a P5 dado pelo Anthony (o link `teste/#p=P3` já preenche o código). Mensagem pronta em `docs/ux/F2.9-mensagem-aos-participantes.md`.
2. **As mesmas 9 tarefas, com os textos exatos dos cartões.** Única mudança: na tarefa 6, o parêntese "(o arquivo está na área de trabalho)" vira "(o arquivo que você baixou e descompactou na preparação)", com a preparação (baixar e descompactar o EPW de Recife) antes de "Comecei", fora do tempo, e "Desisti" aceito sem travar as outras tarefas. A tarefa extra aparece só para quem se declara professor.
3. **O que a página mede, por tarefa:** tempo entre "Comecei" e "Terminei" ou "Desisti"; resultado S (terminou) ou N (desistiu), sem a categoria A, porque não há quem ajude; as respostas pedidas pelo roteiro; a conferência automática do estado da ferramenta pelo endereço do iframe (local, fachada, transferidor, α, referência, dados, aba e estação da rosa) e, na tarefa 8, pelas opções de impressão no documento do iframe e pelo evento de impressão, que não passam pelo endereço; na tarefa 9, a comparação do link colado com o endereço da ferramenta; a conferência das respostas que têm referência objetiva (tarefas 1, 3, 5 e 7); a facilidade da tarefa (SEQ, de 1 a 7; Sauro e Dumas, 2009); e "o que te confundiu? onde você procurou antes de achar?". No fim, o SUS e as perguntas abertas da folha de registro.
4. **Resultados nas colunas de `docs/ux/F2.9-registro.csv`**, baixados ou copiados pelo participante e mandados ao Anthony por WhatsApp ou e-mail. Linhas novas: `sessao` (consentimento, carta solar em aula, navegador, versão, início) e `aberta1` a `aberta6`. A coluna `observacao` leva, separados por " | ": a conferência do estado, a conferência da resposta, o SEQ, o que confundiu e o estado da ferramenta no fim da tarefa. A conferência nunca aparece para o participante.
5. **Sem servidor e sem dado pessoal:** nada sai do navegador; as respostas ficam no `localStorage` (sobrevivem a recarregar a página) até o participante apagá-las; identificação só pelo código; sem gravação. Os resultados servem para melhorar a ferramenta, não para publicação (o consentimento diz isso; publicação exige o CEP, como no F4.9).
6. **Análise como no roteiro, seção 7**, com estes sinais no lugar da observação: "Desisti" (gravidade 4 provável), "Terminei" com a conferência ou a resposta falhando (gravidade 3: concluiu errado sem perceber), SEQ de 4 ou menos e o texto de "o que te confundiu". A gravidade continua sendo dada pelo Claude, na escala de Nielsen, e cada problema leva a frequência (quantos participantes).
7. **O build da aplicação não muda.** A página é um segundo build do Vite (`vite.teste.config.ts`), sem código em comum com a aplicação; o `dist/` da aplicação sai idêntico, byte a byte, com e sem a página (conferido em 27/10/2026). Por isso ela cabe no congelamento.

## O que se perde e o que se ganha

Perde-se:

- **O pensar em voz alta e a observação de onde a pessoa procura antes de achar.** É a maior perda: o moderador vê a hesitação que o participante não relata, e o participante esquece, na hora de escrever, por onde andou. A pergunta "o que te confundiu? onde você procurou?" depois de cada tarefa recupera parte disso, com o viés da memória. Comparações entre teste em laboratório e remoto assíncrono acham, no assíncrono, bem menos problemas (Andreasen et al., 2007).
- **A ajuda depois de 3 minutos travado** (categoria A) e o esclarecimento de uma tarefa mal entendida. Sem ajuda, quem trava desiste, e a tarefa seguinte pode começar de um estado diferente; o estado no fim de cada tarefa fica registrado para separar uma coisa da outra.
- **O controle do ambiente:** arquivo de Recife já descompactado, mouse, impressora e régua, navegador sem histórico, ninguém ajudando do lado. A tarefa 6 passa a depender de o participante baixar e descompactar o arquivo, o que pode virar a causa de "Desisti" sem ter a ver com a ferramenta; o texto de "o que te confundiu" separa os casos.
- **A conversa com o professor** sobre o uso em aula, que vira texto nas perguntas abertas.
- **A ferramenta inteira na tela:** no iframe, ela tem a largura da tela menos a do roteiro (23 rem no computador; no celular, a altura menos até 45%, e o roteiro pode ser recolhido). Num computador com 1280 px ou mais, a ferramenta continua no leiaute do computador (a partir de 832 px de largura). A barra de endereço da ferramenta aparece acima dela, porque o iframe esconde a do navegador e a tarefa 9 depende dela.

Ganha-se:

- **O teste acontece**, em dias, e o Anthony gasta cerca de 15 minutos (mandar a mensagem e receber os arquivos), contra 4 a 5 horas de sessões.
- **Dados mais objetivos em parte:** tempo medido pelo relógio do navegador, estado da ferramenta conferido pelo endereço (não pela anotação) e o caso "concluiu errado sem perceber" detectado automaticamente.
- O participante faz quando pode, no próprio aparelho, o que aproxima o teste do uso real.

## Por que vale para o F2.9 e não substitui o F4.9

O F2.9 pede só "problemas encontrados resolvidos ou estacionados" (ROADMAP). Para isso, um teste sem moderador com 3 a 5 pessoas acha os problemas grandes e frequentes (os de gravidade 3 e 4, que precisam ser corrigidos antes do portão 2), e o resto da evidência já existe: a revisão antes do teste (heurísticas de Nielsen, acessibilidade, robustez e desempenho; `docs/ux/F2.9-revisao-antes-do-teste.md`) cobriu os problemas menores pelo lado do avaliador.

O F4.9 é outra coisa: teste somativo com 10 a 15 alunos, critério do portão 4 (SUS ≥ 70 com intervalo de confiança, decisão 0026), protocolo aprovado por comitê de ética e resultados publicáveis no artigo do F5.7. Nada disso sai deste teste: 3 a 5 notas de SUS não dão intervalo útil, o consentimento aqui não é o TCLE e não há aprovação do CEP. O F4.9 continua como está no protocolo, com moderador.

## Alternativas consideradas

- **Esperar o Anthony ter tempo para as sessões:** mantém a qualidade do roteiro, mas a `main` fica congelada sem prazo.
- **Sessões com moderador por videochamada, mais curtas:** pede o mesmo tempo do Anthony, menos o deslocamento.
- **Formulário externo (Google Forms) com o link da ferramenta:** sem conferência pelo endereço e com os dados num serviço de terceiros.
- **Pular o F2.9 e ir ao portão 2 só com a revisão heurística:** a revisão é do avaliador; o ROADMAP pede gente usando.

## Consequências

- O F2.9 fica pronto quando os resultados chegarem e os problemas estiverem resolvidos ou estacionados, como antes; o roteiro com moderador continua válido para quem quiser aplicá-lo (por exemplo, numa conversa curta com o professor depois).
- O congelamento da `main` vale até os resultados chegarem.
- A página `teste/` sai da publicação depois do F2.9 (ou fica como modelo para o F4.9, se o protocolo dele mudar por decisão nova).

## Referências

- Andreasen, M. S.; Nielsen, H. V.; Schrøder, S. O.; Stage, J. What happened to remote usability testing? An empirical study of three methods. In: *CHI 2007*. New York: ACM, 2007. p. 1405-1414.
- Sauro, J.; Dumas, J. S. Comparison of three one-question, post-task usability questionnaires. In: *CHI 2009*. New York: ACM, 2009. p. 1599-1608.
- Brooke, J. SUS: a "quick and dirty" usability scale. In: Jordan, P. W. et al. (ed.). *Usability evaluation in industry*. London: Taylor & Francis, 1996.
- Nielsen, J. Severity ratings for usability problems. Nielsen Norman Group, 1994.

# 0026. Critério da SUS no portão 4: média de pelo menos 70, com o intervalo de confiança

- Data: 2026-10-26
- Status: proposta (o Anthony confirma antes da coleta do F4.9; protocolo em `docs/ux/F4.9-protocolo-de-usabilidade.md`, seção 9.2)

## Contexto

O portão 4 do ROADMAP pede "SUS ≥ 70" no teste com 10 a 15 alunos (F4.9), sem dizer se o critério vale para a média observada ou para o intervalo de confiança. Com 12 participantes e o desvio-padrão típico da SUS (17,7 pontos, Sauro e Lewis), o intervalo de confiança de 95% da média vai cerca de 11 pontos para cada lado (protocolo, seção 4.3). A definição precisa ser fixada antes da coleta, para que o resultado não escolha o critério.

## Decisão (proposta)

O portão 4 é atingido quando a **média** da SUS dos participantes válidos é de pelo menos 70. O relatório sempre informa, junto da média, o n, o desvio-padrão e o intervalo de confiança de 95% pela t de Student; uma média entre 65 e 75 é descrita como compatível com médias verdadeiras acima e abaixo de 70, e não como aprovação ou reprovação firme.

## Alternativas consideradas

- **Limite inferior do intervalo de 95% ≥ 70:** exige média observada de cerca de 81 com 12 participantes; uma ferramenta com média verdadeira de 75 passaria só 14% das vezes, e seriam precisos cerca de 100 participantes para passar 80% das vezes (protocolo, seção 9.2). Fora do alcance de um teste com 10 a 15 alunos.
- **Teste de hipótese contra 70:** com a mesma amostra, tem o mesmo problema de poder do limite inferior.
- **Mediana ≥ 70:** menos sensível a uma nota extrema, mas a literatura de referência da SUS (médias de 68, escalas de notas e percentis) é toda em médias.

## Consequências

- O plano de análise do F4.9 (seção 9) usa a média com o intervalo; a amostra fica em 12 participantes válidos (até 15 convidados).
- Se o Anthony preferir o limite inferior do intervalo, a amostra do protocolo e o pacote do comitê de ética precisam mudar antes da submissão (tamanho da amostra declarado).

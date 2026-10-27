# 0037. Ponte com NBR 15220-3, INI-C e EnergyPlus: o que entra na v1.0 e o que fica na v2.0

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 21 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)). Corrige a decisão 0006 no ponto do escopo da v1.0; a pergunta ao Prof. Lamberts sobre a exportação para o EnergyPlus (abaixo) fica para o portão 2.

## Contexto

A decisão 0006 (aceita em 23/10/2026) e a seção 3 do ROADMAP põem a "ponte com NBR 15220-3, INI-C e EnergyPlus" dentro do escopo da v1.0. O roteiro do mesmo ROADMAP põe as três peças dessa ponte na Fase 5 (v2.0): a exportação para o EnergyPlus (F5.2), o cálculo de AVS, AHS e AOV do INI-C (F5.3) e a zona da NBR 15220-3:2024 por município (F5.6); a tabela do cronograma (seção 6) diz o mesmo ("v2.0: ponte com INI-C e EnergyPlus"). Os dois textos não podem valer juntos. Nada da Fase 5 foi implementado.

O que a v1.0 (integração das Fases 3 e 4) já tem de relação com essas referências:

- a fração ensolarada conferida contra o EnergyPlus 26.2 (F3.8, decisão 0019) e os indicadores conferidos contra a radiação incidente dele (F3.5, decisão 0021);
- a correção do vento para a altura e o terreno com o perfil do EnergyPlus (F4.4, decisão 0027);
- exportações em CSV (células da carta, mapa mês × hora, fração ensolarada hora a hora em 8760 h) e o corte e a vista em SVG em escala.

Nenhuma delas é uma saída que o EnergyPlus, o INI-C ou a NBR 15220-3 leiam diretamente. O uso do CSV hora a hora como entrada de um modelo do EnergyPlus não foi verificado.

## Decisão

1. **Corrigir a decisão 0006 para o que o roteiro diz:** na v1.0, a ponte com o EnergyPlus é a **conferência** (F3.8, F3.5, F4.4) e os **dados exportáveis**; as **saídas para EnergyPlus, INI-C e NBR 15220-3** (F5.2, F5.3, F5.6) ficam na v2.0, como no ROADMAP.
2. A seção 3 do ROADMAP passa a dizer "conferência com o EnergyPlus e dados exportáveis (v1.0); saídas para NBR 15220-3, INI-C e EnergyPlus (v2.0)". A decisão 0006 ganha a nota "escopo da ponte corrigido pela 0037".
3. Nada muda no código.

## Pergunta ao Prof. Lamberts no portão 2

A pré-revisão de 27/10/2026 aceita manter as saídas para EnergyPlus, INI-C e NBR 15220-3 na v2.0, mas recomenda perguntar ao Prof. Lamberts, no portão 2, se a **exportação para o EnergyPlus (F5.2)** deve vir para a v1.0. Das três peças, ela é a de menor custo: o arranjo do F3.8 (`docs/validacao/scripts/energyplus_fracao_ensolarada.py`, na branch da Fase 3) já escreve, em Python, modelos do EnergyPlus com a zona, a janela e as placas da proteção (`Shading:Building:Detailed`) a partir das cenas no formato da spec 07, seção 7.1, e os roda no EnergyPlus 26.2. A exportação pela aplicação ainda exigiria escrever o IDF em TypeScript, escolher os objetos de saída (as placas detalhadas ou `Shading:Overhang:Projection` e `Shading:Fin:Projection`, como no F5.2) e o teste de ida e volta; esse teste reaproveita a referência do F3.8.

- Se o Prof. Lamberts quiser a exportação na v1.0: vale a alternativa 1 só para o F5.2 (um passo F4.11, com teste de referência antes da implementação) e a v1.0 atrasa o tempo desse passo; o F5.3 e o F5.6 continuam na v2.0.
- Se não: esta decisão fica como está.

## Alternativas consideradas

- **Trazer o F5.2 e o F5.6 para a Fase 4** (exportação de Shading:Overhang:Projection, Shading:Fin:Projection e Shading:Zone:Detailed, com teste de ida e volta no EnergyPlus; zona bioclimática por município). Cumpre a 0006 ao pé da letra, mas acrescenta dois passos com física e dados novos à v1.0, que já espera o teste com usuários (F2.9), três portões e o teste da SUS (F4.9). A tabela de municípios da NBR 15220-3:2024 precisa de fonte verificada e de conferência dos direitos de reprodução de uma tabela de norma da ABNT (a verificar).
- **Trazer também o F5.3 (INI-C)**: o maior dos três; o cálculo de AVS, AHS e AOV precisa ser conferido contra o texto do INI-C e contra casos resolvidos, o que hoje não existe no projeto.
- **Deixar os dois textos como estão**: a v1.0 seria anunciada com um escopo que ela não cumpre.

## Consequências

- Se aceita: a v1.0 é anunciada sem saídas para normas e EnergyPlus; o material do portão 4 e as notas de versão dizem isso. O público "projetista e consultor" da seção 1 do ROADMAP recebe as saídas na v2.0.
- Se recusada (alternativa 1): o ROADMAP ganha F4.11 (exportação para o EnergyPlus) e F4.12 (zona da NBR 15220-3), com teste de referência antes da implementação, e a v1.0 atrasa o tempo desses passos.

# 0027. Vento avançado: filtro pela condição térmica e correção para a altura e o terreno (F4.4)

- Data: 2026-10-26
- Status: proposta (F4.4 na branch de integração da Fase 4; a confirmar com o Anthony no portão 4)

## Contexto

O ROADMAP pede, no F4.4, filtros da rosa dos ventos pela condição térmica, a correção da velocidade para a altura e a rugosidade do terreno como no EnergyPlus e o aviso de que o vento é da estação, e não do terreno. Faltava decidir de onde vem a condição térmica de cada hora, como o vento do instante h se junta à temperatura da hora, que perfil e que terrenos usar, em que faixa de altura, e onde ficam as opções sem complicar a rosa básica.

## Decisão (proposta)

1. **Condição térmica pela classificação do passo 7** (spec 08), com o mesmo método, os mesmos valores e a mesma temperatura da hora: filtros "quentes", "frias" e "neutras", além de "todas as horas" (padrão). Cada linha do arquivo usa a própria classe; as horas sem classe ficam fora dos três filtros. O método se escolhe só no passo 7; a aba da rosa mostra qual é, em uma frase.
2. **Vento do instante h com a classe da hora (h − 1, h]**: com a temperatura da hora padrão (média do início e do fim), a temperatura representa o instante h − 0,5; com "fim da hora" (opção do passo 7), os dois são do instante h. As horas de cada classe ficam as mesmas no passo 7 e na rosa.
3. **Perfil de lei de potência da ASHRAE, como no EnergyPlus** (*Engineering Reference*, equação 3.84): V_z = V_met · (δ_met / z_met)^α_met · (z / δ)^α, com a estação nos padrões do Site:WeatherStation (10 m, α = 0,14, δ = 270 m) e quatro terrenos da tabela 3.4: campo aberto (padrão, Country), subúrbio ou rugoso (Suburbs e Urban), cidade (City) e água (Ocean). Um fator k para todas as horas e direções, aplicado antes da calmaria e das classes; a direção não muda.
4. **Altura de 1 a 200 m**, digitada; em branco, 10 m (com campo aberto, a própria estação).
5. **Onde fica:** um grupo recolhido "Mais opções" na aba "Rosa dos ventos", com a condição térmica e a altura e o terreno; o título da rosa, a tabela e o texto alternativo dizem o filtro e a correção quando ativos; o aviso de que o vento é da estação ganha, com a correção, a frase de que a direção continua a da estação e de que os vizinhos não entram. Estado no link: `vh` (`q`, `f`, `n`), `va` (altura) e `vt` (`s`, `c`, `a`).

## Alternativas consideradas

- **Controles da classificação repetidos na aba da rosa:** dariam duas classificações diferentes na mesma sessão (passo 7 e rosa) e o dobro de campos. Com a do passo 7, uma escolha só vale para os indicadores e para o vento.
- **Sempre a temperatura do fim da hora no filtro do vento** (mesmo instante do vento): mais coerente no tempo, mas as contagens de horas quentes da rosa deixariam de bater com as do passo 7 quando o passo usa a média da hora (o padrão). A diferença é de meia hora; quem quiser o mesmo instante escolhe "fim da hora" no passo 7.
- **Perfil logarítmico, com o comprimento de rugosidade z₀:** é o da camada superficial na micrometeorologia, mas o ROADMAP pede a correção como no EnergyPlus, e o perfil de potência é o que o EnergyPlus e a ASHRAE usam; com ele, a rosa corrigida bate com o vento local de uma simulação.
- **Estação editável** (altura e terreno do anemômetro, como no Site:WeatherStation) e **α e δ livres** (como no Site:HeightVariation): úteis para quem conhece a estação, mas acrescentam campos que a maioria não sabe preencher. Ficam em `docs/ideias.md`.
- **Filtro térmico entre os quatro grupos de botões visíveis:** mais fácil de achar, mas a rosa básica ganharia uma linha de botões; recolhido em "Mais opções", não muda a tela de quem não o usa (princípio 1).

## Consequências

- Spec 06, seções 6.3 (filtro), 6.7 (correção) e 6.8 (interface); núcleo em `src/core/wind/windProfile.ts` (fator) e `src/core/wind/windRose.ts` (opções de filtro e de fator).
- Referências independentes: o EnergyPlus 26.2.0 (`docs/validacao/scripts/energyplus_vento.py`, com o arranjo de faixas de parede do F3.8) e o cálculo das rosas em Python (`docs/validacao/scripts/rosa_vento_avancado.py`); teste em `tests/referencia/ventoAvancado.test.ts`.
- A rosa filtrada pela condição térmica muda quando o método do passo 7 muda; a frase do método na aba da rosa deixa isso visível.
- Se o Anthony preferir a temperatura do instante do vento no filtro, muda só o modo passado à classificação; se preferir a estação editável, os campos entram no mesmo grupo "Mais opções".

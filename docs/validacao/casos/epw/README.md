# EPWs de teste

Seis arquivos TMYx (período 2011 a 2025) do Climate.OneBuilding.org, escolhidos para cobrir latitudes equatorial, tropical e subtropical e dois fusos (UTC−3 e UTC−4):

| id | Estação | Latitude | Longitude | Fuso | Elevação (m) |
|---|---|---|---|---|---|
| florianopolis | Florianópolis, Aeroporto Hercílio Luz (838990) | −27,670 | −48,547 | −3 | 6,1 |
| brasilia | Brasília, Aeroporto JK (833780) | −15,863 | −47,913 | −3 | 1060,4 |
| belem | Belém, Aeroporto Val de Cans (821930) | −1,379 | −48,476 | −3 | 16,5 |
| porto-alegre | Porto Alegre, Aeroporto Salgado Filho (839710) | −29,994 | −51,171 | −3 | 3,4 |
| manaus | Manaus, Aeroporto Eduardo Gomes (821110) | −3,039 | −60,050 | −4 | 80,5 |
| concepcion | Concepción, Aeroporto Carriel Sur (856820) | −36,778 | −73,063 | −4 | 7,9 |

**Os EPWs não são versionados.** O Climate.OneBuilding.org não publica termos de redistribuição explícitos (o site diz "All Rights Reserved"), então o repositório guarda só o `manifesto.json` (URL, SHA-256 do zip e do EPW, cabeçalho) e o script `docs/validacao/scripts/baixar_epw.py` baixa e confere os arquivos em `.cache/epw/`. Os termos serão confirmados no F4.1, antes de qualquer arquivo ser distribuído com a aplicação.

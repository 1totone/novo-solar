# Glossário técnico PT, ES e EN

**Status:** proposta (F4.6, decisão 0029), 26/10/2026. Base das traduções da interface (`src/ui/i18n/`) e do glossário da ajuda (F4.8). As traduções para o espanhol e o inglês **precisam de revisão por um falante nativo da área** antes da v1.0 (pendência do Anthony).

## Regras

1. **O vocabulário do ensino brasileiro fica**: α, β e γ continuam com as letras gregas e com as definições do SOL-AR 6.2 (spec 01, seção 1.3), nas três línguas. A tradução não troca α por VSA nem β por HSA: diz, onde ajuda, a equivalência ("α externo = ângulo de sombra vertical"; "external α = vertical shadow angle, VSA").
2. **Referência interna e externa** são termos do SOL-AR 6.2 e ficam traduzidos ao pé da letra, sempre com a frase que diz de onde cada ângulo é medido.
3. **Termos do EnergyPlus e da ASHRAE** ficam com o nome que essas fontes usam em inglês (ex.: *sunlit fraction*, *prevailing mean outdoor air temperature*, nomes dos campos do EPW) e com a tradução corrente nas outras línguas.
4. **Unidades SI** nas três línguas; separador decimal da língua (vírgula em PT e ES, ponto em EN); o CSV exportado mantém o ponto e os nomes das colunas (spec 01, seção 1.5).
5. **Chaves do link e do arquivo de projeto não se traduzem** (`local`, `estacao`, `vh`...): o mesmo link abre em qualquer língua.
6. Sem travessões; frases curtas; o mesmo termo para a mesma coisa em toda a interface.

## Geometria e carta

| Português (interface) | Español | English | Nota e fonte |
|---|---|---|---|
| carta solar | carta solar | sun-path diagram | EN: Olgyay (*Design with Climate*, 1963); "A procedure for plotting the sun-path diagram, and shading mask protractor" (*Journal of Solar Energy Engineering*, v. 117, n. 2, Texas A&M; OSTI 78268); Marsh, "Horizontal and vertical shadow angles" (andrewmarsh.com, 2010). ES: uso corrente em material de ensino da América Latina |
| transferidor (de ângulos de sombra) | transportador (de ángulos de sombra) | shading protractor (shadow angle protractor) | EN: "shading mask protractor" de Olgyay; "shadow angle protractor" em Szokolay e em material de ensino |
| máscara de sombra | máscara de sombra | shading mask | Olgyay; "SHADING MASK: A computer-based teaching tool for sun shading devices" (congresso da ASES, 1996; OSTI 379884) |
| sombra total (100%) | sombra total (100%) | full shade (100%) | |
| sombra parcial (50%) | sombra parcial (50%) | partial shade (50%) | |
| referência interna / externa | referencia interna / externa | internal / external reference | termos do SOL-AR 6.2 (spec 01, seção 1.3) |
| α (brise horizontal) | α (protección horizontal, alero) | α (horizontal device, overhang) | α externo = ângulo de perfil = *vertical shadow angle* (VSA); α interno = AVS da INI-C |
| β (brises verticais) | β (aletas verticales) | β (vertical fins) | β externo = *horizontal shadow angle* (HSA); β interno = AHS da INI-C |
| γ (limites laterais) | γ (límites laterales) | γ (side limits) | sem equivalente direto na literatura em inglês; descrito pela geometria |
| índices 1 e 2 (brise afastado da parede) | índices 1 y 2 (protección separada de la pared) | indices 1 and 2 (device set away from the wall) | |
| fachada | fachada | facade | |
| normal externa | normal exterior | outward normal | |
| orientação da fachada | orientación de la fachada | facade orientation | azimute da normal externa |
| azimute | acimut | azimuth | ES: "acimut" é a forma mais usada em textos técnicos; o dicionário da RAE aceita "acimut" e "azimut" |
| altura solar | altura solar | solar altitude | |
| ângulo zenital | ángulo cenital | zenith angle | |
| zênite | cenit | zenith | |
| horizonte | horizonte | horizon | |
| esquerda / direita (de quem está dentro olhando para fora) | izquierda / derecha (de quien está dentro mirando hacia afuera) | left / right (as seen from inside looking out) | |
| brise (proteção solar) | protección solar (parasol; quiebrasol) | shading device (brise-soleil) | ES: "quiebrasol" é corrente em parte da América Latina; "parasol" e "protección solar" são gerais |
| brise horizontal | protección horizontal (alero) | horizontal shading device (overhang) | |
| aleta (brise vertical) | aleta (protección vertical) | vertical fin | Marsh (2010); material de ensino em inglês |
| lâminas horizontais / verticais | lamas horizontales / verticales | horizontal / vertical louvers | ES: "lamas" (Espanha); "celosía" quando há grelha |
| beiral | alero | eave | |
| marquise | marquesina | canopy | |
| janela | ventana | window | |
| vidro recuado (recuo do vidro) | vidrio retranqueado (retranqueo del vidrio) | recessed glazing (glass setback) | |
| peitoril | alféizar (antepecho) | sill | |
| verga | dintel | lintel (window head) | |
| corte / vista de fora / planta | corte / vista desde afuera / planta | section / outside view / plan | |
| desenho à mão | dibujo a mano alzada | freehand drawing | |
| projeção estereográfica / equidistante / cilíndrica | proyección estereográfica / equidistante / cilíndrica | stereographic / equidistant / cylindrical projection | |
| imprimir em escala (raio da carta) | imprimir a escala (radio de la carta) | print to scale (chart radius) | |

## Tempo e sol

| Português (interface) | Español | English | Nota e fonte |
|---|---|---|---|
| hora solar verdadeira | hora solar verdadera | apparent solar time | também *true solar time* |
| hora legal | hora oficial | standard time (clock time) | o arquivo climático está em hora padrão do fuso, sem horário de verão |
| fuso horário | huso horario | time zone | |
| equação do tempo | ecuación del tiempo | equation of time | |
| linhas horárias | líneas horarias | hour lines | |
| analema | analema | analemma | |
| trajetória do sol | trayectoria solar | sun path | |
| solstício / equinócio | solsticio / equinoccio | solstice / equinox | |
| nascer / pôr do sol | salida / puesta del sol | sunrise / sunset | |
| período a sombrear | período a sombrear | period to shade | F3.6 |

## Dados climáticos e vento

| Português (interface) | Español | English | Nota e fonte |
|---|---|---|---|
| arquivo climático | archivo climático | weather file | EPW: *EnergyPlus weather file* |
| dados históricos | datos históricos | historical data | os TRY e IWEC do SOL-AR 6.2 |
| ano climático típico | año meteorológico típico | typical meteorological year (TMY) | |
| temperatura de bulbo seco | temperatura de bulbo seco | dry-bulb temperature | campo do EPW |
| umidade relativa | humedad relativa | relative humidity | campo do EPW |
| radiação global horizontal | radiación global horizontal | global horizontal radiation | nomes dos campos do EPW (Wh/m² na hora); em textos de física, *irradiation* |
| radiação direta normal | radiación directa normal | direct normal radiation | idem |
| radiação difusa horizontal | radiación difusa horizontal | diffuse horizontal radiation | idem |
| rosa dos ventos | rosa de los vientos | wind rose | |
| calmaria | calma | calm | velocidade abaixo de 0,5 m/s (spec 06) |
| setor | sector | sector | |
| classe de velocidade | clase de velocidad | speed class | |
| estação (meteorológica, do ano) | estación (meteorológica, del año) | weather station; season | PT e ES usam a mesma palavra para as duas coisas; EN distingue |
| perfil de vento (lei de potência) | perfil de viento (ley potencial) | wind profile (power law) | EnergyPlus, *Engineering Reference*, seção 3.5.4.2 |
| campo aberto / subúrbio / cidade / água | campo abierto / suburbio / ciudad / agua | open country / suburbs / city / water | campo Terrain do objeto Building do EnergyPlus |

## Efeito no ano e indicadores

| Português (interface) | Español | English | Nota e fonte |
|---|---|---|---|
| horas quentes / frias / neutras | horas cálidas / frías / neutras | hot / cold / neutral hours | |
| faixa adaptativa da ASHRAE 55 | rango de confort adaptativo de ASHRAE 55 | ASHRAE 55 adaptive comfort range | |
| temperatura média predominante externa (t_pma) | temperatura media exterior predominante | prevailing mean outdoor air temperature | termo da ASHRAE 55 |
| aceitabilidade (80%, 90%) | aceptabilidad | acceptability | |
| temperatura de equilíbrio | temperatura de equilibrio | balance-point temperature | |
| acréscimo por ganhos (ΔT) | incremento por ganancias (ΔT) | gain allowance (ΔT) | |
| limiar de 20 °C | umbral de 20 °C | 20 °C threshold | Lamberts, Dutra e Pereira (2014) |
| fração ensolarada | fracción soleada | sunlit fraction | EnergyPlus: *Surface Outside Face Sunlit Fraction* |
| radiação direta bloqueada / admitida | radiación directa bloqueada / admitida | blocked / admitted beam radiation | spec 09 |
| horas com sol na janela | horas con sol en la ventana | hours with sun on the window | |
| alternativa (de proteção) | alternativa (de protección) | (shading) option | |
| proteção pelas dimensões | protección por las dimensiones | shading device by dimensions | passo 6 |
| dimensionar pelo período | dimensionar por el período | size from the period | F3.6 |
| curvas de percentual sombreado (0 a 100%) | curvas de porcentaje sombreado (0 a 100%) | shaded-percentage curves (0 to 100%) | |
| máscara de um ponto | máscara de un punto | single-point mask | |
| mapa mês × hora | mapa mes × hora | month × hour map | |
| vista 3D | vista 3D | 3D view | |

## Interface

| Português (interface) | Español | English |
|---|---|---|
| passo | paso | step |
| mais opções | más opciones | more options |
| avançado | avanzado | advanced |
| local | ubicación | location |
| cidade | ciudad | city |
| carregar arquivo | cargar archivo | load file |
| projeto (salvar, abrir) | proyecto (guardar, abrir) | project (save, open) |
| copiar link | copiar enlace | copy link |
| comparar lado a lado | comparar lado a lado | compare side by side |
| exportar (SVG, PNG, CSV) | exportar | export |
| hipóteses | hipótesis | assumptions |
| aviso | aviso | warning |

## Fontes consultadas

- Olgyay, V.; Olgyay, A. *Solar Control and Shading Devices*. Princeton University Press, 1957; Olgyay, V. *Design with Climate*. Princeton University Press, 1963 (edição em espanhol: *Arquitectura y clima*, Gustavo Gili, 1998).
- "A procedure for plotting the sun-path diagram, and shading mask protractor". *Journal of Solar Energy Engineering*, v. 117, n. 2, 1995 (Texas A&M University; OSTI 78268). Os autores não foram conferidos na sessão (o registro do OSTI não abriu).
- "SHADING MASK: A computer-based teaching tool for sun shading devices". Congresso da American Solar Energy Society, Asheville, 1996 (OSTI 379884).
- Marsh, A. "Horizontal and vertical shadow angles", 2010, https://andrewmarsh.com/blog/2010/01/10/horizontal-and-vertical-shadow-angles/.
- U.S. DOE. *EnergyPlus Engineering Reference* e *Auxiliary Programs* (nomes dos campos do EPW, *sunlit fraction*, perfil de vento).
- ANSI/ASHRAE. *Standard 55-2023* (termos do modelo adaptativo, conferidos na documentação do pythermalcomfort; spec 08).
- Inmetro. INI-C (AVS e AHS), 2020 (spec 01, seção 1.3).
- Material de ensino em espanhol sobre protección solar e máscaras de sombra: Universidad Central de Venezuela ("Eficiencia de los elementos de control solar oblicuos en el sombreado de las aberturas", saber.ucv.ve) e Universidad Nacional de Colombia (repositorio.unal.edu.co).

# 13. Exportação para o EnergyPlus e para o CAD (F5.2)

**Status:** proposta (decisão 0043), 27/10/2026; validada contra o EnergyPlus 26.2 e o ezdxf no mesmo dia (relatório `docs/validacao/relatorios/F5.2-exportacao-energyplus.md`). Escrita antes do código, numa branch da Fase 5 que parte da integração da Fase 4; não entra na `main` antes dos portões (decisão 0037).

A janela e as peças do passo 6 (spec 07, seção 7.1) saem em três arquivos:

1. **Objetos para o seu modelo** (`.idf`): as peças como objetos de sombreamento do EnergyPlus, com o nome da janela e da parede do modelo do usuário, para colar no IDF dele;
2. **Modelo para conferir** (`.idf`): um modelo completo e mínimo, que roda sozinho com o EPW do local e dá a fração ensolarada da janela, o mesmo arranjo do F3.8 (spec 07, seção 7.10);
3. **Corte e vista** (`.dxf`): os desenhos da seção 7.11 da spec 07, em metros, para o CAD.

## 13.1 Referenciais

- **Fachada** (spec 01, seção 1.2; spec 07, seção 7.1): x à direita de quem está dentro olhando para fora, y na normal externa, z para cima; janela no plano do vidro, y = 0, x de 0 a W e z de 0 a H.
- **Mundo do EnergyPlus** (`GlobalGeometryRules`, coordenadas `World`, *Building North Axis* 0): X para o Leste, Y para o Norte, Z para cima. Com a fachada de azimute θ (normal externa, a partir do Norte, sentido horário):

  n = (sen θ, cos θ, 0), e_x = n × (0, 0, 1) = (cos θ, −sen θ, 0), e_z = (0, 0, 1)

  e o ponto (x, y, z) da fachada vai para P = O + x · e_x + y · n + z · e_z, com O o canto inferior da janela do lado esquerdo de quem está dentro (x = 0, z = 0).
- **Esquerda e direita no EnergyPlus.** Nos objetos por projeção (`Shading:Overhang:Projection` e `Shading:Fin:Projection`), "esquerda" e "direita" são vistas **de fora**, olhando para a janela: o contrário do referencial da fachada. Conferido no EnergyPlus 26.2 pelas superfícies que ele gera (arquivo `eplusout.eio`, `Output:Surfaces:List, DetailsWithVertices`): numa fachada oeste, o *Left Extension* de 0,2 m pôs a aleta "Left" no lado Norte da janela, que é a direita de quem está dentro olhando para o oeste. Logo: direita da fachada (x = W) = *Left* do EnergyPlus.
- **Medidas a partir do vidro.** Os objetos por projeção medem a altura, os prolongamentos e a profundidade a partir das arestas da janela (os vértices do `FenestrationSurface:Detailed`), mesmo com caixilho (`WindowProperty:FrameAndDivider`): conferido no 26.2 com caixilho de 10 cm, a posição do brise não mudou. É o que a spec 07 chama de janela (o vidro).
- **Janela no plano da parede.** O EnergyPlus exige a janela no plano da parede-base. Com recuo d > 0 (parede espessa), a parede do modelo fica no plano do vidro (y = 0), e o recuo vira as quatro placas da seção 7.1 da spec 07 (verga, peitoril e ombreiras, de y = 0 a y = d), como objetos encostados na parede. Não se usa o *Outside Reveal Depth* do `WindowProperty:FrameAndDivider`, cujo efeito na sombra não foi conferido.

## 13.2 Cada peça vira um objeto

As peças são as do passo 6, na ordem dele; cada peça gera as placas de `buildScene` (spec 07, seção 7.1). A regra, nesta ordem:

| Peça | Condição | Objeto | Campos |
|---|---|---|---|
| Brise horizontal | sem recuo (d = 0) e sem afastamento (g = 0) | `Shading:Overhang:Projection` | *Height above Window* = e; *Tilt Angle* = 90; *Left extension* = P_d; *Right extension* = P_e; *Depth as Fraction of Window Height* = D / H |
| Par de aletas, uma de cada lado | sem recuo e sem afastamento nas duas | `Shading:Fin:Projection` (uma para o par) | *Left* (do EnergyPlus) = aleta à direita da fachada: *Extension* = s, *Distance Above Top* = P_a, *Distance Below Bottom* = P_b, *Tilt* = 90, *Depth as Fraction of Window Width* = D / W; *Right* = aleta à esquerda, com os mesmos campos |
| Recuo do vidro | d > 0 | `Shading:Zone:Detailed`, uma por placa, com a parede como base | vértices no mundo |
| Qualquer outra peça encostada na fachada | alguma aresta da placa no plano y = d | `Shading:Zone:Detailed`, uma por placa, com a parede como base | vértices no mundo |
| Peça afastada da fachada | nenhuma aresta no plano y = d | `Shading:Building:Detailed`, uma por placa | vértices no mundo |

- **Aletas sem par.** Uma aleta sozinha não usa o `Shading:Fin:Projection`: o objeto sempre cria as duas aletas, e uma profundidade 0 dá o aviso "illegal surface area" no EnergyPlus 26.2 (conferido). Ela segue as linhas de baixo da tabela. Com mais aletas de um lado que do outro, os pares se formam na ordem do passo 6.
- **Encostada e afastada** é uma distinção do EnergyPlus para o leitor do modelo (sombreamento ligado à zona ou ao edifício); para a sombra, os dois tipos são iguais (placas espelhadas, `Mir-`, que sombreiam pelas duas faces, como as placas finas da spec 07).
- **Nomes.** `<janela> Brise 1`, `<janela> Aletas 1`, `<janela> Recuo verga`, `<janela> Peca 3 placa 2` e assim por diante, só com letras sem acento, números, espaços e hífen. O EnergyPlus acrescenta `Left` e `Right` às aletas de um `Shading:Fin:Projection`.
- **Prolongamento infinito.** O EnergyPlus não aceita placas de 10⁶ m (o recorte de polígonos trabalha com inteiros em unidades de 0,01 mm e estoura com sombras de quilômetros; relatório do F3.8). Um prolongamento infinito é exportado com L = 20 · y_máx além da aresta da janela, com y_máx a maior distância da peça ao vidro. A sombra na janela é **exatamente** a da peça infinita sempre que |tan ψ| ≤ 20 (prolongamentos para os lados) e tan α_perfil ≤ 20 (para cima e para baixo), isto é, com o sol a mais de 2,9° do plano da fachada (cos θ ≥ 0,05 nesse sentido). Prova: um ponto da peça a uma distância y do vidro projeta-se na janela deslocado de y · tan ψ na horizontal (spec 07, seção 7.2); um ponto além de L da aresta da janela só cai na janela com y · |tan ψ| > L, ou seja, |tan ψ| > L / y ≥ 20. O mesmo vale na vertical. O arquivo diz isso num comentário.
- **Janela de outro tamanho.** As frações de profundidade usam a janela do passo 6. Se a janela do modelo do usuário (13.3) tiver outro tamanho, as peças continuam com as medidas absolutas do passo 6 e o arquivo avisa; o EnergyPlus multiplica a fração pela janela dele.

## 13.3 Objetos para o seu modelo

O usuário informa o nome da janela (padrão `JANELA`) e o da parede (padrão `PAREDE`). Os objetos por projeção só precisam do nome da janela. As placas detalhadas precisam da posição da janela no modelo:

- **Com a janela colada:** o usuário cola o objeto `FenestrationSurface:Detailed` da janela, tirado do IDF dele. A aplicação lê o nome, a parede-base e os 4 vértices e confere: 4 vértices, num plano (desvio ≤ 1 mm), retângulo (ângulos retos, desvio ≤ 1 mm nas diagonais), vertical (componente vertical da normal ≤ 10⁻³). A normal externa sai da ordem dos vértices (regra de Newell), com o sentido dado pelo `GlobalGeometryRules` do modelo (anti-horário, o padrão, ou horário, que o usuário escolhe). O referencial da fachada vem da janela: n = normal externa, e_z = (0, 0, 1), e_x = n × e_z, O = o vértice de menor x e menor z. A largura e a altura da janela colada são comparadas com as do passo 6 (aviso acima de 1 mm), e o azimute da normal com a orientação do passo 2 (aviso acima de 0,5°; com *Building North Axis* diferente de 0, a diferença é esperada).
- **Sem a janela colada:** O = (0, 0, 0) e θ = orientação do passo 2, como no modelo para conferir. O arquivo diz que as placas detalhadas estão nesse referencial.
- **Coordenadas relativas.** Se o modelo usa `GlobalGeometryRules` com `Relative`, os vértices colados são relativos à origem da zona; as placas `Shading:Zone:Detailed` ficam no mesmo referencial, mas as `Shading:Building:Detailed` são relativas à origem do edifício e precisam do deslocamento da zona. O arquivo diz isso.

O arquivo começa por comentários (`!`) com a origem (SOL-AR, versão, data), o local, a orientação, a janela, a lista das peças com o objeto escolhido para cada uma, as hipóteses acima e o link da configuração. Formato do IDF: um objeto por bloco, campos com o nome do campo em comentário (`!- Name`), como o IDF Editor escreve; números com até 6 casas, ponto decimal.

## 13.4 Modelo para conferir

O mesmo arranjo do F3.8 (spec 07, seção 7.10): `Version` 26.2; `Building` com *Solar Distribution* `FullExterior` e *North Axis* 0; `ShadowCalculation` com `PolygonClipping`, cálculo a cada passo de tempo e Sutherland e Hodgman; `Timestep` 6; `RunPeriod` de 1/1 a 31/12/2026, sem horário de verão; `GlobalGeometryRules` `UpperLeftCorner`, `Counterclockwise`, `World`; `Site:Location` com o nome, a latitude, a longitude, o fuso e a elevação do local do passo 1. Uma zona em caixa atrás da fachada: parede da frente com 1 m de margem em volta da janela, 4 m de fundo, paredes laterais e cobertura expostas ao sol, piso adiabático; materiais sem massa; vidro simples (`WindowMaterial:SimpleGlazingSystem`). A janela tem o nome dado pelo usuário, e a parede da frente, o nome da parede. As peças são as da seção 13.2. Saída: *Surface Outside Face Sunlit Fraction* da janela, a cada passo de tempo.

Os vértices seguem o `GlobalGeometryRules`: a partir do canto superior esquerdo visto de fora, no sentido anti-horário visto de fora. Para a janela: (W, 0, H), (W, 0, 0), (0, 0, 0), (0, 0, H) na fachada, porque a esquerda de quem olha de fora é x = W.

## 13.5 Corte e vista em DXF

Os desenhos da seção 7.11 da spec 07 (`sectionDrawing` e `elevationDrawing`), em metros (1 unidade = 1 m; `$INSUNITS` = 6), lado a lado: o corte com o vidro em X = 0 e o peitoril em Y = 0, e a vista à direita, a 1 m da borda do corte, também com o peitoril em Y = 0. Formato DXF R12 (AC1009), em texto ASCII, que o AutoCAD, o LibreCAD, o QCAD e o BricsCAD abrem. Camadas:

| Camada | O quê | Cor (ACI) | Linha |
|---|---|---|---|
| `CORTE-PECA`, `VISTA-PECA` | peças cortadas (corte) ou vistas (vista) | 7 | contínua |
| `CORTE-ALEM` | peças além do plano do corte | 8 | tracejada (`DASHED`) |
| `CORTE-PAREDE`, `VISTA-PAREDE` | parede | 9 | contínua |
| `CORTE-VIDRO`, `VISTA-VIDRO` | vidro | 5 | contínua |
| `COTAS` | linhas de cota e de ângulo | 1 | contínua |
| `TEXTOS` | títulos, cotas (em metros, vírgula decimal) e ângulos ("alfa 55,0%%d", "gama dir. 50,2%%d"; `%%d` é o grau no DXF) | 7 | contínua |

Corte e vista ficam em camadas separadas para que o CAD mostre ou esconda um deles, e para que a conferência saiba de que desenho cada entidade é. Polígonos como `POLYLINE` fechada (flag 1) com `VERTEX` e `SEQEND`; placas vistas de perfil (área nula) como uma `LINE` entre os dois pontos mais afastados. Os pontos cortados por prolongamento infinito (spec 07, seção 7.11) ganham o texto "(infinito)". Sem acentos nos textos: o R12 não tem uma codificação comum a todos os programas.

## 13.6 Validação e tolerâncias

O teste de referência vem antes do código. A referência independente é o próprio EnergyPlus 26.2, que lê os arquivos exportados, e um leitor de DXF de terceiros (ezdxf).

**Arranjo** (`docs/validacao/scripts/energyplus_exportacao.py`). Os arquivos exportados para as cenas de teste ficam em `docs/validacao/casos/energyplus/exportacao/` e são gerados pela própria aplicação (`tests/referencia/energyplusExportacao.test.ts`, com `ATUALIZAR_EXPORTACAO=1`); o teste falha se o exportador mudar e os arquivos não forem regenerados, para que os resultados do EnergyPlus correspondam sempre ao código. O script roda o EnergyPlus em cada modelo para conferir, com o EPW do local e uma cópia que acrescenta `Output:Surfaces:Drawing, DXF`, e grava a fração ensolarada por passo de tempo e as superfícies geradas.

**Cenas:** as 8 do F3.8 (o mesmo arranjo, as mesmas peças e locais) e 3 novas, que usam os objetos por projeção com assimetria entre os lados (para pegar uma troca de esquerda e direita) e prolongamentos infinitos:

- `projecao-assimetrica` (Florianópolis, fachada a 300°): brise sem afastamento com prolongamentos de 0,1 e 0,7 m; aletas de profundidades 0,3 e 0,6 m, a 0,05 e 0,25 m da janela, prolongadas de modos diferentes;
- `aleta-sozinha-infinita` (Porto Alegre, fachada a 60°): brise com prolongamentos infinitos e uma aleta só, infinita para cima;
- `objetos-no-modelo` (Manaus, fachada a 225°): os objetos para o seu modelo, com a janela colada de um modelo cuja janela não está na origem, acrescentados ao modelo base sem peças; confere a leitura da janela colada e a passagem para o mundo.

| Comparação | Referência | Tolerância |
|---|---|---|
| Geometria: cada superfície de sombreamento que o EnergyPlus montou (inclusive as dos objetos por projeção), lida do `eplusout.dxf` (5 casas), contra as placas da aplicação passadas para o mundo num cálculo independente em Python (`mascara_geometria.py` e a seção 13.1) | EnergyPlus 26.2 | correspondência um a um; distância entre vértices ≤ 2 × 10⁻⁵ m |
| Fração ensolarada hora a hora, ano inteiro, com o sol do EnergyPlus nos dois cálculos | aplicação (spec 07) | os critérios do F3.8 (decisão 0019): ≤ 10⁻⁴ nas horas sem passo rasante (cos θ < 10⁻³); horas com passo rasante ≤ 1% do ano |
| Fração ensolarada hora a hora das 8 cenas do F3.8, modelo exportado contra o modelo do F3.8 | EnergyPlus 26.2 (os dois) | ≤ 10⁻⁴ nas horas sem passo rasante |
| Prolongamento infinito exportado com L = 20 · y_máx | percentual sombreado da peça infinita (spec 07, seção 7.3) | 10⁻¹² nas direções com \|tan ψ\| ≤ 20 e tan α_perfil ≤ 20 |
| Leitura da janela colada | vértices conhecidos, nas quatro ordens de partida e nos dois sentidos | 10⁻⁹ m |
| DXF | ezdxf (leitura e auditoria) e as placas em Python | abre sem erro nem correção na auditoria; vidro igual a W × H; caixa de cada peça da vista e cada segmento do corte iguais às placas projetadas ou cortadas em Python, ≤ 10⁻⁶ m |

## Referências

- U.S. DOE. *EnergyPlus Input Output Reference*, versão 26.2: `Shading:Overhang:Projection`, `Shading:Fin:Projection`, `Shading:Zone:Detailed`, `Shading:Building:Detailed`, `FenestrationSurface:Detailed`, `GlobalGeometryRules`, `Output:Surfaces:Drawing`. Campos conferidos no `Energy+.idd` do pacote 26.2.0.
- U.S. DOE. *EnergyPlus 26.2.0* (pacote Linux, Ubuntu 24.04, SHA-256 `b848da82…c433a8a1`), https://github.com/NREL/EnergyPlus/releases/tag/v26.2.0.
- Autodesk. *DXF Reference* (R12, AC1009): seções HEADER, TABLES (LTYPE, LAYER) e ENTITIES; entidades LINE, POLYLINE, VERTEX, SEQEND e TEXT.
- Moitzi, M. *ezdxf* (Python), usado só na validação.

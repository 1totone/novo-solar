# 0043. Exportação para o EnergyPlus e para o CAD (F5.2)

- Data: 2026-10-27
- Status: proposta. Item 27 da issue #65. Implementada numa branch da Fase 5 a partir da integração da Fase 4, só para a prévia; não entra na `main` antes dos portões. Se o Prof. Lamberts pedir a exportação na v1.0 (pergunta da decisão 0037, no portão 2), ela vira o passo F4.11 com este código.

## Contexto

O ROADMAP põe no F5.2 a exportação da proteção para o EnergyPlus (`Shading:Overhang:Projection`, `Shading:Fin:Projection` e `Shading:Zone:Detailed`), com teste de ida e volta, e o corte e a vista em DXF. A decisão 0037 deixou a exportação para a v2.0 e a pergunta ao Prof. Lamberts para o portão 2; ver a exportação funcionando ajuda a responder. O arranjo do F3.8 já roda o EnergyPlus 26.2 com as placas da spec 07 e serve de referência.

## Decisão

1. **Cada peça vira o objeto que a descreve** (spec 13, seção 13.2): brise sem recuo nem afastamento, `Shading:Overhang:Projection`; par de aletas nas mesmas condições, `Shading:Fin:Projection`; o resto, placa por placa, `Shading:Zone:Detailed` se encostada na fachada (e o recuo do vidro), `Shading:Building:Detailed` se afastada. Os objetos por projeção levam o nome da janela; as placas, a parede como base (as encostadas) e vértices no mundo.
2. **Esquerda e direita dos objetos por projeção são vistas de fora**, ao contrário do referencial da fachada; conferido no EnergyPlus 26.2 pelas superfícies geradas e pela sombra (relatório do F5.2).
3. **Aleta sem par sai como placa**, não como `Shading:Fin:Projection` com uma profundidade 0, que dá aviso no EnergyPlus.
4. **Prolongamento infinito sai com L = 20 · y_máx** além da aresta da janela: a sombra na janela é exatamente a da peça infinita com o sol a mais de 2,9° do plano da fachada (prova na spec 13, seção 13.2). Placas de 10⁶ m estouram o recorte de polígonos do EnergyPlus.
5. **Três arquivos:** objetos para o modelo do usuário (com a janela colada do IDF dele, que dá a posição e os nomes, ou com a janela na origem); um modelo mínimo para conferir, que roda sozinho; o corte e a vista em DXF R12, em metros.
6. **Validação:** o EnergyPlus 26.2 roda os arquivos exportados de 11 cenas (as 8 do F3.8 e 3 novas); geometria até 2 × 10⁻⁵ m e fração ensolarada até 10⁻⁴ com o mesmo sol, fora das horas rasantes; o ezdxf lê e audita os DXF.

## Alternativas consideradas

- **Tudo como `Shading:Building:Detailed`**, como no F3.8: mais simples e já verificado, mas o usuário perde os objetos que o IDF Editor e o próprio EnergyPlus documentam para brise e aletas, que mudam junto com a janela.
- **`Shading:Zone:Detailed` também para as peças afastadas:** igual para a sombra; a distinção entre encostada e afastada ajuda quem lê o modelo e segue o uso do EnergyPlus.
- **`Outside Reveal Depth` (`WindowProperty:FrameAndDivider`) para o recuo:** o efeito dele na fração ensolarada não foi conferido; as quatro placas são exatas e foram conferidas.
- **Recusar a exportação com prolongamento infinito:** o caso do brise contínuo ao longo da fachada é comum; o limite de 20 · y_máx não muda a sombra fora de 2,9° do plano da fachada.
- **Ler o IDF inteiro do usuário** (zonas, origens, `Building North Axis`): mais completo, mas exige um leitor de IDF; colar só a janela cobre o caso comum, com avisos quando a orientação ou o tamanho não batem.
- **DXF R2000 ou mais novo, em UTF-8:** permite acentos e "∞", mas exige identificadores e seções que o R12 dispensa; o R12 em ASCII é o que mais programas abrem.

## Consequências

- O passo 6 ganha a seção recolhida "EnergyPlus e CAD", depois da exportação do corte e da vista em SVG; os passos 1 a 5 não mudam.
- Os textos do arquivo IDF (comentários) ficam em português sem acento, em qualquer idioma da interface.
- Uma versão nova do EnergyPlus pede refazer o teste de ida e volta (o script e o teste ficam prontos para isso).
- O DXF não foi aberto num CAD comercial; a conferência fica para o Anthony ou o LabEEE.

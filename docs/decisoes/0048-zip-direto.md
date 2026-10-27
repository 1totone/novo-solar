# 0048. Abrir o .zip do TMYx direto no navegador

- Data: 2026-10-27
- Status: proposta (item g da decisão 0044; escolhas do Claude sem base clara, marcadas abaixo).

## Contexto

No piloto do F2.9 (problema 6 de `docs/ux/F2.9-piloto-P0.md`), a tarefa 6 pedia para baixar o arquivo recente de Recife (um .zip do Climate.OneBuilding.org), descompactar e carregar o .epw. Descompactar é um passo a mais, diferente em cada sistema e difícil no celular. O Anthony pediu carregar o .zip direto, com uma biblioteca pequena e sem servidor (decisão 0044, item g).

Os .zip do TMYx trazem um .epw e os arquivos que o acompanham (.clm, .ddy, .pvsyst, .rain, .stat, .wea), comprimidos com deflate. O de Recife tem 380.627 bytes; o .epw de dentro, 1.604.782.

## Decisão

1. **O campo de arquivo do passo 1 aceita .zip** ("EPW, .zip do TMYx ou CSV do SOL-AR"). O arquivo é reconhecido pela assinatura do .zip, não pela extensão.
2. **Biblioteca: fflate 0.8.3 (MIT)**, a mesma versão que o `@types/three` já trazia entre as dependências de desenvolvimento. Proposta: o fflate em vez do `DecompressionStream` nativo, que dispensaria a biblioteca, mas falta em navegadores ainda em uso (Safari antes do 16.4) e exigiria ler a estrutura do .zip à mão. O fflate vem num bloco próprio de cerca de 5 kB (2,7 kB com gzip), baixado só quando a pessoa escolhe um .zip; o bloco inicial não muda (decisão 0039).
3. **Só o .epw é descompactado.** O resto do .zip é ignorado, e as cópias que o macOS põe em `__MACOSX/` ficam de fora. O arquivo carregado leva o nome do .epw de dentro, para que o código da estação no nome continue ligando o arquivo à cidade e ao catálogo (decisões 0034 e 0047).
4. **Proposta: um .zip com mais de um .epw é recusado**, com o aviso para descompactar e escolher; um .zip sem .epw ou corrompido também, cada um com a sua frase. Escolher entre vários .epw pediria mais uma tela para um caso que os .zip do TMYx não têm.
5. Textos: o passo 1 e o catálogo deixam de pedir para descompactar; a página do teste e os roteiros mudam no PR do item j.

## Alternativas consideradas

- **Pedir para descompactar, com instruções melhores:** continua sendo um passo fora da ferramenta, o que mais falhou no celular.
- **JSZip:** faz o mesmo, com um bloco perto de dez vezes maior.

## Consequências

- `src/ui/data/zipFile.ts`, com teste de unidade (.zip como os do TMYx, em pasta, com `__MACOSX/`, sem .epw, com dois e corrompido), e o campo do passo 1.
- Teste de ponta a ponta (`e2e/zip.spec.ts`): um .zip com a estrutura dos do TMYx abre o .epw de dentro, com a cidade, e pinta a carta; os três avisos. Conferido também, na sessão, com o .zip real de Recife (2011 a 2025): o .epw descompactado pelo fflate é idêntico, byte a byte, ao do `zipfile` do Python (SHA-256 igual, 1.604.782 bytes), e a carta chega 179 ms depois de escolher o arquivo, com o período e os avisos do arquivo.
- Guia do mantenedor: a pilha e os blocos sob demanda citam o fflate.

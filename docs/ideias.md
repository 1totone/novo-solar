# Estacionamento de ideias

Ideias que surgiram mas não pertencem à fase atual. A triagem acontece nos portões de fase: a ideia fica aqui, entra numa fase do ROADMAP ou é descartada.

| Ideia | Origem | Data | Situação |
|---|---|---|---|
| Carta psicrométrica com estratégias bioclimáticas (integração com o Analysis BIO) | análise inicial | 2026-10-23 | aguardando |
| Superfícies inclinadas (claraboias, coberturas) | análise inicial | 2026-10-23 | aguardando |
| Obstruções do entorno a partir de foto olho de peixe ou 360° | análise inicial | 2026-10-23 | aguardando |
| Versão desktop empacotada (Tauri), se houver demanda | análise inicial | 2026-10-23 | aguardando |
| Espelho do núcleo de cálculo em Python para pesquisa | análise inicial | 2026-10-23 | aguardando |
| Iluminação natural | análise inicial | 2026-10-23 | fora do escopo (decisão 0006) |
| Acelerar as 52 560 posições do sol do ano (1 s por local): parte geocêntrica do SPA por hora, interpolada nas amostras, com teste contra o pvlib | núcleo do F3.3 | 2026-10-24 | aguardando (avaliar na interface da Fase 3) |
| Prolongamentos mínimos com janela recuada: max((H + e) · cot γ − d · tan ψ) nas amostras do brise e W · tan γ − d · tan α no topo da aleta (conferidos pela geometria; não valem para lâminas, em que o raio passa pela fresta). No tutorial, com parede de 15 cm, 0,61 e 0,85 m em vez de 0,91 e 1,63 m | figuras do tutorial no F3.6 | 2026-10-25 | aguardando (avaliar com a interface do F3.6) |
| Estação editável na correção do vento (altura e terreno do anemômetro, como no Site:WeatherStation) e α e δ livres (como no Site:HeightVariation) | F4.4, decisão 0027 | 2026-10-26 | aguardando |
| Aviso de velocidades em passos de nó (98% das velocidades dos TMYx são nós inteiros arredondados a 0,1 m/s), que fazem a calmaria e as classes da rosa corrigida mudarem em degraus | relatório do F4.4, seção 3 | 2026-10-26 | aguardando |
| Rosa com a direção corrigida pelo entorno (canalização, proteção por vizinhos), com dados de túnel de vento ou CFD | F4.4 | 2026-10-26 | aguardando (fora do alcance de uma ferramenta sem servidor) |
| Contorno nas regiões da máscara pelos ângulos, para a região parcial ter 3:1 com o fundo mesmo sem o transferidor (hoje 1,3:1; as curvas do transferidor desenham as bordas) | decisão 0030 | 2026-10-26 | aguardando |
| Medir o efeito do atraso de cerca de 30 min da radiação dos TMYx do Brasil nos indicadores do passo 7 (radiação bloqueada e admitida), deslocando a série de propósito e comparando | relatório do F4.1, seção 4 | 2026-10-26 | aguardando |
| Calcular o atraso da radiação de qualquer arquivo carregado (hoje só os TMYx do catálogo têm o valor), num web worker, e mostrar junto dos outros avisos de qualidade | F4.1 | 2026-10-26 | feita no F4.2 (decisão 0035), sem worker: 15 a 35 ms por arquivo |
| Oferecer, com aviso e fora do padrão, a correção do atraso da radiação de um arquivo (deslocar a série pelo atraso medido), para comparar; também antes da diferença entre climas (no BrazFuture, de −46 a +116 min, relatório do F4.2) | F4.1, F4.2 | 2026-10-26 | aguardando (decisão de física do Anthony) |
| Medir o efeito do atraso de cerca de 30 min da radiação dos TMYx numa simulação do EnergyPlus: radiação incidente anual em fachadas leste e oeste com o arquivo original e com a radiação deslocada de propósito | pré-revisão da issue #65, decisão 0035 | 2026-10-27 | aguardando |
| Primeiro desenho da carta mais rápido: a maior tarefa longa da primeira abertura (1,3 a 1,4 s num celular emulado com CPU 4 vezes mais lenta, igual na `main`) é o cálculo das trajetórias e das linhas horárias pelo SPA; calcular no worker ou guardar por local | `docs/ux/F4-acabamento-desempenho.md` | 2026-10-26 | aguardando (mexe no caminho das 9 tarefas do F2.9: depois do teste) |
| Arquivos TMYx 2011-2025 dentro da ferramenta (escolher a cidade e pronto, sem baixar), como perguntou o piloto do F2.9: depende da permissão de redistribuir do Climate.OneBuilding.org (decisão 0034); com permissão, os arquivos das cidades do catálogo vêm com a aplicação ou são baixados por ela, numa revisão da 0034 | piloto do F2.9 (P0, problema 12) | 2026-10-27 | aguardando (resposta do OneBuilding ao e-mail) |
| No celular, "Compartilhar" abrir também a folha de compartilhamento do sistema (Web Share API: WhatsApp, e-mail), além de copiar o link | decisão 0049 | 2026-10-27 | aguardando (depois do teste com participantes) |
| Guardar no navegador, se a pessoa pedir, os arquivos climáticos carregados, para que voltem ao reabrir a página (hoje ficam só na memória da página ou no arquivo de projeto) | decisão 0047 | 2026-10-27 | aguardando |

# 0031. Instalável e funcionando sem internet (F4.6)

- Data: 2026-10-26
- Status: aceita por delegação (pré-revisão do Claude, 27/10/2026); validação por colegas pendente. Item 14 da issue #65 ([pré-revisão](https://github.com/1totone/novo-solar/issues/65#issuecomment-6444200303)).

## Contexto

O ROADMAP pede, no F4.6, a aplicação instalável e funcionando sem internet; a instrução da sessão acrescenta "sem requisições externas, build portátil". A aplicação já é estática e não faz requisições externas (os arquivos climáticos recentes são links para o usuário baixar). Faltava guardar a aplicação no navegador, com o build relativo (`base: './'`) servido em qualquer pasta, inclusive nas prévias dos PRs (`pr/<número>/`).

## Decisão

1. **Manifesto** (`public/manifest.webmanifest`) com `start_url` e `scope` relativos (`./`), exibição `standalone`, cor do tema e ícones de 192 e 512 px, um mascarável e o SVG; ícones gerados do `favicon.svg` por `scripts/pwa/icones.mjs`.
2. **Service worker gerado no build** (`scripts/pwa/plugin.ts` sobre `scripts/pwa/sw-template.js`), sem dependência nova: a lista dos arquivos do build e a versão (do `package.json` e do commit) entram no `sw.js`.
   - Na instalação, guarda a aplicação inteira (HTML, JavaScript, CSS, workers, o bloco da vista 3D, manifesto e ícones), cerca de 1,2 MB.
   - Os **dados históricos** (os CSV do SOL-AR 6.2, cerca de 10 MB no total) não são guardados na instalação: cada cidade fica guardada quando é aberta (com a página já controlada pelo service worker, em geral a partir da segunda visita).
   - A página vem da rede quando há internet (versão nova) e da cópia guardada quando não há; os demais arquivos vêm da cópia, com nome que muda a cada versão. Uma versão nova se instala em segundo plano e passa a valer quando as abas antigas fecham (sem trocar arquivos no meio do uso).
   - As prévias dos PRs (`pr/<número>/`) ficam fora do service worker do endereço principal; cada prévia tem o seu.
3. **Nada sai do navegador:** o teste de ponta a ponta confere que nenhuma requisição vai para fora do endereço da aplicação, inclusive com dados históricos, rosa e vista 3D.
4. Nos testes, o service worker fica bloqueado (para que uma cópia guardada não interfira), salvo no teste sem internet.

## Alternativas consideradas

- **vite-plugin-pwa (Workbox):** completo e conhecido, mas traz dependências grandes para um service worker de 60 linhas; o gerado aqui é legível e testado.
- **Guardar todos os dados históricos na instalação:** a aplicação inteira funcionaria sem internet desde a primeira visita, mas cada visita nova baixaria 10 MB, pesado no celular; o usuário abre só as cidades que usa.
- **Ativar a versão nova na hora (skipWaiting):** atualização imediata, mas uma aba aberta poderia pedir um arquivo da versão antiga que já não existe no servidor.

## Consequências

- `sw.js` e `manifest.webmanifest` no build; `index.html` com o manifesto, a cor do tema e o ícone para iOS.
- `e2e/offline.spec.ts`: manifesto e ícones, nenhuma requisição externa e a aplicação reaberta sem internet (carta, dados históricos já abertos, máscara e vista 3D); duas mutações do service worker (sem o bloco 3D, sem a página guardada) derrubam o teste.
- A instalação de fato ("Adicionar à tela inicial", "Instalar aplicativo") depende do navegador e só foi conferida pelos requisitos (manifesto, service worker, HTTPS no GitHub Pages); fica para a revisão do Anthony num celular e num computador.

# 0008. Publicação no GitHub Pages com prévia por PR

- Data: 2026-10-23
- Status: aceita

## Contexto

O ROADMAP pede publicação automática no GitHub Pages e uma prévia de cada PR num endereço próprio. Com a fonte do Pages em "GitHub Actions" (seção 7.2), cada publicação substitui o site inteiro, e o ambiente `github-pages` só aceita publicações a partir da branch padrão; um workflow disparado por `pull_request` não consegue publicar.

## Decisão

- O workflow `CI` (`.github/workflows/ci.yml`) roda em cada PR e em cada push na `main`: formatação, estilo, tipos, testes de unidade, build e testes de ponta a ponta.
- O workflow `Pages` (`.github/workflows/pages.yml`) roda depois de cada CI verde, pelo evento `workflow_run`, que executa no contexto da `main` e por isso pode publicar. Ele monta o site inteiro de novo:
  - raiz: build da `main`;
  - `pr/<número>/`: build de cada PR aberto deste repositório.
- O link da prévia aparece no PR como status "Prévia" (sem comentários automáticos).
- PRs de forks não ganham prévia: o código deles não roda num job com permissão de publicação.
- A prévia de um PR fechado sai do site na publicação seguinte.

## Alternativas consideradas

- **Branch `gh-pages` com pastas por PR** (ex.: ações de prévia prontas): exigiria a fonte do Pages em "branch", contrariando a seção 7.2, e acumula histórico de builds no repositório.
- **Serviço externo de prévias (Netlify, Vercel, Cloudflare):** contas e limites de terceiros, contra o princípio 6.
- **Sem prévia por PR:** mais simples, mas o Anthony perderia a forma de conferir uma mudança antes do merge.

## Consequências

- Cada publicação reconstrói a `main` e os PRs abertos; com poucos PRs abertos, leva cerca de um minuto.
- O workflow `Pages` só passa a valer depois de estar na `main` (regra do `workflow_run`); o primeiro PR que o introduz não tem prévia.
- O build de cada PR roda num job sem permissão de escrita nem de publicação; a publicação acontece em outro job, que só recebe o artefato pronto.

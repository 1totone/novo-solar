# 0001. Repositório público no GitHub e site no GitHub Pages

- Data: 2026-10-23
- Status: aceita

## Contexto

O projeto será aberto e precisa de cópia na nuvem, testes automáticos e publicação do site. A conta pessoal do Anthony (1totone) estava com 90% da cota mensal de minutos do GitHub Actions gasta por outros projetos; essa cota só vale para repositórios privados. Em repositório público, Actions (executores padrão) e Pages são gratuitos.

## Decisão

- Repositório público `1totone/novo-solar` no GitHub.
- GitHub Actions para verificação de estilo, testes e build.
- GitHub Pages para publicação, com prévia de cada PR.
- Endereço definitivo combinado com o LabEEE antes do lançamento; recomendação: subdomínio da UFSC apontando para o GitHub Pages (ROADMAP, seção 7.1).

## Alternativas consideradas

- **Organização própria no GitHub:** adiada; o repositório pode ser transferido depois.
- **GitLab:** 400 minutos de CI por mês no plano gratuito, inclusive para projetos públicos, e sem integração com as sessões na nuvem do Claude Code.
- **Repositório privado:** consumiria a cota de Actions e não teria Pages no plano gratuito.

## Consequências

- Testes e publicação sem custo e sem cota.
- O endereço `1totone.github.io/novo-solar` é de prévia e não deve ser divulgado como definitivo: se o repositório mudar de conta, o GitHub redireciona o repositório, mas não o endereço do Pages.

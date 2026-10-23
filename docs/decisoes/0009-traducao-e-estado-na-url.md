# 0009. Tradução sem biblioteca externa e estado da aplicação no # da URL

- Data: 2026-10-23
- Status: aceita

## Contexto

A decisão 0005 pede estrutura de tradução desde o início; a decisão 0004 pede estado na URL via `#` e nenhuma rota de servidor. As duas coisas precisam existir já no F0.3, mas com o mínimo de dependências (princípio 6) e de forma que a manutenção futura pelo LabEEE seja simples.

## Decisão

- **Tradução:** módulo próprio em `src/ui/i18n/`. Um catálogo por idioma (`messages.pt-BR.ts`), com as chaves tipadas pelo TypeScript: uma chave inexistente ou um idioma com chave faltando não compila. Parâmetros no formato `{nome}`. Números formatados com `Intl.NumberFormat` (vírgula decimal em português). ES e EN entram na Fase 4 com as mesmas chaves.
- **Estado na URL:** pares `chave=valor` depois do `#` (`src/ui/state/`), em ordem alfabética para links estáveis. O `#` nunca chega ao servidor, então o mesmo link funciona no GitHub Pages, num subdomínio ou numa pasta de servidor.

## Alternativas consideradas

- **react-i18next ou FormatJS:** completas (plurais, carregamento sob demanda), mas acrescentam dependências e conceitos que a interface ainda não precisa. Se plurais ou formatação de datas complexas virarem necessidade, a troca fica restrita a `src/ui/i18n/`.
- **Roteador (React Router em modo hash):** desnecessário enquanto a aplicação for uma tela com painéis.

## Consequências

- Nenhum texto de interface fica fixo nos componentes; todos passam por `t('chave')`.
- Links compartilháveis já funcionam (ex.: `#painel=sobre`); o projeto salvo e o link que reabre o mesmo estado (F4.7) partem daqui.

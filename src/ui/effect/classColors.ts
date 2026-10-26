export type ClassName = 'cold' | 'neutral' | 'hot' | 'none';

/** Ordem das classes na barra e na tabela: do frio ao quente, e as sem classe no fim. */
export const CLASS_ORDER: ClassName[] = ['cold', 'neutral', 'hot', 'none'];

/**
 * Cores das classes: divergente azul (frias) e vermelho (quentes) com cinza no meio, da paleta dos
 * dados sobre a carta (src/ui/overlay/palettes.ts); sem classe, hachura cinza. Frias e quentes
 * ficam a ΔE 18,8 na protanopia (decisão 0030; tests/acessibilidade/paleta.test.ts).
 */
export const CLASS_COLORS: Record<Exclude<ClassName, 'none'>, string> = {
  cold: '#3872bc',
  neutral: '#e5e4e2',
  hot: '#b94643',
};

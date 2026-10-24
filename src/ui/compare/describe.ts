import type { HashState } from '../state/hashState';
import { protractorFromHash } from '../state/protractorHash';
import { siteFromHash } from '../state/siteHash';

/**
 * Resumo curto de uma configuração para os rótulos da comparação lado a lado, nos termos da tela:
 * local, fachada e ângulos digitados (na referência escolhida).
 */
export function describeConfig(
  hash: HashState,
  format: (v: number) => string,
  words: { orientation: (degrees: string) => string; none: string },
): string {
  const site = siteFromHash(hash).site.name;
  const p = protractorFromHash(hash);
  const parts = [site, words.orientation(format(((p.orientation % 360) + 360) % 360))];
  const angles: string[] = [];
  const add = (symbol: string, values: readonly (number | undefined)[] | undefined) => {
    if (!values) return;
    const [v1, v2] = values;
    if (v1 === undefined) return;
    angles.push(`${symbol} ${format(v1)}°${v2 === undefined ? '' : `/${format(v2)}°`}`);
  };
  add('α', p.angles.alpha);
  add('β d', p.angles.betaRight);
  add('β e', p.angles.betaLeft);
  add('γ d', p.angles.gammaRight);
  add('γ e', p.angles.gammaLeft);
  parts.push(angles.length > 0 ? angles.join(', ') : words.none);
  return parts.join(' · ');
}

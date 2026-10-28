import { describe, expect, it } from 'vitest';
import {
  alternativesFromHash,
  alternativesPatch,
  geometryCode,
  applyAlternativePatch,
} from './alternativesHash';
import { buildHash, parseHash } from './hashState';

describe('alternativas no link', () => {
  const current = parseHash('#jl=1%2C5&ja=1%2C2&pc1=b_0%2C3&pc2=ae_0%2C4');

  it('a proteção atual vira texto, e o texto volta como a mesma geometria', () => {
    const code = geometryCode(current);
    expect(code).toBe('1,5|1,2||b_0,3~ae_0,4');
    const hash = buildHash({ ...alternativesPatch([{ label: 'Brise e aleta', code }]) });
    const [alt] = alternativesFromHash(parseHash(hash));
    expect(alt!.key).toBe('alter1');
    expect(alt!.label).toBe('Brise e aleta');
    expect(alt!.geometry.window).toEqual({ width: 1.5, height: 1.2, setback: 0 });
    expect(alt!.geometry.devices.map((d) => d.kind)).toEqual(['overhang', 'fin']);
  });

  it('nome vazio vira "Alternativa n"; separadores saem do nome; lista renumerada', () => {
    const patch = alternativesPatch([
      { label: ' ', code: '1|1||' },
      { label: 'a|b~c', code: '2|1||' },
    ]);
    expect(patch.alter1).toBe('Alternativa 1|1|1||');
    expect(patch.alter2).toBe('abc|2|1||');
    expect(patch.alter3).toBe('');
    const list = alternativesFromHash(parseHash(buildHash(patch)));
    expect(list.map((a) => a.label)).toEqual(['Alternativa 1', 'abc']);
  });

  it('usar uma alternativa troca a janela e todas as peças do passo 6', () => {
    const patch = applyAlternativePatch('2|1|0,1|b_0,5');
    expect(patch).toMatchObject({ jl: '2', ja: '1', jr: '0,1', pc1: 'b_0,5', pc2: '' });
    expect(patch.pc9).toBe('');
  });
});

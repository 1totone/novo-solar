import { describe, expect, it } from 'vitest';
import { shadingChart } from '../../core/shading/contours';
import { buildScene } from '../../core/shading/geometry';
import { peekShading, requestShading, shadingKey, type ShadingInput } from './shadingClient';

const INPUT: ShadingInput = {
  window: { width: 1.2, height: 1 },
  devices: [{ kind: 'overhang', depth: 0.5, above: 0, extendLeft: Infinity, extendRight: 0.2 }],
  orientation: 30,
};

describe('curvas da geometria com cache', () => {
  it('a chave distingue o prolongamento infinito e a orientação', () => {
    expect(shadingKey(INPUT)).toBe(shadingKey({ ...INPUT, devices: [...INPUT.devices] }));
    expect(shadingKey(INPUT)).toContain('"inf"');
    expect(shadingKey(INPUT)).not.toBe(shadingKey({ ...INPUT, orientation: 31 }));
    expect(shadingKey(INPUT)).not.toBe(
      shadingKey({ ...INPUT, devices: [{ ...INPUT.devices[0]!, extendLeft: 1e6 }] as never }),
    );
  });

  it('sem worker, calcula na linha principal e guarda o resultado', async () => {
    const key = shadingKey(INPUT);
    expect(peekShading(key)).toBeNull();
    const { promise } = requestShading(INPUT);
    const chart = await promise;
    expect(peekShading(key)).toBe(chart);
    expect(chart).toEqual(shadingChart(buildScene(INPUT.window, INPUT.devices), 30));
    expect(await requestShading({ ...INPUT }).promise).toBe(chart);
  });

  it('cálculo que falha resolve com null e não entra no cache', async () => {
    // Janela de largura nula: buildScene recusa (a interface não deixa chegar aqui).
    const bad: ShadingInput = { ...INPUT, window: { width: 0, height: 1 } };
    expect(await requestShading(bad).promise).toBeNull();
    expect(peekShading(shadingKey(bad))).toBeNull();
  });
});

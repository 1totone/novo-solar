import { describe, expect, it } from 'vitest';
import { buildScene, type Device, type WindowGeometry } from '../shading/geometry';
import { shadedFraction, type FacadeVector } from '../shading/shadedFraction';
import { ascii, invalidName, modelIdf, num, objectsIdf } from './idf';
import { frameFromAzimuth } from './frame';
import { capInfinite, INFINITE_FACTOR, planExport } from './plan';

const WIN: WindowGeometry = { width: 1.2, height: 1.4 };

/** Direção do sol na fachada a partir de tan ψ e tan α_perfil (spec 07, seção 7.2). */
function sun(tanPsi: number, tanProfile: number): FacadeVector {
  const v = [tanPsi, 1, tanProfile];
  const n = Math.hypot(...v);
  return { x: v[0]! / n, y: v[1]! / n, z: v[2]! / n };
}

describe('prolongamento infinito exportado com L = 20 · y_máx (spec 13, seção 13.2)', () => {
  const cases: [string, WindowGeometry, Device[]][] = [
    [
      'brise',
      WIN,
      [
        {
          kind: 'overhang',
          depth: 0.6,
          above: 0.1,
          gap: 0.2,
          extendLeft: Infinity,
          extendRight: 0.3,
        },
      ],
    ],
    [
      'aleta',
      { ...WIN, setback: 0.15 },
      [
        {
          kind: 'fin',
          side: 'right',
          depth: 0.5,
          offset: 0.1,
          extendAbove: Infinity,
          extendBelow: Infinity,
        },
      ],
    ],
    [
      'lâminas',
      WIN,
      [
        {
          kind: 'horizontalLouvers',
          count: 3,
          chord: 0.3,
          pitch: 0.35,
          angle: 30,
          gap: 0.05,
          above: 0,
          extendLeft: Infinity,
          extendRight: Infinity,
        },
        { kind: 'fin', side: 'left', depth: 0.4, extendAbove: Infinity },
      ],
    ],
  ];

  it.each(cases)(
    '%s: a mesma sombra com |tan ψ| ≤ 20 e tan α_perfil ≤ 20',
    (_, window, devices) => {
      const capped = devices.map((d) => capInfinite(window, d).device);
      expect(capped.some((d, i) => d !== devices[i])).toBe(true);
      const a = buildScene(window, devices);
      const b = buildScene(window, capped);
      let worst = 0;
      let shaded = 0;
      for (let i = 0; i <= 80; i++) {
        for (let j = 0; j <= 40; j++) {
          const s = sun(-20 + i * 0.5, j * 0.5);
          const fa = shadedFraction(a, s);
          worst = Math.max(worst, Math.abs(fa - shadedFraction(b, s)));
          if (fa > 0 && fa < 1) shaded++;
        }
      }
      expect(shaded).toBeGreaterThan(100);
      expect(worst).toBeLessThanOrEqual(1e-12);
    },
  );

  it('o limite é 20 vezes a maior distância da peça ao vidro', () => {
    const c = capInfinite({ ...WIN, setback: 0.1 }, cases[0]![2][0]!);
    expect(c.length).toBeCloseTo(INFINITE_FACTOR * (0.1 + 0.2 + 0.6), 12);
    expect((c.device as Extract<Device, { kind: 'overhang' }>).extendLeft).toBe(c.length);
    expect((c.device as Extract<Device, { kind: 'overhang' }>).extendRight).toBe(0.3);
    expect(capInfinite(WIN, { kind: 'overhang', depth: 1, above: 0 }).length).toBeNull();
  });
});

describe('objeto de cada peça (spec 13, seção 13.2)', () => {
  it('brise e par de aletas por projeção, com esquerda e direita vistas de fora', () => {
    const plan = planExport(
      WIN,
      [
        { kind: 'overhang', depth: 0.6, above: 0.1, extendLeft: 0.2, extendRight: 0.7 },
        { kind: 'fin', side: 'left', depth: 0.3, offset: 0.05, extendAbove: 0.1, extendBelow: 0.4 },
        { kind: 'fin', side: 'right', depth: 0.6, offset: 0.25, extendAbove: 0.5 },
      ],
      'J',
    );
    expect(plan.items.map((i) => i.type)).toEqual([
      'Shading:Overhang:Projection',
      'Shading:Fin:Projection',
    ]);
    const [o, f] = plan.items as [
      Extract<(typeof plan.items)[number], { type: 'Shading:Overhang:Projection' }>,
      Extract<(typeof plan.items)[number], { type: 'Shading:Fin:Projection' }>,
    ];
    expect([o.leftExtension, o.rightExtension]).toEqual([0.7, 0.2]);
    expect(o.depthFraction).toBeCloseTo(0.6 / 1.4, 15);
    expect(f.name).toBe('J Aletas 2-3');
    expect(f.left).toEqual({ extension: 0.25, above: 0.5, below: 0, depthFraction: 0.5 });
    expect(f.right.depthFraction).toBeCloseTo(0.25, 15);
  });

  it('com recuo, afastamento ou aleta sem par: placas detalhadas', () => {
    const plan = planExport(
      { ...WIN, setback: 0.1 },
      [
        { kind: 'overhang', depth: 0.5, above: 0 },
        { kind: 'fin', side: 'right', depth: 0.3, gap: 0.05 },
        {
          kind: 'plate',
          vertices: [
            [0, 0.4, 2],
            [1, 0.4, 2],
            [1, 0.8, 2],
          ],
        },
      ],
      'J',
    );
    expect(plan.items.map((i) => [i.type, i.name])).toEqual([
      ['Shading:Zone:Detailed', 'J Recuo verga'],
      ['Shading:Zone:Detailed', 'J Recuo peitoril'],
      ['Shading:Zone:Detailed', 'J Recuo ombreira esquerda'],
      ['Shading:Zone:Detailed', 'J Recuo ombreira direita'],
      ['Shading:Zone:Detailed', 'J Brise 1'],
      ['Shading:Building:Detailed', 'J Aleta 2'],
      ['Shading:Building:Detailed', 'J Placa 3'],
    ]);
    const single = planExport(WIN, [{ kind: 'fin', side: 'left', depth: 0.3 }], 'J');
    expect(single.items.map((i) => i.type)).toEqual(['Shading:Zone:Detailed']);
  });
});

describe('texto do IDF', () => {
  const devices: Device[] = [
    { kind: 'overhang', depth: 0.6, above: 0.1, extendRight: Infinity },
    { kind: 'verticalLouvers', count: 2, chord: 0.2, pitch: 0.4, gap: 0.1, start: 0.2 },
  ];
  const meta = { source: 'SOL-AR teste', siteName: 'Florianópolis (SC)', orientation: 30 };

  it('números com até 9 casas, sem -0, e nomes sem os caracteres que quebram o IDF', () => {
    expect(num(-1e-12)).toBe('0');
    expect(num(0.1 + 0.2)).toBe('0.3');
    expect(num(2 / 3)).toBe('0.666666667');
    expect(invalidName('Janela, sala')).toBe(true);
    expect(invalidName('Janela; x')).toBe(true);
    expect(invalidName('')).toBe(true);
    expect(invalidName('Janela Sala 1 (sul)')).toBe(false);
    expect(ascii('Florianópolis a 30° π')).toBe('Florianopolis a 30 graus ?');
  });

  it('objetos para o modelo: cabeçalho, nomes e um objeto por bloco', () => {
    const text = objectsIdf({
      window: WIN,
      devices,
      names: { window: 'Janela Sul', wall: 'Parede Sul' },
      frame: frameFromAzimuth(30),
      pasted: false,
      meta,
    });
    expect(text).toMatch(/^! SOL-AR: protecao solar/);
    expect(text).toContain('! Local: Florianopolis (SC).');
    expect(text).toContain('! Peca 1 (brise horizontal): Shading:Overhang:Projection.');
    expect(text).toContain('! Peca 2 (laminas verticais): Shading:Building:Detailed.');
    expect(text).toContain('prolongamento infinito exportado com 12 m');
    expect(text).toMatch(
      /Shading:Overhang:Projection,\n {2}Janela Sul Brise 1, +!- Name\n {2}Janela Sul, +!- Window or Door Name/,
    );
    expect(text).toContain('Janela Sul Laminas verticais 2 placa 2');
    // Sem acentos e sem caracteres de controle no arquivo inteiro.
    expect([...text].every((c) => c === '\n' || (c >= ' ' && c <= '~'))).toBe(true);
  });

  it('modelo para conferir: local, regras de geometria, janela e saída', () => {
    const text = modelIdf({
      window: WIN,
      devices,
      names: { window: 'JANELA', wall: 'PAREDE' },
      site: {
        name: 'Florianópolis',
        latitude: -27.67,
        longitude: -48.547,
        timeZone: -3,
        elevation: 6.1,
      },
      meta,
    });
    expect(text).toContain('Version,\n  26.2;');
    expect(text).toMatch(/Site:Location,\n {2}Florianopolis, +!- Name\n {2}-27\.67,/);
    expect(text).toContain('UpperLeftCorner,');
    expect(text.match(/^BuildingSurface:Detailed,/gm)).toHaveLength(6);
    expect(text).toMatch(/FenestrationSurface:Detailed,\n {2}JANELA,/);
    expect(text).toMatch(
      /Output:Variable,\n {2}JANELA, +!- Key Value\n {2}Surface Outside Face Sunlit Fraction,/,
    );
  });
});

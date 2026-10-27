import { describe, expect, it } from 'vitest';
import type { Vec3 } from '../shading/geometry';
import {
  azimuthOf,
  frameFromAzimuth,
  parseFenestration,
  placementFromVertices,
  toWorld,
  WindowPasteError,
} from './frame';

const close = (a: readonly number[], b: readonly number[], tol = 1e-9) =>
  a.forEach((v, i) => expect(Math.abs(v - b[i]!)).toBeLessThanOrEqual(tol));

describe('referencial da fachada no mundo (spec 13, seção 13.1)', () => {
  it('fachada norte: x para o Leste; oeste: x para o Norte', () => {
    close(frameFromAzimuth(0).ex, [1, 0, 0]);
    close(frameFromAzimuth(0).ey, [0, 1, 0]);
    close(frameFromAzimuth(270).ex, [0, 1, 0]);
    close(frameFromAzimuth(270).ey, [-1, 0, 0]);
    close(toWorld(frameFromAzimuth(90, [1, 2, 3]), [1, 0.5, 2]), [1.5, 1, 5]);
    expect(azimuthOf(frameFromAzimuth(225))).toBeCloseTo(225, 9);
  });
});

describe('janela colada (spec 13, seção 13.3)', () => {
  // Janela de 1,2 × 1,0 m numa fachada a 225°, canto (x = 0, z = 0) em (12,5; −3,25; 4).
  const truth = frameFromAzimuth(225, [12.5, -3.25, 4]);
  const corner = (x: number, z: number) => toWorld(truth, [x, 0, z]);
  // Anti-horário visto de fora, a partir do canto superior esquerdo (visto de fora: x = W).
  const ccw: Vec3[] = [corner(1.2, 1), corner(1.2, 0), corner(0, 0), corner(0, 1)];

  it.each([0, 1, 2, 3])('anti-horário, começando no vértice %i', (start) => {
    const vs = [...ccw.slice(start), ...ccw.slice(0, start)];
    const p = placementFromVertices(vs);
    close(p.frame.origin, truth.origin);
    close(p.frame.ex, truth.ex);
    close(p.frame.ey, truth.ey);
    expect(p.width).toBeCloseTo(1.2, 9);
    expect(p.height).toBeCloseTo(1, 9);
  });

  it.each([0, 1, 2, 3])('horário (GlobalGeometryRules Clockwise), começando em %i', (start) => {
    const cw = [...ccw].reverse();
    const vs = [...cw.slice(start), ...cw.slice(0, start)];
    const p = placementFromVertices(vs, true);
    close(p.frame.origin, truth.origin);
    close(p.frame.ey, truth.ey);
    // Lida como anti-horária, a mesma janela fica de costas: normal para dentro.
    close(
      placementFromVertices(vs).frame.ey,
      truth.ey.map((v) => -v),
    );
  });

  it('lê o objeto colado do IDF, com comentários e quebras de linha', () => {
    const text = `
  FenestrationSurface:Detailed,
    Sala Janela 1,           !- Name
    Window,                  !- Surface Type
    Vidro duplo,             !- Construction Name
    Parede Sul,              !- Building Surface Name
    ,                        !- Outside Boundary Condition Object
    autocalculate,           !- View Factor to Ground
    ,                        !- Frame and Divider Name
    1,                       !- Multiplier
    4,                       !- Number of Vertices
    ${ccw.map((v) => v.join(', ')).join(',\n    ')};  !- X,Y,Z Vertex 4 {m}`;
    const w = parseFenestration(text);
    expect(w.name).toBe('Sala Janela 1');
    expect(w.baseSurface).toBe('Parede Sul');
    close(w.vertices.flat(), ccw.flat());
  });

  it('recusa o que não é uma janela retangular e vertical', () => {
    const code = (fn: () => unknown) => {
      try {
        fn();
      } catch (e) {
        return (e as WindowPasteError).code;
      }
      return null;
    };
    expect(code(() => parseFenestration('BuildingSurface:Detailed, P, Wall;'))).toBe(
      'notFenestration',
    );
    expect(code(() => parseFenestration('FenestrationSurface:Detailed, J, Window;'))).toBe(
      'fieldCount',
    );
    expect(
      code(() =>
        parseFenestration(
          'FenestrationSurface:Detailed, J, Window, V, P, , , , 1, 3, 0,0,0, 1,0,0, 1,0,1;',
        ),
      ),
    ).toBe('notFourVertices');
    expect(code(() => placementFromVertices([...ccw.slice(0, 3), [12.5, -3.25, 5.3]]))).toBe(
      'notRectangle',
    );
    // Um vértice 20 cm fora do plano.
    const bent = ccw.map((v, i): Vec3 =>
      i === 0 ? [v[0] + 0.2 * truth.ey[0], v[1] + 0.2 * truth.ey[1], v[2]] : v,
    );
    expect(['notPlanar', 'notVertical']).toContain(code(() => placementFromVertices(bent)));
    // Torcida: dois cantos opostos para fora, a normal média continua horizontal.
    const twisted = ccw.map((v, i): Vec3 =>
      i % 2 === 0 ? [v[0] + 0.01 * truth.ey[0], v[1] + 0.01 * truth.ey[1], v[2]] : v,
    );
    expect(code(() => placementFromVertices(twisted))).toBe('notPlanar');
    const roof: Vec3[] = [
      [0, 1, 3],
      [0, 0, 3],
      [1, 0, 3],
      [1, 1, 3],
    ];
    expect(code(() => placementFromVertices(roof))).toBe('notVertical');
  });
});

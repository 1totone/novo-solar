/**
 * Arquivos IDF da exportação para o EnergyPlus 26.2 (F5.2): objetos para o modelo do usuário e
 * modelo completo para conferir. Especificação: docs/spec/13-exportacao-energyplus.md, seções
 * 13.2 a 13.4. Validação: tests/referencia/energyplusExportacao.test.ts, com os arquivos rodados
 * no EnergyPlus por docs/validacao/scripts/energyplus_exportacao.py.
 */
import type { Device, Vec3, WindowGeometry } from '../shading/geometry';
import { frameFromAzimuth, toWorld, type FacadeFrame } from './frame';
import { planExport, type ExportItem, type ExportPlan } from './plan';

export const ENERGYPLUS_VERSION = '26.2';

/** Margem da parede em volta da janela e fundo da zona no modelo para conferir (como no F3.8). */
const WALL_MARGIN = 1;
const ZONE_DEPTH = 4;
const STEPS_PER_HOUR = 6;
const YEAR = 2026;

export interface ExportNames {
  window: string;
  wall: string;
}

export interface ExportMeta {
  /** Versão da aplicação e data, para o cabeçalho. */
  source: string;
  /** Local (nome) e orientação da fachada do passo 2. */
  siteName: string;
  orientation: number;
  /** Link da configuração. */
  link?: string;
}

export interface ModelSite {
  name: string;
  latitude: number;
  longitude: number;
  timeZone: number;
  elevation: number;
}

/** Caracteres que quebram um campo do IDF. */
export function invalidName(name: string): boolean {
  return name.trim() === '' || /[,;!\r\n]/.test(name) || name.length > 90;
}

/** Texto sem acentos, para comentários e nomes gerados (o IDF não declara a codificação). */
export function ascii(text: string): string {
  return text
    .replace(/×/g, 'x')
    .replace(/°/g, ' graus')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?');
}

/** Número com até 9 casas, sem zeros à direita e sem "-0". */
export function num(x: number): string {
  if (Math.abs(x) < 5e-10) return '0';
  return String(Number(x.toFixed(9)));
}

interface Field {
  value: string;
  label: string;
}

/** Um objeto como o IDF Editor escreve: um campo por linha, com o nome do campo em comentário. */
function object(type: string, fields: Field[]): string {
  const lines = [`${type},`];
  fields.forEach((f, i) => {
    const text = `  ${f.value}${i === fields.length - 1 ? ';' : ','}`;
    lines.push(`${text.padEnd(30)}!- ${f.label}`);
  });
  return lines.join('\n');
}

const f = (value: string | number, label: string): Field => ({
  value: typeof value === 'number' ? num(value) : value,
  label,
});

function vertexFields(vertices: readonly Vec3[]): Field[] {
  return vertices.map((v, i) => ({
    value: `${num(v[0])}, ${num(v[1])}, ${num(v[2])}`,
    label: `X,Y,Z Vertex ${i + 1} {m}`,
  }));
}

function itemIdf(item: ExportItem, names: ExportNames, frame: FacadeFrame): string {
  switch (item.type) {
    case 'Shading:Overhang:Projection':
      return object(item.type, [
        f(item.name, 'Name'),
        f(names.window, 'Window or Door Name'),
        f(item.height, 'Height above Window or Door {m}'),
        f(90, 'Tilt Angle from Window/Door {deg}'),
        f(item.leftExtension, 'Left extension from Window/Door Width {m}'),
        f(item.rightExtension, 'Right extension from Window/Door Width {m}'),
        f(item.depthFraction, 'Depth as Fraction of Window/Door Height {dimensionless}'),
      ]);
    case 'Shading:Fin:Projection': {
      const side = (s: 'Left' | 'Right', v: typeof item.left) => [
        f(v.extension, `${s} Extension from Window/Door {m}`),
        f(v.above, `${s} Distance Above Top of Window {m}`),
        f(v.below, `${s} Distance Below Bottom of Window {m}`),
        f(90, `${s} Tilt Angle from Window/Door {deg}`),
        f(v.depthFraction, `${s} Depth as Fraction of Window/Door Width {dimensionless}`),
      ];
      return object(item.type, [
        f(item.name, 'Name'),
        f(names.window, 'Window or Door Name'),
        ...side('Left', item.left),
        ...side('Right', item.right),
      ]);
    }
    case 'Shading:Zone:Detailed':
      return object(item.type, [
        f(item.name, 'Name'),
        f(names.wall, 'Base Surface Name'),
        f('', 'Transmittance Schedule Name'),
        f(item.plate.length, 'Number of Vertices'),
        ...vertexFields(item.plate.map((v) => toWorld(frame, v))),
      ]);
    case 'Shading:Building:Detailed':
      return object(item.type, [
        f(item.name, 'Name'),
        f('', 'Transmittance Schedule Name'),
        f(item.plate.length, 'Number of Vertices'),
        ...vertexFields(item.plate.map((v) => toWorld(frame, v))),
      ]);
  }
}

const PIECE_LABEL: Record<Device['kind'], string> = {
  overhang: 'brise horizontal',
  fin: 'aleta',
  horizontalLouvers: 'laminas horizontais',
  verticalLouvers: 'laminas verticais',
  plate: 'placa livre',
};

/** Comentários do início: origem, janela, peças e hipóteses (spec 13, seção 13.3). */
function header(
  title: string,
  window: WindowGeometry,
  devices: readonly Device[],
  plan: ExportPlan,
  meta: ExportMeta,
  extra: string[],
): string {
  const lines = [
    title,
    `Gerado por ${meta.source}, para o EnergyPlus ${ENERGYPLUS_VERSION}.`,
    `Local: ${meta.siteName}. Fachada: normal externa a ${num(meta.orientation)} graus do Norte.`,
    `Janela (vidro): ${num(window.width)} x ${num(window.height)} m` +
      ((window.setback ?? 0) > 0 ? `, recuada ${num(window.setback!)} m da fachada.` : '.'),
    ...devices.map((dev, i) => {
      const objs = plan.items.filter((it) => it.pieces.includes(i));
      const types = [...new Set(objs.map((o) => o.type))].join(', ');
      return `Peca ${i + 1} (${PIECE_LABEL[dev.kind]}): ${types}.`;
    }),
    ...((window.setback ?? 0) > 0
      ? [
          'Recuo do vidro: verga, peitoril e ombreiras como Shading:Zone:Detailed; a parede fica no plano do vidro.',
        ]
      : []),
    ...plan.capped.map(
      (c) =>
        `Peca ${c.piece + 1}: prolongamento infinito exportado com ${num(c.length)} m (20 vezes a distancia da peca ao vidro); a sombra na janela e a mesma enquanto o sol estiver a mais de 2,9 graus do plano da fachada.`,
    ),
    'Esquerda e direita dos objetos por projecao: vistas de fora, como no EnergyPlus.',
    ...extra,
    ...(meta.link ? [`Configuracao: ${meta.link}`] : []),
  ];
  return lines.map((l) => `! ${ascii(l)}`).join('\n');
}

/** Objetos para colar no modelo do usuário (spec 13, seção 13.3). */
export function objectsIdf(opts: {
  window: WindowGeometry;
  devices: readonly Device[];
  names: ExportNames;
  frame: FacadeFrame;
  /** A posição da janela veio do objeto colado (true) ou é a do modelo para conferir (false). */
  pasted: boolean;
  meta: ExportMeta;
  warnings?: string[];
}): string {
  const plan = planExport(opts.window, opts.devices, opts.names.window);
  const detailed = plan.items.some(
    (it) => it.type === 'Shading:Zone:Detailed' || it.type === 'Shading:Building:Detailed',
  );
  const extra = [
    `Janela: ${opts.names.window}; parede: ${opts.names.wall}.`,
    ...(detailed
      ? [
          opts.pasted
            ? 'Vertices no referencial da janela colada. Com GlobalGeometryRules Relative, os Shading:Building:Detailed precisam do deslocamento da origem da zona.'
            : 'Vertices com o canto inferior esquerdo da janela (visto de dentro) na origem e a fachada na orientacao acima; cole a sua janela na aplicacao para usar a posicao dela.',
        ]
      : []),
    ...(opts.warnings ?? []),
  ];
  const head = header(
    'SOL-AR: protecao solar da janela, objetos para o seu modelo do EnergyPlus.',
    opts.window,
    opts.devices,
    plan,
    opts.meta,
    extra,
  );
  const body = plan.items.map((it) => itemIdf(it, opts.names, opts.frame));
  return [head, '', ...body.flatMap((b) => [b, ''])].join('\n');
}

/**
 * Retângulo a partir do canto superior esquerdo, no sentido anti-horário visto de fora (lado da
 * normal n), com u o "para cima" do retângulo (como no arranjo do F3.8).
 */
function rectangle(c: Vec3, u: Vec3, n: Vec3, width: number, height: number): Vec3[] {
  const r: Vec3 = [u[1] * n[2] - u[2] * n[1], u[2] * n[0] - u[0] * n[2], u[0] * n[1] - u[1] * n[0]];
  const p = (a: number, b: number): Vec3 => [
    c[0] + r[0] * a + u[0] * b,
    c[1] + r[1] * a + u[1] * b,
    c[2] + r[2] * a + u[2] * b,
  ];
  const w = width / 2;
  const h = height / 2;
  return [p(-w, h), p(-w, -h), p(w, -h), p(w, h)];
}

/** Modelo completo e mínimo, que roda sozinho com o EPW do local (spec 13, seção 13.4). */
export function modelIdf(opts: {
  window: WindowGeometry;
  devices: readonly Device[];
  names: ExportNames;
  site: ModelSite;
  meta: ExportMeta;
}): string {
  const { window, names, site } = opts;
  const W = window.width;
  const H = window.height;
  const frame = frameFromAzimuth(opts.meta.orientation);
  const plan = planExport(window, opts.devices, names.window);
  const m = WALL_MARGIN;
  const L = ZONE_DEPTH;
  const cx = W / 2;
  const cz = H / 2;
  const up: Vec3 = [0, 0, 1];
  const out: Vec3 = [0, 1, 0];
  const surfaces: [string, string, string, Vec3[]][] = [
    [names.wall, 'Wall', 'Outdoors', rectangle([cx, 0, cz], up, out, W + 2 * m, H + 2 * m)],
    ['FUNDO', 'Wall', 'Outdoors', rectangle([cx, -L, cz], up, [0, -1, 0], W + 2 * m, H + 2 * m)],
    [
      'LATERAL_DIREITA',
      'Wall',
      'Outdoors',
      rectangle([W + m, -L / 2, cz], up, [1, 0, 0], L, H + 2 * m),
    ],
    [
      'LATERAL_ESQUERDA',
      'Wall',
      'Outdoors',
      rectangle([-m, -L / 2, cz], up, [-1, 0, 0], L, H + 2 * m),
    ],
    ['COBERTURA', 'Roof', 'Outdoors', rectangle([cx, -L / 2, H + m], out, up, W + 2 * m, L)],
    ['PISO', 'Floor', 'Adiabatic', rectangle([cx, -L / 2, -m], out, [0, 0, -1], W + 2 * m, L)],
  ];
  const world = (vs: Vec3[]) => vs.map((v) => toWorld(frame, v));
  const head = header(
    'SOL-AR: modelo minimo para conferir a fracao ensolarada da janela no EnergyPlus.',
    window,
    opts.devices,
    plan,
    opts.meta,
    [
      'Rode com o EPW do local; a saida Surface Outside Face Sunlit Fraction da janela sai a cada passo de tempo.',
      'Zona em caixa atras da fachada, com materiais sem massa: o modelo serve so para a sombra.',
    ],
  );
  const blocks = [
    object('Version', [f(ENERGYPLUS_VERSION, 'Version Identifier')]),
    object('SimulationControl', [
      f('No', 'Do Zone Sizing Calculation'),
      f('No', 'Do System Sizing Calculation'),
      f('No', 'Do Plant Sizing Calculation'),
      f('No', 'Run Simulation for Sizing Periods'),
      f('Yes', 'Run Simulation for Weather File Run Periods'),
      f('No', 'Do HVAC Sizing Simulation for Sizing Periods'),
      f(1, 'Maximum Number of HVAC Sizing Simulation Passes'),
    ]),
    object('Building', [
      f('SOL-AR conferencia', 'Name'),
      f(0, 'North Axis {deg}'),
      f('Suburbs', 'Terrain'),
      f(0.04, 'Loads Convergence Tolerance Value {W}'),
      f(0.4, 'Temperature Convergence Tolerance Value {deltaC}'),
      f('FullExterior', 'Solar Distribution'),
      f(25, 'Maximum Number of Warmup Days'),
      f(6, 'Minimum Number of Warmup Days'),
    ]),
    object('ShadowCalculation', [
      f('PolygonClipping', 'Shading Calculation Method'),
      f('Timestep', 'Shading Calculation Update Frequency Method'),
      f(1, 'Shading Calculation Update Frequency'),
      f(15000, 'Maximum Figures in Shadow Overlap Calculations'),
      f('SutherlandHodgman', 'Polygon Clipping Algorithm'),
      f(512, 'Pixel Counting Resolution'),
      f('SimpleSkyDiffuseModeling', 'Sky Diffuse Modeling Algorithm'),
      f('No', 'Output External Shading Calculation Results'),
      f('No', 'Disable Self-Shading Within Shading Zone Groups'),
      f('No', 'Disable Self-Shading From Shading Zone Groups to Other Zones'),
    ]),
    object('Timestep', [f(STEPS_PER_HOUR, 'Number of Timesteps per Hour')]),
    object('RunPeriod', [
      f('Ano', 'Name'),
      f(1, 'Begin Month'),
      f(1, 'Begin Day of Month'),
      f(YEAR, 'Begin Year'),
      f(12, 'End Month'),
      f(31, 'End Day of Month'),
      f(YEAR, 'End Year'),
      f('', 'Day of Week for Start Day'),
      f('No', 'Use Weather File Holidays and Special Days'),
      f('No', 'Use Weather File Daylight Saving Period'),
      f('No', 'Apply Weekend Holiday Rule'),
      f('No', 'Use Weather File Rain Indicators'),
      f('No', 'Use Weather File Snow Indicators'),
      f('No', 'Treat Weather as Actual'),
      f('Hour24', 'First Hour Interpolation Starting Values'),
    ]),
    object('Site:Location', [
      f(ascii(site.name).replace(/[,;!]/g, ' '), 'Name'),
      f(site.latitude, 'Latitude {deg}'),
      f(site.longitude, 'Longitude {deg}'),
      f(site.timeZone, 'Time Zone {hr}'),
      f(site.elevation, 'Elevation {m}'),
    ]),
    object('GlobalGeometryRules', [
      f('UpperLeftCorner', 'Starting Vertex Position'),
      f('Counterclockwise', 'Vertex Entry Direction'),
      f('World', 'Coordinate System'),
    ]),
    object('Material:NoMass', [
      f('PAREDE', 'Name'),
      f('MediumRough', 'Roughness'),
      f(1, 'Thermal Resistance {m2-K/W}'),
      f(0.9, 'Thermal Absorptance'),
      f(0.7, 'Solar Absorptance'),
      f(0.7, 'Visible Absorptance'),
    ]),
    object('Construction', [f('PAREDE', 'Name'), f('PAREDE', 'Outside Layer')]),
    object('WindowMaterial:SimpleGlazingSystem', [
      f('VIDRO', 'Name'),
      f(5.8, 'U-Factor {W/m2-K}'),
      f(0.8, 'Solar Heat Gain Coefficient'),
      f(0.85, 'Visible Transmittance'),
    ]),
    object('Construction', [f('VIDRO', 'Name'), f('VIDRO', 'Outside Layer')]),
    object('Zone', [f('SALA', 'Name')]),
    ...surfaces.map(([name, type, boundary, vs]) =>
      object('BuildingSurface:Detailed', [
        f(name, 'Name'),
        f(type, 'Surface Type'),
        f('PAREDE', 'Construction Name'),
        f('SALA', 'Zone Name'),
        f('', 'Space Name'),
        f(boundary, 'Outside Boundary Condition'),
        f('', 'Outside Boundary Condition Object'),
        f(boundary === 'Outdoors' ? 'SunExposed' : 'NoSun', 'Sun Exposure'),
        f(boundary === 'Outdoors' ? 'WindExposed' : 'NoWind', 'Wind Exposure'),
        f('autocalculate', 'View Factor to Ground'),
        f(4, 'Number of Vertices'),
        ...vertexFields(world(vs)),
      ]),
    ),
    object('FenestrationSurface:Detailed', [
      f(names.window, 'Name'),
      f('Window', 'Surface Type'),
      f('VIDRO', 'Construction Name'),
      f(names.wall, 'Building Surface Name'),
      f('', 'Outside Boundary Condition Object'),
      f('autocalculate', 'View Factor to Ground'),
      f('', 'Frame and Divider Name'),
      f(1, 'Multiplier'),
      f(4, 'Number of Vertices'),
      ...vertexFields(world(rectangle([cx, 0, cz], up, out, W, H))),
    ]),
    ...plan.items.map((it) => itemIdf(it, names, frame)),
    object('Output:Variable', [
      f(names.window, 'Key Value'),
      f('Surface Outside Face Sunlit Fraction', 'Variable Name'),
      f('Timestep', 'Reporting Frequency'),
    ]),
  ];
  return [head, '', ...blocks.flatMap((b) => [b, ''])].join('\n');
}

/**
 * Dimensionamento pelo período (F3.6): o cálculo que roda no worker (sizing.worker.ts) ou, sem ele,
 * na linha principal. As amostras do período (a cada 5 min, em hora solar por padrão) levam de
 * 0,4 a 1 s num computador.
 */
import type { Site } from '../../core/chart/sunChart';
import type { HorizontalLouvers, VerticalLouvers } from '../../core/shading/geometry';
import {
  periodOutline,
  periodSamples,
  requiredAngles,
  sizeFins,
  sizeOverhang,
  subdivideFins,
  subdivideOverhang,
  type OverhangResult,
  type RequiredAngles,
  type ShadingPeriod,
  type SizedFins,
  type SkyPosition,
  type WindowSize,
} from '../../core/shading/inverse';

export interface SizingInput {
  site: Site;
  orientation: number;
  period: ShadingPeriod;
  window: WindowSize;
  /** Afastamento do brise (m); com ele, a altura acima da verga sai do α2. */
  gap: number;
  /** Número de lâminas da subdivisão (1: a peça inteira). */
  count: number;
}

export interface SizingResult {
  /** Amostras do período e as com sol na janela. */
  total: number;
  sunny: number;
  angles: RequiredAngles;
  overhang: OverhangResult;
  fins: SizedFins;
  /** Brise subdividido em lâminas (só sem afastamento). */
  louvers: HorizontalLouvers | null;
  /** Aletas subdivididas em lâminas verticais. */
  finLouvers: VerticalLouvers | null;
  outline: SkyPosition[];
}

export function sizingKey(input: SizingInput): string {
  const { latitude, longitude, elevation, timeZone } = input.site;
  return JSON.stringify([
    [latitude, longitude, elevation, timeZone],
    input.orientation,
    input.period,
    input.window,
    input.gap,
    input.count,
  ]);
}

export function computeSizing(input: SizingInput): SizingResult {
  const { latitude, longitude, elevation, timeZone } = input.site;
  const site = { latitude, longitude, elevation, timeZone };
  const { samples, total } = periodSamples(site, input.orientation, input.period);
  const angles = requiredAngles(samples);
  const overhang = sizeOverhang(input.window, angles, { gap: input.gap });
  const fins = sizeFins(input.window, angles);
  const louvers =
    overhang.ok && input.gap === 0 && input.count > 1
      ? subdivideOverhang(input.window, overhang.device, input.count)
      : null;
  const finLouvers =
    (fins.right || fins.left) && input.count > 1
      ? subdivideFins(input.window, fins, input.count)
      : null;
  return {
    total,
    sunny: samples.length,
    angles,
    overhang,
    fins,
    louvers,
    finLouvers,
    outline: periodOutline(site, input.period),
  };
}

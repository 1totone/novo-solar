import type { Site } from '../../core/chart/sunChart';
import { compareRegions, type MaskComparison } from '../../core/mask/compare';
import { maskRegions, type SkyPolygon } from '../../core/mask/mask';
import { sunSamples, type SunSamples } from '../../core/shading/hourly';
import { answerRegion, EXERCISES, type ExerciseId } from './exercises';

/** Conferência do exercício (spec 12, seção 12.3): o desenho do aluno contra a resposta. */
export interface ExerciseInput {
  id: ExerciseId;
  /** Local do exercício, para as posições do sol. */
  site: Site;
  /** Polígonos da sombra total desenhados pelo aluno (dt). */
  drawn: SkyPolygon[];
}

export type ExerciseResult = MaskComparison;

export const exerciseKey = (input: ExerciseInput) => JSON.stringify(input);

// Posições do sol do ano a cada 30 min, guardadas por local (cerca de 0,5 s para calcular).
const sunCache = new Map<string, SunSamples>();

function sunOf(site: Site): SunSamples {
  const key = JSON.stringify([site.latitude, site.longitude, site.elevation, site.timeZone]);
  let sun = sunCache.get(key);
  if (!sun) {
    sun = sunSamples(site, { samplesPerHour: 2 });
    sunCache.set(key, sun);
  }
  return sun;
}

export function computeExercise(input: ExerciseInput): ExerciseResult {
  const e = EXERCISES[input.id];
  const student = maskRegions(
    e.orientation,
    e.reference,
    {},
    {},
    {
      total: input.drawn,
      partial: [],
    },
  ).total;
  return compareRegions(student, answerRegion(input.id), e.orientation, sunOf(input.site));
}

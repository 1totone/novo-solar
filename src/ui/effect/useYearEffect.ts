import { useMemo } from 'react';
import { classifyHours } from '../../core/comfort/classification';
import type { EpwData } from '../../core/epw/parseEpw';
import { hourlyBeam, sunnyClassShares } from '../../core/shading/indicators';
import { useAnnualShading } from '../annual/annualClient';
import { methodKey, type ClassificationState } from '../state/classificationHash';
import type { GeometryState } from '../state/geometryHash';

/** Janela usada sem a do passo 6: só a exposição e a incidência sem proteção importam. */
const UNIT_WINDOW = { width: 1, height: 1 };

/**
 * Cálculos do passo 7 (F3.4): classes das horas do arquivo, fração ensolarada do ano na fachada
 * (worker, com a proteção do passo 6 quando há janela), radiação direta incidente e a parte de cada
 * classe nas horas com sol na janela. Só com o passo aberto e os dados horários.
 */
export function useYearEffect(
  epw: EpwData | null,
  geometry: GeometryState,
  orientation: number,
  classification: ClassificationState,
  active: boolean,
) {
  const win = geometry.window;
  const annual = useAnnualShading(
    active && epw
      ? {
          site: {
            latitude: epw.location.latitude,
            longitude: epw.location.longitude,
            elevation: epw.location.elevation,
            timeZone: epw.location.timeZone,
          },
          window: win ?? UNIT_WINDOW,
          devices: win ? geometry.devices : [],
          orientation,
        }
      : null,
  );
  const hourly = annual.result;
  const key = methodKey(classification);
  const classes = useMemo(
    () =>
      epw && classification.method
        ? classifyHours(epw.fields.dryBulb, classification.method, classification.mode)
        : null,
    // A chave representa o método e a temperatura da hora.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [epw, key],
  );
  const beam = useMemo(
    () => (epw && hourly ? hourlyBeam(hourly, epw, epw.fields.directNormal) : null),
    [epw, hourly],
  );
  const shares = useMemo(
    () =>
      epw && hourly && beam && classes
        ? sunnyClassShares(classes.classes, hourly, epw, beam.incident)
        : null,
    [epw, hourly, beam, classes],
  );
  return { annual, hourly, classes, beam, shares };
}

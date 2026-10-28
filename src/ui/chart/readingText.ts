import type { DirectionReading } from '../../core/chart/readout';
import { useI18n } from '../i18n/useI18n';
import type { HourLinesMode } from '../state/chartOptionsHash';

/**
 * Textos da leitura de um ponto da carta (decisão 0045), os mesmos na caixa ao lado do ponto e na
 * tabela dos pontos marcados (decisão 0051): altura e azimute a 1°, com o rumo de 16 pontos, e
 * quando o sol passa ali (hora solar e datas; hora legal com os analemas na carta).
 */
export function useReadingText(hourLines: HourLinesMode) {
  const { t, formatNumber, formatClock, formatDayMonth, locale } = useI18n();
  const points = t('compass.points').split(',');
  const clock = (hours: number) => {
    const m = Math.round(hours * 60) % (24 * 60);
    return formatClock(Math.floor(m / 60), m % 60);
  };
  const list = (items: string[]) =>
    new Intl.ListFormat(locale, { type: 'conjunction' }).format(items);
  const dates = (r: DirectionReading) =>
    r.passages.map((p) => formatDayMonth(p.date.day, p.date.month));

  return {
    /** Altura e azimute inteiros e o rumo, como números (o rumo a partir do azimute exato). */
    angles: (altitude: number, azimuth: number) => ({
      altitude: formatNumber(Math.round(altitude)),
      azimuth: formatNumber(Math.round(azimuth) % 360),
      compass: points[Math.round(azimuth / 22.5) % 16]!,
    }),
    /** Quando o sol passa ali; `short` para a tabela dos pontos. */
    sun: (r: DirectionReading, short = false) => {
      const d = dates(r);
      if (r.passages.length === 0) return t(short ? 'points.never' : 'readout.never');
      if (r.solsticeEdge) {
        return t(short ? 'points.sunEdge' : 'readout.sunEdge', {
          time: clock(r.solarHour),
          date: d[0]!,
        });
      }
      return t(short ? 'points.sun' : 'readout.sun', {
        time: clock(r.solarHour),
        dates: list([...new Set(d)]),
      });
    },
    /** Hora legal de cada passagem, só com os analemas na carta (a hora solar é a mesma). */
    legal: (r: DirectionReading) => {
      if (hourLines === 'solar' || r.passages.length === 0) return null;
      const d = dates(r);
      return t('readout.legal', {
        times: list(
          r.passages.map((p, i) => t('readout.legalAt', { time: clock(p.legalHour), date: d[i]! })),
        ),
      });
    },
  };
}

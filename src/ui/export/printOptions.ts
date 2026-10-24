/** Opções da impressão em escala (passo 5). */
export interface PrintOptions {
  radiusCm: number;
  protractor: boolean;
  mask: boolean;
  data: boolean;
  legend: boolean;
  protractorOnly: boolean;
}

export const DEFAULT_PRINT: PrintOptions = {
  radiusCm: 6,
  protractor: true,
  mask: true,
  data: true,
  legend: true,
  protractorOnly: false,
};

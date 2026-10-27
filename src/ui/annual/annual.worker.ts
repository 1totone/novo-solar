/**
 * Fração ensolarada hora a hora do ano (F3.3) fora da linha principal: 52 560 posições do sol por
 * local (guardadas) e a sombra de cada uma para a geometria.
 */
import { serveWorker } from '../workers/workerQueue';
import { annualShading } from './annualCompute';

serveWorker(annualShading);

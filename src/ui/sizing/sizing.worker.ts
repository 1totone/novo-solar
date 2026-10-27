/** Dimensionamento pelo período (F3.6) fora da linha principal: milhares de posições do sol. */
import { serveWorker } from '../workers/workerQueue';
import { computeSizing } from './sizingCompute';

serveWorker(computeSizing);

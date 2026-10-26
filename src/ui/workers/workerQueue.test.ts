import { afterEach, describe, expect, it, vi } from 'vitest';
import { workerQueue, type WorkerRequest } from './workerQueue';

/** Worker de mentira: guarda as mensagens e deixa o teste responder ou falhar. */
class FakeWorker {
  static last: FakeWorker | null = null;
  posted: WorkerRequest<number>[] = [];
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.last = this;
  }
  postMessage(m: WorkerRequest<number>) {
    this.posted.push(m);
  }
  terminate() {
    this.terminated = true;
  }
  reply(id: number, result: number | null) {
    this.onmessage?.({ data: { id, result } } as MessageEvent);
  }
}

const square = (n: number) => {
  if (n < 0) throw new RangeError('negativo');
  return n * n;
};

function makeQueue() {
  return workerQueue<number, number>({
    key: (n) => String(n),
    create: () => new FakeWorker() as unknown as Worker,
    compute: square,
    maxEntries: 2,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.last = null;
});

describe('fila de cálculos no worker', () => {
  it('sem worker, calcula na linha principal; falha devolve null e não entra no cache', async () => {
    const q = makeQueue();
    expect(await q.request(3).promise).toBe(9);
    expect(q.peek('3')).toBe(9);
    expect(await q.request(-1).promise).toBeNull();
    expect(q.peek('-1')).toBeNull();
  });

  it('um pedido por vez; o pedido sem quem espere sai da fila antes de começar', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const q = makeQueue();
    const a = q.request(2);
    const w = FakeWorker.last!;
    expect(w.posted.map((m) => m.input)).toEqual([2]);
    const b1 = q.request(5);
    const b2 = q.request(5);
    expect(w.posted).toHaveLength(1);
    b1.cancel();
    b2.cancel();
    const c = q.request(7);
    w.reply(w.posted[0]!.id, 4);
    expect(await a.promise).toBe(4);
    // O 5 saiu da fila: o próximo enviado é o 7.
    expect(w.posted.map((m) => m.input)).toEqual([2, 7]);
    w.reply(w.posted[1]!.id, 49);
    expect(await c.promise).toBe(49);
    expect(q.peek('7')).toBe(49);
    // Já no cache: não vai ao worker.
    expect(await q.request(7).promise).toBe(49);
    expect(w.posted).toHaveLength(2);
  });

  it('cache limitado: o mais antigo sai primeiro', async () => {
    const q = makeQueue();
    await q.request(1).promise;
    await q.request(2).promise;
    await q.request(1).promise;
    await q.request(3).promise;
    expect(q.peek('1')).toBe(1);
    expect(q.peek('2')).toBeNull();
    expect(q.peek('3')).toBe(9);
  });

  it('worker que quebra: os pedidos pendentes são calculados na linha principal', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const q = makeQueue();
    const a = q.request(3);
    const b = q.request(4);
    const w = FakeWorker.last!;
    w.onerror?.(new Event('error'));
    expect(w.terminated).toBe(true);
    expect(await a.promise).toBe(9);
    expect(await b.promise).toBe(16);
    // Os próximos também, sem worker.
    expect(await q.request(5).promise).toBe(25);
  });
});

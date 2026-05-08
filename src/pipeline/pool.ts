import * as Comlink from 'comlink';
import type { PipelineApi, ProgressCallback } from '../workers/pipeline.worker';
import type { ProcessTaskInput, ProcessTaskOutput } from '../types';

interface PooledWorker {
  worker: Worker;
  proxy: Comlink.Remote<PipelineApi>;
  busy: boolean;
}

interface QueuedTask {
  input: ProcessTaskInput;
  onProgress: ProgressCallback;
  resolve: (out: ProcessTaskOutput) => void;
  reject: (err: unknown) => void;
}

function computePoolSize(): number {
  const cores = (navigator.hardwareConcurrency ?? 2);
  const memGb = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const memCap = Math.max(1, Math.floor(memGb / 0.5));
  return Math.min(cores, 4, memCap);
}

export class WorkerPool {
  private workers: PooledWorker[] = [];
  private queue: QueuedTask[] = [];

  constructor(size = computePoolSize()) {
    for (let i = 0; i < size; i++) {
      const worker = new Worker(new URL('../workers/pipeline.worker.ts', import.meta.url), {
        type: 'module',
        name: `pipeline-${i}`,
      });
      const proxy = Comlink.wrap<PipelineApi>(worker);
      this.workers.push({ worker, proxy, busy: false });
    }
  }

  get size(): number {
    return this.workers.length;
  }

  run(input: ProcessTaskInput, onProgress: ProgressCallback): Promise<ProcessTaskOutput> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, onProgress, resolve, reject });
      this.tick();
    });
  }

  private tick(): void {
    if (this.queue.length === 0) return;
    const idle = this.workers.find((w) => !w.busy);
    if (!idle) return;
    const task = this.queue.shift()!;
    idle.busy = true;
    const transferable = [task.input.buffer];
    idle.proxy
      .process(Comlink.transfer(task.input, transferable), Comlink.proxy(task.onProgress))
      .then((out) => task.resolve(out))
      .catch((err) => task.reject(err))
      .finally(() => {
        idle.busy = false;
        this.tick();
      });
  }

  destroy(): void {
    for (const w of this.workers) {
      w.proxy[Comlink.releaseProxy]();
      w.worker.terminate();
    }
    this.workers = [];
    this.queue = [];
  }
}

let singleton: WorkerPool | null = null;

export function getPool(): WorkerPool {
  if (!singleton) singleton = new WorkerPool();
  return singleton;
}

type PendingRequest<T> = {
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

export type WorkerEnvelope<TPayload> = {
  id: string;
  type: string;
  payload: TPayload;
};

export type WorkerSuccess<TResult> = {
  id: string;
  ok: true;
  result: TResult;
};

export type WorkerFailure = {
  id: string;
  ok: false;
  error: string;
};

export function createWorkerClient<TRequest, TResult>(workerFactory: () => Worker) {
  let worker: Worker | null = null;
  const pending = new Map<string, PendingRequest<TResult>>();

  function getWorker() {
    worker ??= workerFactory();
    worker.onmessage = (event: MessageEvent<WorkerSuccess<TResult> | WorkerFailure>) => {
      const response = event.data;
      const request = pending.get(response.id);

      if (!request) return;
      pending.delete(response.id);

      if (response.ok) {
        request.resolve(response.result);
      } else {
        request.reject(new Error(response.error));
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message);
      for (const request of pending.values()) request.reject(error);
      pending.clear();
    };

    return worker;
  }

  function run(type: string, payload: TRequest, transfer: Transferable[] = []) {
    const id = crypto.randomUUID();
    const activeWorker = getWorker();

    return new Promise<TResult>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      activeWorker.postMessage({ id, type, payload } satisfies WorkerEnvelope<TRequest>, transfer);
    });
  }

  function terminate() {
    worker?.terminate();
    worker = null;
    pending.clear();
  }

  return { run, terminate };
}

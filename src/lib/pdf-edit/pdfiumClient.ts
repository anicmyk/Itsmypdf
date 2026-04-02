import PdfEditWorker from '../../workers/pdfEditWorker.ts?worker';
import type {
  EngineApplyEditsResult,
  EngineEditRequest,
  EngineLoadResult,
  EnginePageTextResult,
  EngineTextRun
} from './types';

type WorkerRequest =
  | { id: number; type: 'init'; wasmUrl?: string }
  | { id: number; type: 'load'; data: ArrayBuffer }
  | { id: number; type: 'getPageTextRuns'; docId: string; pageIndex: number }
  | { id: number; type: 'applyEdits'; docId: string; edits: EngineEditRequest[] }
  | { id: number; type: 'close'; docId: string };

type WorkerRequestPayload =
  | { type: 'init'; wasmUrl?: string }
  | { type: 'load'; data: ArrayBuffer }
  | { type: 'getPageTextRuns'; docId: string; pageIndex: number }
  | { type: 'applyEdits'; docId: string; edits: EngineEditRequest[] }
  | { type: 'close'; docId: string };

type WorkerStatusStage =
  | 'worker-script-loaded'
  | 'init-started'
  | 'wasm-fetch-started'
  | 'wasm-fetch-succeeded'
  | 'pdfium-init-started'
  | 'pdfium-init-succeeded';

type WorkerStatusMessage = {
  kind: 'status';
  stage: WorkerStatusStage;
  detail?: string;
  workerUrl?: string;
  wasmUrl?: string;
  statusCode?: number;
  requestId?: number;
};

type WorkerSuccessResponse = {
  kind: 'response';
  id: number;
  ok: true;
  result: EngineLoadResult | EnginePageTextResult | EngineApplyEditsResult | { ok: true };
};

type WorkerFailureResponse = {
  kind: 'response';
  id: number;
  ok: false;
  error: string;
  errorCode?:
    | 'worker_init_failed'
    | 'wasm_fetch_failed'
    | 'pdfium_init_failed'
    | 'load_failed'
    | 'text_extraction_failed'
    | 'apply_edits_failed'
    | 'close_failed';
  errorStage?: string;
};

type WorkerResponse = WorkerStatusMessage | WorkerSuccessResponse | WorkerFailureResponse;

const DEFAULT_WASM_URL = '/pdfium.wasm';

export class PdfiumEditEngineClient {
  private worker: Worker;
  private requestId = 0;
  private pending = new Map<number, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
  private ready: Promise<void>;
  private initTimeoutMs = 8000;
  private workerSource = 'vite-worker-entry';
  private lastStatus: WorkerStatusMessage | null = null;
  private sawHandshake = false;

  constructor(workerUrl?: URL) {
    const resolvedWorkerUrl = workerUrl?.toString();
    console.info('[edit-pdf][client] Creating PDFium worker', {
      workerSource: resolvedWorkerUrl ?? this.workerSource,
      mode: workerUrl ? 'custom-url' : 'vite-worker-constructor'
    });

    this.worker = workerUrl
      ? new Worker(workerUrl, { type: 'module', name: 'pdf-edit-worker' })
      : new PdfEditWorker();

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      if (message.kind === 'status') {
        this.lastStatus = message;
        if (message.stage === 'worker-script-loaded') {
          this.sawHandshake = true;
        }
        console.info('[edit-pdf][client] Worker status', message);
        return;
      }

      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);

      if (message.ok) {
        console.info('[edit-pdf][client] Worker response succeeded', { id: message.id });
        entry.resolve(message.result);
      } else {
        const error = this.buildWorkerError(message);
        console.error('[edit-pdf][client] Worker response failed', {
          id: message.id,
          error: message.error,
          errorCode: message.errorCode,
          errorStage: message.errorStage
        });
        entry.reject(error);
      }
    };

    this.worker.onerror = (event) => {
      const details = {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        lastStatus: this.lastStatus,
        sawHandshake: this.sawHandshake
      };
      console.error('[edit-pdf][client] Worker onerror fired', details);
      this.rejectAll(this.buildLoadError(event));
    };

    this.worker.onmessageerror = (event) => {
      console.error('[edit-pdf][client] Worker onmessageerror fired', {
        data: event.data,
        lastStatus: this.lastStatus
      });
      this.rejectAll(new Error('PDF edit worker sent an unreadable message.'));
    };

    this.ready = this.call({ type: 'init', wasmUrl: DEFAULT_WASM_URL }, [], this.initTimeoutMs);
  }

  async loadDocument(data: ArrayBuffer, timeoutMs = 10000): Promise<EngineLoadResult> {
    await this.ready;
    console.info('[edit-pdf][client] Sending loadDocument request', { byteLength: data.byteLength });
    return this.call<EngineLoadResult>({ type: 'load', data }, [data], timeoutMs);
  }

  async getPageTextRuns(docId: string, pageIndex: number): Promise<EngineTextRun[]> {
    await this.ready;
    const result = await this.call<EnginePageTextResult>({ type: 'getPageTextRuns', docId, pageIndex });
    return result.runs;
  }

  async applyEdits(docId: string, edits: EngineEditRequest[]): Promise<ArrayBuffer> {
    await this.ready;
    const result = await this.call<EngineApplyEditsResult>({ type: 'applyEdits', docId, edits });
    return result.bytes;
  }

  async closeDocument(docId: string): Promise<void> {
    await this.ready;
    await this.call({ type: 'close', docId });
  }

  terminate() {
    this.rejectAll(new Error('PDF edit worker terminated.'));
    this.worker.terminate();
  }

  private call<T = any>(
    payload: WorkerRequestPayload,
    transfer: Transferable[] = [],
    timeoutMs = 15000
  ): Promise<T> {
    const id = this.requestId++;
    const message = { ...payload, id } as WorkerRequest;
    console.info('[edit-pdf][client] Posting worker message', {
      id,
      type: payload.type,
      timeoutMs,
      lastStatus: this.lastStatus?.stage ?? null
    });

    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(message, transfer);

      if (timeoutMs > 0) {
        const timeout = setTimeout(() => {
          if (!this.pending.has(id)) return;
          this.pending.delete(id);
          const stage = this.lastStatus?.stage;
          const stageDetail = stage ? ` Last worker stage: ${stage}.` : '';
          reject(new Error(`PDF edit worker timed out (${payload.type}).${stageDetail}`));
        }, timeoutMs);

        this.pending.set(id, {
          resolve: (value) => {
            clearTimeout(timeout);
            resolve(value);
          },
          reject: (reason) => {
            clearTimeout(timeout);
            reject(reason);
          }
        });
      }
    });
  }

  private rejectAll(err: Error) {
    this.pending.forEach((entry) => entry.reject(err));
    this.pending.clear();
  }

  private buildWorkerError(message: WorkerFailureResponse) {
    const stagePrefix = message.errorStage ? `${message.errorStage}: ` : '';
    const codePrefix = message.errorCode ? `[${message.errorCode}] ` : '';
    return new Error(`${codePrefix}${stagePrefix}${message.error}`);
  }

  private buildLoadError(event: ErrorEvent) {
    const message = event.message?.trim();

    if (!this.sawHandshake) {
      return new Error(`Worker script failed to load${message ? `: ${message}` : ''}`);
    }

    if (this.lastStatus?.stage === 'wasm-fetch-started') {
      return new Error(`PDFium WASM fetch failed${message ? `: ${message}` : ''}`);
    }

    if (this.lastStatus?.stage === 'pdfium-init-started') {
      return new Error(`PDFium failed to initialize${message ? `: ${message}` : ''}`);
    }

    return new Error(`PDF edit worker failed during startup${message ? `: ${message}` : ''}`);
  }
}

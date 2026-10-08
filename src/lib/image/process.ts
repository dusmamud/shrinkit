/**
 * Main-thread API for image processing.
 *
 * Spawns a single dedicated Web Worker (see processor.worker.ts) and routes
 * requests through it. If Workers are unavailable the pipeline runs inline
 * on the main thread via the same engine — identical output, just without
 * the off-thread benefit.
 */
import {
  processImageBytes,
  ProcessError,
  type ProcessedImage,
  type ProcessSettings,
} from "./engine";

export type { ProcessedImage, ProcessSettings };
export { ProcessError };

interface Pending {
  resolve: (r: ProcessedImage) => void;
  reject: (e: Error) => void;
}

interface WorkerOk {
  id: number;
  ok: true;
  result: Omit<ProcessedImage, "data"> & { data: ArrayBuffer };
}

interface WorkerFail {
  id: number;
  ok: false;
  code: string;
  message: string;
}

export class ImageProcessor {
  private worker: Worker | null = null;
  private workerOk = typeof Worker !== "undefined";
  private nextId = 1;
  private pending = new Map<number, Pending>();

  private ensureWorker(): Worker | null {
    if (!this.workerOk) return null;
    if (!this.worker) {
      try {
        this.worker = new Worker(new URL("./processor.worker.ts", import.meta.url), {
          type: "module",
        });
        this.worker.onmessage = (ev: MessageEvent<WorkerOk | WorkerFail>) => {
          const msg = ev.data;
          const entry = this.pending.get(msg.id);
          if (!entry) return;
          this.pending.delete(msg.id);
          if (msg.ok) {
            entry.resolve({ ...msg.result, data: new Uint8Array(msg.result.data) });
          } else {
            entry.reject(new ProcessError(msg.code as never, msg.message));
          }
        };
        this.worker.onerror = (ev: ErrorEvent) => {
          const err = new ProcessError(
            "encode-failed",
            `Background processing failed: ${ev.message || "worker error"}.`,
          );
          for (const [, entry] of this.pending) entry.reject(err);
          this.pending.clear();
        };
      } catch {
        this.workerOk = false;
        return null;
      }
    }
    return this.worker;
  }

  /** Process one file with the given settings. Never rejects with a raw value. */
  async process(
    file: File,
    settings: ProcessSettings,
    signal?: AbortSignal,
  ): Promise<ProcessedImage> {
    if (signal?.aborted) {
      throw new ProcessError("aborted", "Processing was cancelled.");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const worker = this.ensureWorker();
    if (!worker) {
      // Fallback: identical pipeline, main thread.
      return processImageBytes(bytes, file.name, settings, signal);
    }
    const id = this.nextId++;
    return new Promise<ProcessedImage>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      const onAbort = () => {
        this.pending.delete(id);
        reject(new ProcessError("aborted", "Processing was cancelled."));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      const buffer = bytes.buffer as ArrayBuffer;
      worker.postMessage({ id, fileName: file.name, data: buffer, settings }, [buffer]);
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

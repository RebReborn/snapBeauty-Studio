/**
 * SnapBeauty Studio — Local AI Face Detection Engine
 *
 * Architecture:
 *   Browser (React)
 *       │
 *       ▼
 *   ONNX Runtime Web  ◄── model cached in IndexedDB (never re-downloaded)
 *       │
 *       ▼
 *   WebGPU → WebGL → WASM   (auto-selects best backend on user's machine)
 *       │
 *       ▼
 *   GPU / CPU  (user's computer — no data leaves the device)
 *
 * Model: Ultra-Light Face Detector (RFB-320) — ONNX Model Zoo
 *   • Input : float32[1, 3, 240, 320]  (pixel − 127) / 128
 *   • scores: float32[1, 4420, 2]      background / face probability
 *   • boxes : float32[1, 4420, 4]      x1 y1 x2 y2  (0–1 normalised)
 */

import * as ort from 'onnxruntime-web';

// ── WASM runtime (just the engine binary, not user data — cached by browser) ──
ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0/dist/';
ort.env.wasm.numThreads = 1; // single-thread → no SharedArrayBuffer requirement

// Face-detection model from the official ONNX Model Zoo
const MODEL_URL =
  'https://github.com/onnx/models/raw/main/validated/vision/body_analysis/ultraface/models/version-RFB-320.onnx';

const DB_NAME  = 'snapbeauty-ai-cache-v1';
const DB_STORE = 'models';
const MODEL_W  = 320;
const MODEL_H  = 240;

// ─── Public types ──────────────────────────────────────────────────────────────
export interface FaceDetection {
  /** Top-left X  (0–1 normalised to video frame) */
  x: number;
  /** Top-left Y  (0–1 normalised to video frame) */
  y: number;
  width:  number; // 0–1
  height: number; // 0–1
  score:  number; // 0–1 confidence
}

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

// ─── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

async function dbGet(key: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB();
    return new Promise((res) => {
      const q = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key);
      q.onsuccess = () => res(q.result ?? null);
      q.onerror   = () => res(null);
    });
  } catch { return null; }
}

async function dbPut(key: string, val: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(val, key);
      tx.oncomplete = () => res();
      tx.onerror    = () => rej(tx.error);
    });
  } catch (e) { console.warn('[ModelCache] save failed:', e); }
}

// ─── Non-Maximum Suppression ───────────────────────────────────────────────────
function iouOf(a: number[], b: number[]): number {
  const ix1 = Math.max(a[0], b[0]), iy1 = Math.max(a[1], b[1]);
  const ix2 = Math.min(a[2], b[2]), iy2 = Math.min(a[3], b[3]);
  const inter = Math.max(0, ix2 - ix1) * Math.max(0, iy2 - iy1);
  const union  = (a[2]-a[0])*(a[3]-a[1]) + (b[2]-b[0])*(b[3]-b[1]) - inter;
  return union > 0 ? inter / union : 0;
}

function nms(
  dets: Array<{ box: number[]; score: number }>,
  iouThresh = 0.35,
  maxKeep   = 5
) {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const dead = new Set<number>();
  const keep: typeof sorted = [];
  for (let i = 0; i < sorted.length; i++) {
    if (dead.has(i)) continue;
    keep.push(sorted[i]);
    if (keep.length >= maxKeep) break;
    for (let j = i + 1; j < sorted.length; j++) {
      if (!dead.has(j) && iouOf(sorted[i].box, sorted[j].box) > iouThresh) {
        dead.add(j);
      }
    }
  }
  return keep;
}

// ─── Engine ────────────────────────────────────────────────────────────────────
class FaceDetectionEngine {
  private session:    ort.InferenceSession | null              = null;
  private offscreen:  OffscreenCanvas | null                   = null;
  private ctx2d:      OffscreenCanvasRenderingContext2D | null = null;

  // Observable state (read by Visualizer via refs)
  status:       EngineStatus = 'idle';
  activeBackend = '';
  loadProgress  = 0;   // 0–1
  loadLabel     = '';
  errorMessage  = '';

  // ── Init ──────────────────────────────────────────────────────────────────────
  async init(onProgress?: (pct: number, label: string) => void): Promise<void> {
    this.status = 'loading';

    const progress = (p: number, l: string) => {
      this.loadProgress = p;
      this.loadLabel    = l;
      onProgress?.(p, l);
    };

    try {
      // ── 1. Obtain model bytes (IndexedDB cache-first) ────────────────────────
      progress(0.02, 'Checking local model cache…');
      let buffer = await dbGet(MODEL_URL);

      if (!buffer) {
        progress(0.05, 'Downloading AI model (≈1.2 MB)…');
        const resp = await fetch(MODEL_URL);
        if (!resp.ok) throw new Error(`Model fetch failed: HTTP ${resp.status}`);

        const total  = Number(resp.headers.get('Content-Length') ?? 0);
        const reader = resp.body!.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value!);
          received += value!.length;
          if (total > 0) {
            progress(
              0.05 + (received / total) * 0.45,
              `Downloading… ${(received / 1024).toFixed(0)} KB / ${(total / 1024).toFixed(0)} KB`
            );
          }
        }

        // Merge chunks → flat buffer
        const flat = new Uint8Array(received);
        let offset = 0;
        for (const c of chunks) { flat.set(c, offset); offset += c.length; }
        buffer = flat.buffer;

        progress(0.52, 'Saving model to IndexedDB…');
        await dbPut(MODEL_URL, buffer);
        progress(0.55, 'Model cached locally ✓  (won\'t download again)');
      } else {
        progress(0.55, 'Loaded from local cache ✓');
      }

      // ── 2. Create ONNX session — try backends best → worst ─────────────────
      const backends: Array<{ ep: string[]; label: string }> = [
        { ep: ['webgpu'],                 label: 'WebGPU' },
        { ep: ['webgl'],                  label: 'WebGL'  },
        { ep: ['wasm'],                   label: 'CPU / WASM' },
      ];

      for (const { ep, label } of backends) {
        progress(0.58, `Initialising ${label} backend…`);
        try {
          this.session = await ort.InferenceSession.create(buffer, {
            executionProviders: ep as ort.InferenceSession.ExecutionProviderConfig[],
            graphOptimizationLevel: 'all',
            enableCpuMemArena: true,
          });
          this.activeBackend = label;
          break;
        } catch (e) {
          console.warn(`[ONNX] ${label} EP failed, trying next:`, e);
        }
      }

      if (!this.session) throw new Error('All ONNX execution providers failed');

      // ── 3. Allocate offscreen canvas for preprocessing ──────────────────────
      this.offscreen = new OffscreenCanvas(MODEL_W, MODEL_H);
      this.ctx2d = this.offscreen.getContext('2d', {
        willReadFrequently: true,
      }) as OffscreenCanvasRenderingContext2D;

      // ── 4. Warm-up run (JIT compile shaders, etc.) ──────────────────────────
      progress(0.85, `Warming up ${this.activeBackend}…`);
      const dummy = new ort.Tensor(
        'float32',
        new Float32Array(3 * MODEL_W * MODEL_H),
        [1, 3, MODEL_H, MODEL_W]
      );
      await this.session.run({ [this.session.inputNames[0]]: dummy });

      progress(1.0, `Ready · ${this.activeBackend} ✓`);
      this.status = 'ready';

    } catch (e: unknown) {
      this.status       = 'error';
      this.errorMessage = String((e as Error)?.message ?? e);
      console.error('[FaceEngine] init failed:', e);
      throw e;
    }
  }

  // ── Detect ────────────────────────────────────────────────────────────────────
  async detect(
    video:          HTMLVideoElement,
    scoreThreshold  = 0.65
  ): Promise<FaceDetection[]> {
    if (!this.session || this.status !== 'ready' || !this.ctx2d) return [];

    // ── Preprocess: scale frame → 320×240 CHW float32 ──────────────────────────
    this.ctx2d.drawImage(video, 0, 0, MODEL_W, MODEL_H);
    const { data } = this.ctx2d.getImageData(0, 0, MODEL_W, MODEL_H);
    const np  = MODEL_W * MODEL_H;
    const f32 = new Float32Array(3 * np);
    for (let i = 0; i < np; i++) {
      f32[i]        = (data[i * 4]     - 127) / 128; // R
      f32[np  + i]  = (data[i * 4 + 1] - 127) / 128; // G
      f32[2*np + i] = (data[i * 4 + 2] - 127) / 128; // B
    }

    const inputName = this.session.inputNames[0];
    const feeds = {
      [inputName]: new ort.Tensor('float32', f32, [1, 3, MODEL_H, MODEL_W]),
    };

    const out = await this.session.run(feeds);

    // ── Identify outputs: scores has last-dim=2, boxes has last-dim=4 ────────
    const tensors = this.session.outputNames.map(n => out[n]);
    let scoresTensor: ort.Tensor, boxesTensor: ort.Tensor;
    if (tensors[0].dims[tensors[0].dims.length - 1] === 2) {
      [scoresTensor, boxesTensor] = tensors;
    } else {
      [boxesTensor, scoresTensor] = tensors;
    }

    const sc = scoresTensor.data as Float32Array; // [N, 2]
    const bx = boxesTensor.data  as Float32Array; // [N, 4]
    const n  = sc.length / 2;

    // ── Filter by score then NMS ─────────────────────────────────────────────
    const candidates: Array<{ box: number[]; score: number }> = [];
    for (let i = 0; i < n; i++) {
      const faceProb = sc[i * 2 + 1];
      if (faceProb >= scoreThreshold) {
        candidates.push({
          box:   [bx[i*4], bx[i*4+1], bx[i*4+2], bx[i*4+3]],
          score: faceProb,
        });
      }
    }
    if (!candidates.length) return [];

    return nms(candidates).map(({ box, score }) => ({
      x:      box[0],
      y:      box[1],
      width:  box[2] - box[0],
      height: box[3] - box[1],
      score,
    }));
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────────
  dispose(): void {
    this.session?.release();
    this.session  = null;
    this.offscreen = null;
    this.ctx2d    = null;
    this.status   = 'idle';
  }
}

// Singleton — shared across hot-reloads
export const faceEngine = new FaceDetectionEngine();

// FaceMeshEngine.ts — Main thread manager for the Web Worker AI pipeline.
import { FilesetResolver, FaceLandmarker, ImageSegmenter } from '@mediapipe/tasks-vision';

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

export interface FaceMeshResult {
  landmarks: Array<{ x: number; y: number; z: number }> | null;
  faceBox: BoundingBox | null;
  segmentationMask: Uint8ClampedArray | null;
  maskWidth: number;
  maskHeight: number;
}

class FaceMeshEngine {
  private landmarker: FaceLandmarker | null = null;
  private segmenter: ImageSegmenter | null = null;
  
  private onProgressCallback: ((pct: number, label: string) => void) | null = null;

  // Observable state
  status: EngineStatus = 'idle';
  activeBackend = 'Main Thread (WASM/GPU)';
  loadProgress = 0;
  loadLabel = '';
  errorMessage = '';
  isBusy = false;

  // Tracking state variables
  private lastLandmarks: any = null;
  private lastFaceBox: any = null;
  private lastMaskData: Uint8ClampedArray | null = null;
  private lastMaskSize = { w: 0, h: 0 };

  async init(onProgress?: (pct: number, label: string) => void): Promise<void> {
    if (this.status === 'ready') return;
    this.status = 'loading';
    this.onProgressCallback = onProgress || null;

    try {
      this.updateProgress(0.1, 'Resolving MediaPipe WASM…');
      
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );

      this.updateProgress(0.4, 'Loading Face Landmarker model…');
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      this.updateProgress(0.7, 'Loading Selfie Segmentation model…');
      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });

      this.status = 'ready';
      this.updateProgress(1.0, 'Ready · MediaPipe Face Mesh & Segmenter');

    } catch (error: any) {
      this.status = 'error';
      this.errorMessage = error.message || String(error);
      console.error('[FaceMeshEngine] Initialization failed:', error);
      throw error;
    }
  }

  private updateProgress(pct: number, label: string) {
    this.loadProgress = pct;
    this.loadLabel = label;
    if (this.onProgressCallback) {
      this.onProgressCallback(pct, label);
    }
  }

  private lastMpTimestamp = -1;

  async processFrame(video: HTMLVideoElement | HTMLCanvasElement | OffscreenCanvas, timestamp: number): Promise<FaceMeshResult | null> {
    if (this.status !== 'ready' || !this.landmarker) return null;
    if (this.isBusy) return null;

    this.isBusy = true;

    try {
      // Ensure strictly monotonically increasing timestamps for MediaPipe graph to prevent Packet timestamp mismatch errors.
      let mpTimestamp = Math.max(0, Math.round(timestamp));
      if (mpTimestamp <= this.lastMpTimestamp) {
        mpTimestamp = this.lastMpTimestamp + 30; // nominal 30ms step to simulate a ~33fps frame progression
      }
      this.lastMpTimestamp = mpTimestamp;

      const result = this.landmarker.detectForVideo(video, mpTimestamp);
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        this.lastLandmarks = result.faceLandmarks[0];
        const mesh = this.lastLandmarks;
        let minX = 1, minY = 1, maxX = 0, maxY = 0;
        for (let i = 0; i < mesh.length; i++) {
          if (mesh[i].x < minX) minX = mesh[i].x;
          if (mesh[i].y < minY) minY = mesh[i].y;
          if (mesh[i].x > maxX) maxX = mesh[i].x;
          if (mesh[i].y > maxY) maxY = mesh[i].y;
        }
        this.lastFaceBox = { x: minX, y: minY, width: maxX - minX, height: maxY - minY, score: 1.0 };
      } else {
        this.lastLandmarks = null;
        this.lastFaceBox = null;
      }

      if (this.segmenter && this.lastLandmarks) {
        const segResult = this.segmenter.segmentForVideo(video, mpTimestamp);
        if (segResult && segResult.categoryMask) {
          const mask = segResult.categoryMask;
          this.lastMaskSize.w = mask.width;
          this.lastMaskSize.h = mask.height;
          const rawMask = mask.getAsUint8Array();
          // We must copy the mask buffer because MediaPipe reuses it!
          this.lastMaskData = new Uint8ClampedArray(rawMask.length);
          for (let i = 0; i < rawMask.length; i++) {
            this.lastMaskData[i] = rawMask[i];
          }
          mask.close();
        }
      } else {
        this.lastMaskData = null;
      }

      this.isBusy = false;
      return {
        landmarks: this.lastLandmarks,
        faceBox: this.lastFaceBox,
        segmentationMask: this.lastMaskData,
        maskWidth: this.lastMaskSize.w,
        maskHeight: this.lastMaskSize.h
      };

    } catch (e: any) {
      console.warn('[FaceMeshEngine] processing error:', e);
      this.isBusy = false;
      return null;
    }
  }

  dispose(): void {
    if (this.landmarker) {
      this.landmarker.close();
      this.landmarker = null;
    }
    if (this.segmenter) {
      this.segmenter.close();
      this.segmenter = null;
    }
    this.status = 'idle';
    this.isBusy = false;
    this.lastMpTimestamp = -1;
  }
}

export const faceMeshEngine = new FaceMeshEngine();

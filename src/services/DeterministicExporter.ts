import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { BeautyEngine, BeautyValues } from './BeautyEngine';
import { faceMeshEngine } from './FaceMeshEngine';

export interface ExportOptions {
  videoElement: HTMLVideoElement;
  beautyValues: BeautyValues;
  resolution: string; // e.g., '1080p', '4K'
  fps?: number;
  onProgress: (progress: number) => void;
  onComplete: (downloadUrl: string, fileName: string) => void;
  onError: (err: any) => void;
  projectName?: string;
}

export class DeterministicExporter {
  private static getDimensions(resolution: string): { width: number; height: number } {
    switch (resolution) {
      case '4K': return { width: 3840, height: 2160 };
      case '1440p': return { width: 2560, height: 1440 };
      case '1080p': return { width: 1920, height: 1080 };
      case '720p': 
      default: return { width: 1280, height: 720 };
    }
  }

  static async exportVideo(options: ExportOptions): Promise<void> {
    const { videoElement, beautyValues, resolution, fps = 30, onProgress, onComplete, onError, projectName = 'Processed_Video' } = options;

    try {
      const { width, height } = this.getDimensions(resolution);
      const totalFrames = Math.floor((videoElement.duration || 0) * fps);

      if (totalFrames <= 0) {
        throw new Error('Video duration is invalid or 0.');
      }

      // Create an OffscreenCanvas (or a hidden standard canvas if OffscreenCanvas is unavailable)
      let shaderCanvas: HTMLCanvasElement | OffscreenCanvas;
      let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

      if (typeof OffscreenCanvas !== 'undefined') {
        shaderCanvas = new OffscreenCanvas(width, height);
        ctx = shaderCanvas.getContext('2d');
      } else {
        shaderCanvas = document.createElement('canvas');
        shaderCanvas.width = width;
        shaderCanvas.height = height;
        ctx = shaderCanvas.getContext('2d');
      }

      if (!ctx) {
        throw new Error('Failed to get 2D context for exporter canvas.');
      }

      // Initialize MP4 Muxer
      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: width,
          height: height
        },
        fastStart: 'in-memory'
      });

      // Initialize VideoEncoder
      const encoder = new VideoEncoder({
        output: (chunk, metadata) => muxer.addVideoChunk(chunk, metadata),
        error: (e) => {
          console.error("Encoding error:", e);
          onError(e);
        }
      });

      let bitrate = 8_000_000;
      if (resolution === '1080p') bitrate = 15_000_000;
      if (resolution === '1440p') bitrate = 30_000_000;
      if (resolution === '4K') bitrate = 60_000_000;

      encoder.configure({
        codec: 'avc1.640034', // High profile for better quality
        width: width,
        height: height,
        bitrate: bitrate,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware'
      });

      const frameDurationInMicroseconds = 1_000_000 / fps;

      // Secure seek method avoiding race condition drops
      const seekToFrame = (video: HTMLVideoElement, time: number) => {
        return new Promise<void>((resolve) => {
          if (video.currentTime === time) {
            resolve();
            return;
          }
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve();
          };
          video.addEventListener('seeked', onSeeked);
          video.currentTime = time;
        });
      };

      // Loop deterministically
      for (let i = 0; i < totalFrames; i++) {
        // Explicitly force sizes if using an internal element to prevent mismatching frame boundaries
        if (shaderCanvas instanceof HTMLCanvasElement) {
          shaderCanvas.width = width;
          shaderCanvas.height = height;
        }

        // Seek to frame safely
        await seekToFrame(videoElement, i / fps);

        // Run AI processing
        const aiResult = await faceMeshEngine.processFrame(videoElement, performance.now());

        // Clear canvas and draw video with Global Color Grading applied
        ctx.clearRect(0, 0, width, height);
        BeautyEngine.drawVideoWithGlobalColorGrading(ctx as CanvasRenderingContext2D, videoElement, width, height, beautyValues);

        if (aiResult) {
          // Note: BeautyEngine.apply expects a standard CanvasRenderingContext2D.
          // Since OffscreenCanvasRenderingContext2D is mostly compatible, we cast it.
          BeautyEngine.apply(
            ctx as CanvasRenderingContext2D,
            videoElement,
            width,
            height,
            aiResult.landmarks,
            aiResult.segmentationMask,
            aiResult.maskWidth,
            aiResult.maskHeight,
            beautyValues
          );
        }

        // Create WebCodecs VideoFrame
        const timestamp = i * frameDurationInMicroseconds;
        const frame = new VideoFrame(shaderCanvas as CanvasImageSource, { timestamp, alpha: 'discard' });

        // Encode frame
        const insertKeyframe = (i % (fps * 2) === 0);
        encoder.encode(frame, { keyFrame: insertKeyframe });
        frame.close();

        // Fix backpressure: If the encoder queue is backing up, pause the loop to let the GPU breathe
        if (encoder.encodeQueueSize > 4) {
          await new Promise((resolve) => setTimeout(resolve, 15)); // Yield thread control momentarily
        }

        // Update progress
        onProgress((i / totalFrames) * 100);
      }

      // Flush and finalize
      await encoder.flush();
      muxer.finalize();

      const { buffer } = muxer.target as ArrayBufferTarget;
      const mp4Blob = new Blob([buffer], { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(mp4Blob);

      onComplete(downloadUrl, `${projectName.replace(/\s+/g, '_')}_G7X.mp4`);

    } catch (err) {
      console.error('Export Error:', err);
      onError(err);
    }
  }
}

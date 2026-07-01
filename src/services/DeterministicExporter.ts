import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { WebDemuxer } from 'web-demuxer';
import { BeautyEngine } from './BeautyEngine';
import { BeautyValues } from '../context/AppContext';
import { LucidEngine } from './LucidEngine';
import { faceMeshEngine } from './FaceMeshEngine';

export interface ExportOptions {
  videoElement: HTMLVideoElement;
  beautyValues: BeautyValues;
  resolution: string; // e.g., '1080p', '4K'
  fps?: number;
  sourceStart?: number;
  sourceEnd?: number;
  onProgress: (progress: number) => void;
  onComplete: (downloadUrl: string, fileName: string) => void;
  onError: (err: any) => void;
  projectName?: string;
  sourceFile?: File;
}

class CanvasPool {
  private pool: (HTMLCanvasElement | OffscreenCanvas)[] = [];
  constructor(private width: number, private height: number) {}

  acquire(): HTMLCanvasElement | OffscreenCanvas {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(this.width, this.height);
    } else {
      const c = document.createElement('canvas');
      c.width = this.width;
      c.height = this.height;
      return c;
    }
  }

  release(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.pool.push(canvas);
  }

  clear() {
    this.pool = [];
  }
}

interface DecodedFrameItem {
  canvas: HTMLCanvasElement | OffscreenCanvas;
  timestamp: number; // in seconds
  duration: number; // in seconds
}

export class DeterministicExporter {
  private static getDimensions(resolution: string, isVertical: boolean): { width: number; height: number } {
    let w = 1280;
    let h = 720;
    switch (resolution) {
      case '4K': w = 3840; h = 2160; break;
      case '1440p': w = 2560; h = 1440; break;
      case '1080p': w = 1920; h = 1080; break;
      case '720p': 
      default: w = 1280; h = 720; break;
    }
    return isVertical ? { width: h, height: w } : { width: w, height: h };
  }

  static async exportVideo(options: ExportOptions): Promise<void> {
    const { 
      videoElement, 
      beautyValues, 
      resolution, 
      fps = 30, 
      sourceStart = 0, 
      sourceEnd, 
      onProgress, 
      onComplete, 
      onError, 
      projectName = 'Processed_Video',
      sourceFile
    } = options;

    let demuxer: WebDemuxer | null = null;
    let canvasPool: CanvasPool | null = null;

    try {
      const isVertical = videoElement.videoHeight > videoElement.videoWidth;
      const { width, height } = this.getDimensions(resolution, isVertical);
      
      const startSec = sourceStart;
      const endSec = sourceEnd ?? videoElement.duration;
      const duration = endSec - startSec;
      const totalFrames = Math.floor(duration * fps);

      if (totalFrames <= 0) {
        throw new Error('Video duration is invalid or 0.');
      }

      // Create an OffscreenCanvas for final rendering & encoding
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

      // Initialize CanvasPool
      canvasPool = new CanvasPool(width, height);

      // Initialize demuxer
      const wasmUrl = new URL('/wasm/web-demuxer.wasm', window.location.origin).href;
      demuxer = new WebDemuxer({
        wasmFilePath: wasmUrl
      });
      let source: File | string = sourceFile || videoElement.src;
      if (typeof source === 'string' && source.startsWith('blob:')) {
        try {
          const response = await fetch(source);
          const blob = await response.blob();
          source = new File([blob], 'input.mp4', { type: blob.type || 'video/mp4' });
        } catch (e) {
          console.warn("Failed to fetch blob URL on main thread, falling back to URL string:", e);
        }
      }
      await demuxer.load(source);

      const videoDecoderConfig = await demuxer.getDecoderConfig('video');

      // Fetch and decode audio via AudioContext for robust synchronization
      let audioBuffer: AudioBuffer | null = null;
      try {
        const response = await fetch(videoElement.src);
        const arrayBuffer = await response.arrayBuffer();
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass({ sampleRate: 44100 });
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } catch (e) {
        console.warn("Could not decode audio, exporting silent video:", e);
      }

      // Initialize MP4 Muxer
      const muxerOptions: any = {
        target: new ArrayBufferTarget(),
        video: {
          codec: 'avc',
          width: width,
          height: height
        },
        fastStart: 'in-memory'
      };

      if (audioBuffer) {
        muxerOptions.audio = {
          codec: 'aac',
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate
        };
      }

      const muxer = new Muxer(muxerOptions);

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
        codec: 'avc1.640034', // High profile
        width: width,
        height: height,
        bitrate: bitrate,
        bitrateMode: 'constant',
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware',
        latencyMode: 'quality'
      });

      // Configure Audio Encoder if supported
      let audioEncoder: AudioEncoder | null = null;
      if (audioBuffer && (window as any).AudioEncoder) {
        audioEncoder = new (window as any).AudioEncoder({
          output: (chunk: any, metadata: any) => muxer.addAudioChunk(chunk, metadata),
          error: (e: any) => console.error("Audio Encoding error:", e)
        });
        audioEncoder!.configure({
          codec: 'mp4a.40.2',
          numberOfChannels: audioBuffer.numberOfChannels,
          sampleRate: audioBuffer.sampleRate,
          bitrate: 128000
        });

        // Encode audio upfront
        const sampleRate = audioBuffer.sampleRate;
        const startSample = Math.floor(startSec * sampleRate);
        const endSample = Math.floor(endSec * sampleRate);
        const numSamples = endSample - startSample;
        const chunkSize = 1024;
        
        for (let i = 0; i < numSamples; i += chunkSize) {
          const currentChunkSize = Math.min(chunkSize, numSamples - i);
          const planarData = new Float32Array(currentChunkSize * audioBuffer.numberOfChannels);
          for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
            const channelData = audioBuffer.getChannelData(c);
            planarData.set(channelData.subarray(startSample + i, startSample + i + currentChunkSize), c * currentChunkSize);
          }
          
          const audioData = new (window as any).AudioData({
            format: 'f32-planar',
            sampleRate: sampleRate,
            numberOfFrames: currentChunkSize,
            numberOfChannels: audioBuffer.numberOfChannels,
            timestamp: (i / sampleRate) * 1_000_000,
            data: planarData
          });
          
          audioEncoder!.encode(audioData);
          audioData.close();
        }
      }

      // WebCodecs Decoded Frames sliding window state
      const decodedFramesQueue: DecodedFrameItem[] = [];
      let isFinishedDecoding = false;
      let pendingFramesCount = 0;
      let resumeDecoding: (() => void) | null = null;
      let isProcessing = false;
      let framesProcessed = 0;
      let lastProcessedCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;

      // Synchronization deferred promises
      let onExportComplete: () => void;
      let onExportError: (err: any) => void;
      const exportFinishedPromise = new Promise<void>((resolve, reject) => {
        onExportComplete = resolve;
        onExportError = reject;
      });

      const processQueue = async () => {
        if (isProcessing) return;
        isProcessing = true;

        try {
          while (true) {
            if (decodedFramesQueue.length === 0) {
              break;
            }

            // We need at least 2 frames in queue to define current and next.
            // If the stream is finished decoding, we process whatever remains.
            if (!isFinishedDecoding && decodedFramesQueue.length < 2) {
              break;
            }

            const currentItem = decodedFramesQueue[0];
            const nextItem = decodedFramesQueue.length > 1 ? decodedFramesQueue[1] : currentItem;
            const prevCanvas = lastProcessedCanvas || currentItem.canvas;

            ctx.clearRect(0, 0, width, height);

            // Draw current frame with Global Color Grading applied
            BeautyEngine.drawVideoWithGlobalColorGrading(
              ctx as CanvasRenderingContext2D,
              currentItem.canvas,
              width,
              height,
              beautyValues
            );

            // Process face mesh landmarks on current frame canvas
            const aiResult = await faceMeshEngine.processFrame(currentItem.canvas, currentItem.timestamp * 1000);

            if (aiResult) {
              BeautyEngine.apply(
                ctx as CanvasRenderingContext2D,
                currentItem.canvas,
                width,
                height,
                aiResult.landmarks,
                aiResult.segmentationMask,
                aiResult.maskWidth,
                aiResult.maskHeight,
                beautyValues
              );
            }

            // Apply Temporal Lucid Engine Pass using sliding window
            await LucidEngine.apply(
              ctx as CanvasRenderingContext2D,
              currentItem.canvas,
              fps,
              beautyValues,
              true, // isExporting = true
              {
                prev: prevCanvas,
                current: currentItem.canvas,
                next: nextItem.canvas
              }
            );

            // Encode the final rendered frame
            const timestampUs = Math.round((currentItem.timestamp - startSec) * 1e6);
            const durationUs = Math.round((currentItem.duration || (1 / fps)) * 1e6);

            const frame = new VideoFrame(shaderCanvas as CanvasImageSource, {
              timestamp: timestampUs,
              duration: durationUs,
              alpha: 'discard'
            });

            const insertKeyframe = (framesProcessed % (fps * 2) === 0);
            encoder.encode(frame, { keyFrame: insertKeyframe });
            frame.close();

            framesProcessed++;

            // Clean up and release prev canvas back to pool
            if (lastProcessedCanvas) {
              canvasPool!.release(lastProcessedCanvas);
            }

            lastProcessedCanvas = currentItem.canvas;
            decodedFramesQueue.shift();

            // Progress callback (capped at 99% until fully muxed)
            const progress = Math.min(99, (framesProcessed / totalFrames) * 100);
            onProgress(progress);

            // Handle backpressure
            pendingFramesCount--;
            if (pendingFramesCount < 2 && resumeDecoding) {
              resumeDecoding();
              resumeDecoding = null;
            }

            // Yield control back to browser momentarily to allow UI elements/progress bars to draw
            await new Promise(resolve => setTimeout(resolve, 0));
          }

          // If decoding is finished and the queue is completely drained, we are done
          if (isFinishedDecoding && decodedFramesQueue.length === 0) {
            if (lastProcessedCanvas) {
              canvasPool!.release(lastProcessedCanvas);
              lastProcessedCanvas = null;
            }
            onExportComplete();
          }

        } catch (err) {
          console.error("Queue processing error:", err);
          onExportError(err);
        } finally {
          isProcessing = false;
        }
      };

      // Initialize VideoDecoder
      const decoder = new VideoDecoder({
        output: (frame) => {
          const canvas = canvasPool!.acquire();
          const canvasCtx = canvas.getContext('2d');
          if (canvasCtx) {
            canvasCtx.drawImage(frame, 0, 0, width, height);
          }

          const item: DecodedFrameItem = {
            canvas,
            timestamp: frame.timestamp / 1e6,
            duration: (frame.duration || 0) / 1e6
          };

          decodedFramesQueue.push(item);
          frame.close();

          // Increment and check backpressure
          pendingFramesCount++;
          processQueue();
        },
        error: (e) => {
          console.error("Decoder error:", e);
          onExportError(e);
        }
      });

      decoder.configure(videoDecoderConfig);

      // Start consuming the demuxer stream
      const chunkStream = demuxer.read('video', startSec, endSec);
      const reader = chunkStream.getReader();

      while (true) {
        if (pendingFramesCount >= 4) {
          await new Promise<void>((resolve) => {
            resumeDecoding = resolve;
          });
        }

        const { done, value: chunk } = await reader.read();
        if (done) {
          break;
        }

        decoder.decode(chunk);
      }

      // Flush decoder
      await decoder.flush();
      isFinishedDecoding = true;

      // Force processing of final lookahead frame at the end of the queue
      await processQueue();

      // Wait for rendering and encoding to finish
      await exportFinishedPromise;

      // Flush encoders
      await encoder.flush();
      if (audioEncoder) {
        await audioEncoder.flush();
      }

      // Finalize the MP4 file container structure
      muxer.finalize();

      // Clean up demuxer
      demuxer.destroy();

      const { buffer } = muxer.target as ArrayBufferTarget;
      const mp4Blob = new Blob([buffer], { type: 'video/mp4' });
      const downloadUrl = URL.createObjectURL(mp4Blob);

      onComplete(downloadUrl, `${projectName.replace(/\s+/g, '_')}_G7X.mp4`);

    } catch (err) {
      console.error('Export Error:', err);
      if (demuxer) {
        try { demuxer.destroy(); } catch (_) {}
      }
      onError(err);
    } finally {
      if (canvasPool) {
        canvasPool.clear();
      }
    }
  }
}

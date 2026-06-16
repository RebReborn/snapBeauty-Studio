import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { BeautyEngine, BeautyValues } from './BeautyEngine';
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
    const { videoElement, beautyValues, resolution, fps = 30, sourceStart = 0, sourceEnd, onProgress, onComplete, onError, projectName = 'Processed_Video' } = options;

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

      // Fetch and decode audio
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
        codec: 'avc1.640034', // High profile for better quality
        width: width,
        height: height,
        bitrate: bitrate,
        framerate: fps,
        hardwareAcceleration: 'prefer-hardware'
      });

      // Configure Audio Encoder
      let audioEncoder: AudioEncoder | null = null;
      if (audioBuffer && (window as any).AudioEncoder) {
        audioEncoder = new (window as any).AudioEncoder({
          output: (chunk: any, metadata: any) => muxer.addAudioChunk(chunk, metadata),
          error: (e: any) => console.error("Audio Encoding error:", e)
        });
        audioEncoder.configure({
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
          
          audioEncoder.encode(audioData);
          audioData.close();
        }
      }

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
        await seekToFrame(videoElement, startSec + (i / fps));

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
      if (audioEncoder) {
        await audioEncoder.flush();
      }
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

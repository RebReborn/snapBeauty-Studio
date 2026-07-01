import { BeautyValues } from '../context/AppContext';

export class LucidEngine {
  // Allocate static offscreen cache layers to prevent browser garbage collection lag
  private static prevCanvas: HTMLCanvasElement | null = null;
  private static nextCanvas: HTMLCanvasElement | null = null;

  private static initCache(w: number, h: number) {
    if (!this.prevCanvas || this.prevCanvas.width !== w || this.prevCanvas.height !== h) {
      this.prevCanvas = document.createElement('canvas');
      this.prevCanvas.width = w; this.prevCanvas.height = h;
      this.nextCanvas = document.createElement('canvas');
      this.nextCanvas.width = w; this.nextCanvas.height = h;
    }
  }

  /**
   * Main entry point: Unifies multi-frame temporal denoising and 2D spatial convolution filters
   */
  static async apply(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement | CanvasImageSource,
    fps: number,
    bv: BeautyValues,
    isExporting: boolean = false,
    temporalFrames?: { prev: CanvasImageSource; current: CanvasImageSource; next: CanvasImageSource }
  ) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    
    const hasEnhancement = 
      bv.lucidRecoverDetails > 0 || 
      bv.lucidAddNoise > 0 ||
      bv.lucidSharpen > 0 ||
      bv.lucidAntiAliasDeblur !== 0 ||
      bv.lucidReduceNoise > 0 ||
      bv.lucidRevertCompression > 0 ||
      bv.lucidDehalo > 0;

    if (!hasEnhancement) return;

    this.initCache(w, h);
    const prevCtx = this.prevCanvas!.getContext('2d')!;
    const nextCtx = this.nextCanvas!.getContext('2d')!;

    // 1. Capture Current Rendered State (State T)
    const currentImgData = ctx.getImageData(0, 0, w, h);
    
    // Only perform heavy temporal seeking during Export to prevent UI live playback stutter
    if (isExporting) {
      if (temporalFrames) {
        prevCtx.drawImage(temporalFrames.prev, 0, 0, w, h);
        nextCtx.drawImage(temporalFrames.next, 0, 0, w, h);
      } else {
        const vid = video as HTMLVideoElement;
        // 2. Sample Historical Buffer Pass (State T-1)
        if (vid.currentTime === 0) {
          prevCtx.drawImage(ctx.canvas, 0, 0);
        }

        // 3. Look-Ahead Layer Sampling (State T+1)
        const originalTime = vid.currentTime;
        const frameDuration = 1 / fps;
        
        vid.currentTime = Math.min(vid.duration, originalTime + frameDuration);
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            vid.removeEventListener('seeked', onSeeked);
            resolve();
          };
          vid.addEventListener('seeked', onSeeked);
        });
        
        nextCtx.drawImage(vid, 0, 0, w, h);
        vid.currentTime = originalTime; // Return to true coordinate
        
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            vid.removeEventListener('seeked', onSeeked);
            resolve();
          };
          vid.addEventListener('seeked', onSeeked);
        });
      }
    }

    // 4. Extract Pixel Arrays
    const prevImgData = isExporting ? prevCtx.getImageData(0, 0, w, h) : currentImgData;
    const nextImgData = isExporting ? nextCtx.getImageData(0, 0, w, h) : currentImgData;
    
    const workCanvas = document.createElement('canvas');
    workCanvas.width = w; workCanvas.height = h;
    const workCtx = workCanvas.getContext('2d')!;
    const outputData = workCtx.createImageData(w, h);
    
    const cData = currentImgData.data;
    const pData = prevImgData.data;
    const nData = nextImgData.data;
    const oData = outputData.data;

    // --- STEP A: TEMPORAL STABILIZATION (Noise Reduction & Compression Reversion) ---
    const stabilizationStrength = (bv.lucidReduceNoise * 0.005) + (bv.lucidRevertCompression * 0.004); 

    for (let i = 0; i < cData.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const idx = i + c;
        const currentPixel = cData[idx];
        const temporalAverage = (pData[idx] * 0.25) + (currentPixel * 0.50) + (nData[idx] * 0.25);
        
        // Motion Threshold gating to prevent ghosting motion artifacts
        const variance = Math.abs(currentPixel - temporalAverage);
        if (variance < 22) { 
          oData[idx] = (currentPixel * (1.0 - stabilizationStrength)) + (temporalAverage * stabilizationStrength);
        } else {
          oData[idx] = currentPixel; 
        }
      }
      oData[i + 3] = cData[i + 3];
    }
    workCtx.putImageData(outputData, 0, 0);

    // --- STEP B: DEHALO (Local Edge Brightness Damping) ---
    if (bv.lucidDehalo > 0) {
      const haloCanvas = document.createElement('canvas');
      haloCanvas.width = w; haloCanvas.height = h;
      const haloCtx = haloCanvas.getContext('2d')!;
      haloCtx.filter = `blur(${bv.lucidDehalo * 0.04}px)`;
      haloCtx.drawImage(workCanvas, 0, 0);
      
      workCtx.save();
      workCtx.globalCompositeOperation = 'darken';
      workCtx.globalAlpha = bv.lucidDehalo * 0.004;
      workCtx.drawImage(haloCanvas, 0, 0);
      workCtx.restore();
    }

    // --- STEP C: SHARPEN / DEBLUR (High-Fidelity 3x3 Convolution Kernel Matrix) ---
    const totalSharpen = bv.lucidSharpen + (bv.lucidAntiAliasDeblur > 0 ? bv.lucidAntiAliasDeblur : 0);
    if (totalSharpen > 0) {
      const imgData = workCtx.getImageData(0, 0, w, h);
      const pixels = imgData.data;
      const sharpenOutput = workCtx.createImageData(w, h);
      const outPixels = sharpenOutput.data;

      const kStrength = totalSharpen * 0.004;
      const center = 1.0 + (4.0 * kStrength);
      const edge = -kStrength;

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          for (let c = 0; c < 3; c++) {
            const currentIdx = idx + c;
            const rgbVal = 
              pixels[currentIdx] * center +
              pixels[currentIdx - 4] * edge + 
              pixels[currentIdx + 4] * edge + 
              pixels[currentIdx - (w * 4)] * edge + 
              pixels[currentIdx + (w * 4)] * edge;
            
            outPixels[currentIdx] = Math.min(255, Math.max(0, rgbVal));
          }
          outPixels[idx + 3] = pixels[idx + 3];
        }
      }
      workCtx.putImageData(sharpenOutput, 0, 0);
    }

    // --- STEP D: ANTI-ALIASING PASS (Edge Blur Smoothing) ---
    if (bv.lucidAntiAliasDeblur < 0) {
      const aaAmount = Math.abs(bv.lucidAntiAliasDeblur) * 0.01;
      const aaCanvas = document.createElement('canvas');
      aaCanvas.width = w; aaCanvas.height = h;
      const aaCtx = aaCanvas.getContext('2d')!;
      aaCtx.filter = `blur(${aaAmount * 0.6}px)`;
      aaCtx.drawImage(workCanvas, 0, 0);

      workCtx.save();
      workCtx.globalAlpha = aaAmount * 0.4;
      workCtx.drawImage(aaCanvas, 0, 0);
      workCtx.restore();
    }

    // --- STEP E: RECOVER DETAILS (Unaltered Source Interpolation) ---
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(workCanvas, 0, 0);

    if (bv.lucidRecoverDetails > 0) {
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = w; srcCanvas.height = h;
      if (temporalFrames) {
        srcCanvas.getContext('2d')!.drawImage(temporalFrames.current, 0, 0, w, h);
      } else {
        srcCanvas.getContext('2d')!.drawImage(video as CanvasImageSource, 0, 0, w, h);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = bv.lucidRecoverDetails * 0.01;
      ctx.drawImage(srcCanvas, 0, 0);
      ctx.restore();
    }

    // --- STEP F: SENSOR GRAIN OVERLAY ---
    if (bv.lucidAddNoise > 0) {
      const grainTemp = document.createElement('canvas');
      grainTemp.width = 128; grainTemp.height = 128;
      const gCtx = grainTemp.getContext('2d')!;
      const idata = gCtx.createImageData(128, 128);
      
      for (let i = 0; i < idata.data.length; i += 4) {
        const val = Math.floor(Math.random() * 255);
        idata.data[i] = val; idata.data[i+1] = val; idata.data[i+2] = val; idata.data[i+3] = 255;
      }
      gCtx.putImageData(idata, 0, 0);

      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = bv.lucidAddNoise * 0.0025;
      const pattern = ctx.createPattern(grainTemp, 'repeat');
      if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    // Cycle cache memory window states
    if (isExporting) {
      prevCtx.putImageData(currentImgData, 0, 0);
    }
  }
}

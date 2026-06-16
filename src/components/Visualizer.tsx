/**
 * Visualizer — GPU canvas preview with local AI face detection
 *
 *  Browser (React)
 *      │
 *      ▼
 *  ONNX Runtime Web  ◄── model stored in IndexedDB
 *      │
 *      ▼
 *  WebGPU / WebGL / WASM   (user's GPU / CPU)
 *
 * ✅ Videos never leave the device
 * ✅ Inference is 100 % local — no server round-trips
 * ✅ 1080p and 4K supported (model sees a 320×240 thumbnail)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Play, Pause, SkipBack, SkipForward, Maximize2, Eye, EyeOff, Film,
  Cpu, Zap, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { faceMeshEngine, type BoundingBox, type EngineStatus } from '../services/FaceMeshEngine';
import { BeautyEngine } from '../services/BeautyEngine';

// MediaPipe FaceMesh indices for drawing
const JAWLINE_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 
  54, 103, 67, 109
];
const LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
const LIPS_OUTER_INDICES = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const LIPS_INNER_INDICES = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

// ─── Face mesh / bounding box overlay ────────────────────────────────────────
function drawFaceMesh(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  showMesh: boolean, showBox: boolean,
  landmarks: Array<{ x: number; y: number; z: number }> | null,
  faceBox: BoundingBox | null
) {
  if (!showMesh && !showBox) return;
  if (!landmarks) return;

  // ── Bounding box ──────────────────────────────────────────────────────────
  if (showBox && faceBox) {
    const bx = faceBox.x * w;
    const by = faceBox.y * h;
    const bw = faceBox.width * w;
    const bh = faceBox.height * h;

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(bx, by, bw, bh);

    // Corner accents
    ctx.fillStyle = '#f472b6';
    [[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].forEach(([x, y]) => {
      ctx.fillRect(x - 5, y - 1.5, 13, 3);
      ctx.fillRect(x - 1.5, y - 5, 3, 13);
    });

    // Label badge
    const label     = `FACE · ${(faceBox.score * 100).toFixed(0)}%  ✓`;
    const labelW = ctx.measureText(label).width + 14;
    ctx.fillRect(bx, by - 18, labelW, 17);
    ctx.fillStyle   = '#fff';
    ctx.font        = 'bold 9px monospace';
    ctx.textAlign   = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + 5, by - 9);
  }

  if (!showMesh) return;

  // ── 468-Point Face Mesh ────────────────────────────────────────────────────
  ctx.save();
  ctx.strokeStyle = 'rgba(192,132,252,0.28)';
  ctx.lineWidth   = 0.6;

  const drawContour = (indices: number[], close = false) => {
    ctx.beginPath();
    const first = landmarks[indices[0]];
    if (first) {
      ctx.moveTo(first.x * w, first.y * h);
      for (let i = 1; i < indices.length; i++) {
        const pt = landmarks[indices[i]];
        if (pt) ctx.lineTo(pt.x * w, pt.y * h);
      }
      if (close) ctx.closePath();
      ctx.stroke();
    }
  };

  // Draw anatomically correct contours using landmark indices
  drawContour(JAWLINE_INDICES);
  drawContour(LEFT_EYE_INDICES, true);
  drawContour(RIGHT_EYE_INDICES, true);
  drawContour(LIPS_OUTER_INDICES, true);
  drawContour(LIPS_INNER_INDICES, true);
  drawContour([70, 63, 105, 66, 107, 55, 65, 52, 53, 46]); // left eyebrow
  drawContour([300, 293, 334, 296, 336, 285, 295, 282, 283, 276]); // right eyebrow
  drawContour([168, 6, 197, 195, 4]); // nose vertical bridge
  drawContour([98, 97, 2, 326, 327]); // nose base outline

  // Draw all 468 landmark points as tiny futuristic dots
  ctx.fillStyle = 'rgba(192,132,252,0.65)';
  for (let i = 0; i < landmarks.length; i++) {
    const pt = landmarks[i];
    if (pt) {
      ctx.fillRect(pt.x * w - 0.75, pt.y * h - 0.75, 1.5, 1.5);
    }
  }

  ctx.restore();
}

// ─── Loading overlay drawn onto the canvas ────────────────────────────────────
function drawLoadingOverlay(
  ctx: CanvasRenderingContext2D, w: number, h: number,
  progress: number, label: string, tick: number
) {
  // Dark glass background
  ctx.fillStyle = 'rgba(10,7,16,0.92)';
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2, cy = h / 2;

  // Animated orbit ring
  ctx.save();
  ctx.translate(cx, cy - 48);
  ctx.rotate(tick * 0.04);
  ctx.strokeStyle = 'rgba(192,132,252,0.15)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI * 2);
  ctx.stroke();
  // Bright arc
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth   = 2.5;
  ctx.shadowColor = '#c084fc';
  ctx.shadowBlur  = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 34, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Central % text
  ctx.fillStyle   = '#e9d5ff';
  ctx.font        = 'bold 14px monospace';
  ctx.textAlign   = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress * 100)}%`, cx, cy - 48);

  // Title
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 16px system-ui';
  ctx.fillText('Local AI Engine', cx, cy + 4);

  // Status label (scrolls if too long)
  ctx.fillStyle = 'rgba(192,132,252,0.85)';
  ctx.font      = '11px monospace';
  ctx.fillText(label, cx, cy + 24);

  // Privacy badges
  const badges = ['🔒 Private', '⚡ WebGPU', '💾 Cached'];
  badges.forEach((b, i) => {
    const bx = cx - 95 + i * 70;
    const by = cy + 46;
    ctx.fillStyle = 'rgba(139,92,246,0.18)';
    roundRect(ctx, bx - 28, by - 8, 56, 16, 4);
    ctx.fill();
    ctx.fillStyle = '#a78bfa';
    ctx.font      = '9px system-ui';
    ctx.fillText(b, bx, by + 1);
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Placeholder (no video loaded) ───────────────────────────────────────────
function drawPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#100b18');
  bg.addColorStop(1, '#0a0710');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save(); ctx.globalAlpha = 0.07; ctx.fillStyle = '#c084fc';
  ctx.beginPath(); ctx.arc(w / 2, h / 2 - 20, 46, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  ctx.fillStyle    = 'rgba(255,255,255,0.55)';
  ctx.font         = '28px system-ui';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🎬', w / 2, h / 2 - 20);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font      = 'bold 15px system-ui';
  ctx.fillText('Drop a video to start editing', w / 2, h / 2 + 22);

  ctx.fillStyle = 'rgba(192,132,252,0.4)';
  ctx.font      = '11px system-ui';
  ctx.fillText('MP4  •  MOV  •  AVI  •  MKV  •  WEBM', w / 2, h / 2 + 43);

  // Pro Tip
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font      = '10px system-ui';
  ctx.fillText('💡 Tip: Works best with a single, well-lit subject in frame', w / 2, h / 2 + 70);
}

// ─── Visualizer Component ─────────────────────────────────────────────────────
const Visualizer: React.FC = () => {
  const {
    activeProject, beautyValues,
    playheadPosition, setPlayheadPosition,
    isPlaying, setIsPlaying,
    exportCanvasRef, exportVideoRef,
    isExporting, exportResolution,
  } = useApp();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef     = exportVideoRef;
  const canvasRef    = exportCanvasRef;
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef       = useRef<number>(0);
  const tickRef      = useRef<number>(0);
  const fpsBucket    = useRef({ count: 0, last: performance.now() });

  // Mirror state → refs so RAF loop always gets fresh values
  const beautyRef   = useRef(beautyValues);
  const splitRef    = useRef(0.5);
  const showMeshRef = useRef(true);
  const showBoxRef  = useRef(true);
  const isExportingRef = useRef(isExporting);

  // Face detection/mesh refs (written from worker, read in RAF)
  const landmarksRef   = useRef<Array<{ x: number; y: number; z: number }> | null>(null);
  const faceBoxRef     = useRef<BoundingBox | null>(null);
  const segmentationMaskRef = useRef<Uint8ClampedArray | null>(null);
  const maskSizeRef    = useRef({ w: 0, h: 0 });
  const videoSizeRef   = useRef({ w: 1280, h: 720 });

  // Engine progress (written in callbacks, read in RAF)
  const engineProgressRef = useRef(0);
  const engineLabelRef    = useRef('Initialising…');

  // ── State (UI re-renders) ─────────────────────────────────────────────────
  const [showMesh,       setShowMesh]       = useState(true);
  const [showBox,        setShowBox]        = useState(true);
  const [showCompare,    setShowCompare]    = useState(false);
  const [previewQuality, setPreviewQuality] = useState<'low' | 'med' | 'high'>('high');
  const [fps,            setFps]            = useState(0);
  const [split,          setSplit]          = useState(0.5);
  const [draggingSplit,  setDraggingSplit]  = useState(false);
  const [hasVideo,       setHasVideo]       = useState(false);
  const [videoDuration,  setVideoDuration]  = useState(0);
  const [canvasSize,     setCanvasSize]     = useState({ w: 720, h: 405 });

  const [engineStatus,   setEngineStatus]  = useState<EngineStatus>('idle');
  const [faceDetected,   setFaceDetected]  = useState(false);
  const [backendName,    setBackendName]   = useState('');
  // For UI badge — synced periodically from engine refs
  const [,               setLoadLabel]     = useState('');
  const [loadPct,        setLoadPct]       = useState(0);

  // Keep refs in sync with state/props
  const showCompareRef = useRef(false);
  useEffect(() => { beautyRef.current   = beautyValues; }, [beautyValues]);
  useEffect(() => { splitRef.current    = split;        }, [split]);
  useEffect(() => { showMeshRef.current = showMesh;     }, [showMesh]);
  useEffect(() => { showBoxRef.current  = showBox;      }, [showBox]);
  useEffect(() => { showCompareRef.current = showCompare; }, [showCompare]);
  useEffect(() => { isExportingRef.current = isExporting; }, [isExporting]);

  // ── Init MediaPipe face mesh engine ──────────────────────────────────────────
  useEffect(() => {
    if (faceMeshEngine.status === 'ready') {
      setEngineStatus('ready');
      setBackendName(faceMeshEngine.activeBackend);
      return;
    }
    if (faceMeshEngine.status === 'loading') return; // already in progress

    setEngineStatus('loading');
    faceMeshEngine.init((pct, label) => {
      engineProgressRef.current = pct;
      engineLabelRef.current    = label;
      setLoadPct(pct);
      setLoadLabel(label);
    })
      .then(() => {
        setEngineStatus('ready');
        setBackendName(faceMeshEngine.activeBackend);
      })
      .catch(() => {
        setEngineStatus('error');
      });
  }, []);

  // ── Render loop ────────────────────────────────────────────────────────────
  const startRenderLoop = useCallback(() => {
    const loop = (now: number) => {
      tickRef.current++;
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      if (!ctx)  { rafRef.current = requestAnimationFrame(loop); return; }

      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const engineReady = faceMeshEngine.status === 'ready';
      const engineStatus = faceMeshEngine.status;

      if (engineStatus === 'loading' || engineStatus === 'idle') {
        // ── Loading overlay ─────────────────────────────────────────────────
        drawLoadingOverlay(ctx, w, h, engineProgressRef.current, engineLabelRef.current, tickRef.current);

      } else {
        const video       = videoRef.current;
        const hasLiveVideo = video && video.src && video.readyState >= 2;

        if (hasLiveVideo) {
          const isExp       = isExportingRef.current;
          
          // If exporting deterministically, we pause this UI loop completely
          if (isExp) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          const sx          = isExp || !showCompareRef.current ? 0 : w * splitRef.current;
          const bv          = beautyRef.current;
          const landmarks   = landmarksRef.current;
          const faceBox     = faceBoxRef.current;

          // LEFT — original
          if (!isExp) {
            ctx.save();
            ctx.beginPath(); ctx.rect(0, 0, sx, h); ctx.clip();
            ctx.filter = 'none';
            ctx.drawImage(video!, 0, 0, w, h);
            ctx.fillStyle = 'rgba(0,0,0,0.52)'; ctx.fillRect(8, 8, 72, 20);
            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 10px system-ui';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText('◁  ORIGINAL', 13, 18);
            ctx.restore();
          }

          // RIGHT — beauty filtered
          ctx.save();
          ctx.beginPath(); ctx.rect(sx, 0, w - sx, h); ctx.clip();
          
          // Apply Global Color Grading (Draws video to canvas)
          BeautyEngine.drawVideoWithGlobalColorGrading(ctx, video!, w, h, bv);
          
          // Apply new canvas-based BeautyEngine filters
          BeautyEngine.apply(
            ctx,
            video!,
            w,
            h,
            landmarks,
            segmentationMaskRef.current,
            maskSizeRef.current.w,
            maskSizeRef.current.h,
            bv
          );
          // ── Split Slider Line ──
          if (!isExp && sx > 0 && sx < w) {
            ctx.fillStyle = '#fff';
            ctx.fillRect(sx - 1.5, 0, 3, h);
            // Pill
            ctx.fillStyle = '#c084fc';
            roundRect(ctx, sx - 4, h / 2 - 20, 8, 40, 4);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(0,0,0,0.52)';
            ctx.fillRect(w - 80, 8, 72, 20);
            ctx.fillStyle = '#e5e7eb';
            ctx.font = 'bold 10px system-ui';
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText('EDITED  ▷', w - 13, 18);
          }

          // ── Face Mesh & BBox ──
          if (!isExp) {
            drawFaceMesh(
              ctx, w, h,
              showMeshRef.current, showBoxRef.current,
              landmarks, faceBox
            );
          }
          ctx.restore();

          // Update face detected badge safely
          const hasFace = !!faceBox;
          if (faceDetected !== hasFace) {
             setFaceDetected(hasFace);
          }

          // Real-time processing
          if (!faceMeshEngine.isBusy) {
            faceMeshEngine.processFrame(video!, performance.now()).then(res => {
              if (res) {
                landmarksRef.current = res.landmarks;
                faceBoxRef.current = res.faceBox;
                segmentationMaskRef.current = res.segmentationMask;
                maskSizeRef.current = { w: res.maskWidth, h: res.maskHeight };
              }
            }).catch(e => console.error(e));
          }

        } else {
          drawPlaceholder(ctx, w, h);
          landmarksRef.current = null;
          faceBoxRef.current = null;
          segmentationMaskRef.current = null;
        }
      }

      // ── FPS counter ───────────────────────────────────────────────────────
      fpsBucket.current.count++;
      if (now - fpsBucket.current.last >= 1000) {
        setFps(fpsBucket.current.count);
        fpsBucket.current = { count: 0, last: now };
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    startRenderLoop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [startRenderLoop]);

  // ── Load video when project changes ────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const url = activeProject?.video?.url;
    if (url && (url.startsWith('blob:') || url.startsWith('http'))) {
      video.src = url;
      video.load();
      setHasVideo(true);
      landmarksRef.current = null;
      faceBoxRef.current = null;
      segmentationMaskRef.current = null;
      setFaceDetected(false);
    } else {
      video.removeAttribute('src');
      setHasVideo(false);
      setVideoDuration(0);
      landmarksRef.current = null;
      faceBoxRef.current = null;
      segmentationMaskRef.current = null;
      setFaceDetected(false);
    }
  }, [activeProject?.video?.url]);

  // ── Canvas Sizing ──
  useEffect(() => {
    const vw = videoSizeRef.current.w || 1280;
    const vh = videoSizeRef.current.h || 720;
    const ratio = vw / vh;
    
    if (isExporting) {
      let targetW = 1280;
      if (exportResolution === '1080p') targetW = 1920;
      else if (exportResolution === '1440p') targetW = 2560;
      else if (exportResolution === '4K') targetW = 3840;
      else targetW = 1280; // 720p output width is usually 1280x720, wait! 720p HD means height is 720! Width is 1280.
      
      // Let's set dimensions by height for standard progressive formats
      let targetH = 720;
      if (exportResolution === '1080p') targetH = 1080;
      else if (exportResolution === '1440p') targetH = 1440;
      else if (exportResolution === '4K') targetH = 2160;
      
      setCanvasSize({ w: Math.round(targetH * ratio), h: targetH });
    } else {
      // Preview mode: cap to 720px height max to save GPU in UI
      setCanvasSize({ w: Math.round(720 * ratio), h: 720 });
    }
  }, [isExporting, exportResolution]);

  // ── Video events ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onMeta = () => {
      setVideoDuration(video.duration);
      const vw = video.videoWidth  || 1280;
      const vh = video.videoHeight || 720;
      videoSizeRef.current = { w: vw, h: vh };
      const ratio = vw / vh;
      setCanvasSize({ w: Math.round(720 * ratio), h: 720 });
    };
    const onTimeUpdate = () => {
      if (!isExportingRef.current) {
        setPlayheadPosition(video.currentTime);
      }
    };
    const onEnded      = () => setIsPlaying(false);
    const onError      = (e: Event) => { console.error('Video error:', e); setHasVideo(false); };
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('timeupdate',     onTimeUpdate);
    video.addEventListener('ended',          onEnded);
    video.addEventListener('error',          onError);
    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate',     onTimeUpdate);
      video.removeEventListener('ended',          onEnded);
      video.removeEventListener('error',          onError);
    };
  }, [setPlayheadPosition, setIsPlaying]);

  // ── Play / pause ───────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasVideo) return;
    if (isPlaying) { video.play().catch(() => setIsPlaying(false)); }
    else           { video.pause(); }
  }, [isPlaying, hasVideo, setIsPlaying]);

  // ── Scrub from timeline ────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasVideo || isPlaying) return;
    if (Math.abs(video.currentTime - playheadPosition) > 0.15) {
      video.currentTime = playheadPosition;
    }
  }, [playheadPosition, hasVideo, isPlaying]);

  // ── Split drag ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingSplit || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const v    = Math.max(0.04, Math.min(0.96, (e.clientX - rect.left) / rect.width));
      setSplit(v);
      splitRef.current = v;
    };
    const onUp = () => setDraggingSplit(false);
    if (draggingSplit) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup',   onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [draggingSplit]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTC = (s: number) => {
    const m   = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const f   = Math.floor((s % 1) * 30);
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}:${String(f).padStart(2,'0')}`;
  };

  const duration = videoDuration || activeProject?.video?.duration || 0;

  // Backend icon
  const BackendIcon = backendName.includes('WebGPU') ? Zap : backendName.includes('WebGL') ? Cpu : Cpu;
  const backendColor = backendName.includes('WebGPU')
    ? 'border-violet-500/50 text-violet-300 bg-violet-500/10'
    : backendName.includes('WebGL')
    ? 'border-blue-500/40 text-blue-300 bg-blue-500/10'
    : 'border-gray-500/40 text-gray-300 bg-gray-500/10';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex flex-col justify-between p-3 z-10 select-none"
      style={{ cursor: draggingSplit ? 'ew-resize' : 'default' }}
    >
      {/* ── Hidden video element ── */}
      <video
        ref={videoRef}
        src={activeProject?.video?.url || ''}
        className="hidden"
        playsInline
        loop={!isExporting}
        preload="auto"
        crossOrigin="anonymous"
        muted
      />

      {/* ── Status bar ── */}
      <div className="flex items-center justify-between pointer-events-auto z-20">
        <div className="flex items-center gap-2 flex-wrap">

          {/* GPU canvas status */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/5 text-[10px] font-mono font-bold">
            <span className={`h-1.5 w-1.5 rounded-full ${hasVideo ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
            <span className={hasVideo ? 'text-green-400' : 'text-gray-500'}>
              {hasVideo ? 'GPU CANVAS' : 'NO VIDEO'}
            </span>
          </div>

          {/* FPS */}
          <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/5 text-[10px] font-mono font-bold text-gray-300">
            {fps} FPS
          </div>

          {/* Engine / AI status */}
          {engineStatus === 'loading' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-amber-500/30 text-[10px] font-mono font-bold text-amber-400">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
              <span>AI ENGINE  {Math.round(loadPct * 100)}%</span>
            </div>
          )}
          {engineStatus === 'ready' && (
            <>
              {/* Backend badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border text-[10px] font-mono font-bold ${backendColor}`}>
                <BackendIcon className="h-2.5 w-2.5" />
                <span>{backendName || 'AI'}</span>
              </div>
              {/* Face detect badge */}
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border text-[10px] font-mono font-bold transition-colors ${
                faceDetected
                  ? 'border-pink-500/40 text-pink-300 bg-pink-500/10'
                  : 'border-white/5 text-gray-500'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${faceDetected ? 'bg-pink-400 animate-pulse' : 'bg-gray-600'}`} />
                {faceDetected ? 'FACE LOCKED' : 'NO FACE'}
              </div>
            </>
          )}
          {engineStatus === 'error' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-red-500/40 text-[10px] font-mono font-bold text-red-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              <span>ERR: {faceMeshEngine.errorMessage.slice(0, 40)}</span>
            </div>
          )}

          {/* Resolution badge */}
          {hasVideo && activeProject?.video?.resolution && (
            <div className="px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/5 text-[10px] font-mono text-gray-400">
              {activeProject.video.resolution}
            </div>
          )}
        </div>

        {/* ── Toggle buttons ── */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowMesh(v => { const n = !v; showMeshRef.current = n; return n; }); }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 ${
              showMesh
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                : 'bg-black/60 border-white/5 text-gray-500'
            }`}
          >
            {showMesh ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span>Mesh</span>
          </button>
          <button
            onClick={() => setShowBox(!showBox)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${
              showBox
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                : 'bg-black/60 border-white/5 text-gray-500'
            }`}
          >
            <Film className="h-3 w-3" />
            <span>Face Box</span>
          </button>
          
          {/* Split Compare */}
          <button
            onClick={() => setShowCompare(!showCompare)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${
              showCompare
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                : 'bg-black/60 border-white/5 text-gray-500'
            }`}
          >
            {showCompare ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            <span>Compare</span>
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 flex items-center justify-center py-2 relative z-0 min-h-0">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="rounded-xl border border-white/10 shadow-2xl shadow-black/60 max-w-full max-h-full object-contain"
        />
        {/* Split drag zone */}
        {showCompare && (
          <div
            onMouseDown={() => setDraggingSplit(true)}
            className="absolute inset-y-2 w-9 z-20"
            style={{ left: `calc(${split * 100}% - 18px)`, cursor: 'ew-resize' }}
          />
        )}
      </div>

      {/* ── Transport controls ── */}
      <div className={`pointer-events-auto z-20 ${isExporting ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Scrubber */}
        {hasVideo && duration > 0 && (
          <div className="mb-2 px-1">
            <input
              type="range"
              min={0} max={duration} step={0.05}
              value={playheadPosition}
              onChange={(e) => {
                const t = parseFloat(e.target.value);
                setPlayheadPosition(t);
                if (videoRef.current) videoRef.current.currentTime = t;
              }}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-purple-500"
              style={{
                background: `linear-gradient(to right, #a855f7 ${(playheadPosition / duration) * 100}%, rgba(255,255,255,0.1) 0%)`
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between bg-black/75 backdrop-blur-md border border-white/8 rounded-xl py-2 px-4">
          {/* Timecode */}
          <div className="flex items-center gap-2 font-mono">
            <span className="text-xs font-bold text-white">{formatTC(playheadPosition)}</span>
            <span className="text-[10px] text-gray-600">/</span>
            <span className="text-[10px] text-gray-400">{formatTC(duration)}</span>
          </div>

          {/* Playback */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setPlayheadPosition(0); if (videoRef.current) videoRef.current.currentTime = 0; }}
              className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <SkipBack className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!hasVideo}
              className={`h-9 w-9 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-all ${
                hasVideo
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 shadow-purple-500/30 cursor-pointer'
                  : 'bg-white/10 cursor-not-allowed opacity-40'
              }`}
            >
              {isPlaying
                ? <Pause className="h-4 w-4 fill-white" />
                : <Play  className="h-4 w-4 fill-white ml-0.5" />
              }
            </button>
            <button
              onClick={() => { if (duration) { setPlayheadPosition(duration); if (videoRef.current) videoRef.current.currentTime = duration; } }}
              className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <SkipForward className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quality + fullscreen */}
          <div className="flex items-center gap-2">
            <div className="flex bg-white/5 border border-white/5 rounded-lg p-0.5">
              {(['low', 'med', 'high'] as const).map(q => (
                <button
                  key={q}
                  onClick={() => setPreviewQuality(q)}
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                    previewQuality === q
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
            <button className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visualizer;

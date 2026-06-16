// BeautyEngine.ts — High-performance HTML5 Canvas 2D Beauty Processing Engine.



export interface Point2D {
  x: number;
  y: number;
}

export interface BeautyValues {
  skinSmoothness: number;
  skinBlemish: number;
  skinAcne: number;
  skinWrinkle: number;
  skinOil: number;
  skinTone: number;
  
  teethWhitening: number;
  teethBrightness: number;
  teethNatural: number;
  teethPremium: number;
  
  eyeBrightening: number;
  eyeSharpening: number;
  eyeDarkCircle: number;
  eyeEnlargement: number;
  eyeIrisDetail: number;
  eyeColor: 'default' | 'blue' | 'green' | 'hazel' | 'gray' | 'violet';
  
  faceSlimming: number;
  faceJawline: number;
  faceCheek: number;
  faceChin: number;
  
  noseWidth: number;
  noseBridge: number;
  noseLength: number;
  
  lipFullness: number;
  lipColor: string;
  lipColorIntensity: number;
  lipGloss: number;
  lipDefinition: number;
  lipTexture: 'matte' | 'gloss' | 'sheen';

  // Digital Makeup
  makeupBlush: number;
  makeupBlushColor: string;
  makeupEyeshadow: number;
  makeupEyeshadowColor: string;
  makeupEyeliner: number;
  makeupEyelinerColor: string;
  makeupMascara: number;
  makeupContour: number;
  makeupEyebrows: number;
  makeupEyebrowsColor: string;

  // Color Grading (Global)
  cgWarmth: number;
  cgSaturation: number;
  cgContrast: number;
  cgBrightness: number;
  
  // Color Grading (Face Only)
  faceWarmth: number;
  faceTint: number;
  faceSaturation: number;
  faceContrast: number;
  faceBrightness: number;
}

// MediaPipe FaceMesh indices
const JAWLINE_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 
  54, 103, 67, 109
];

const LEFT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];

const LIPS_OUTER_INDICES = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
const LIPS_INNER_INDICES = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

const CHEEK_LEFT_INDEX = 117;
const CHEEK_RIGHT_INDEX = 346;
const LEFT_EYEBROW_INDICES = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const RIGHT_EYEBROW_INDICES = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

export class BeautyEngine {
  
  /**
   * Applies all beauty filter layers to the target canvas.
   */
  static apply(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    landmarks: Array<{ x: number; y: number; z: number }> | null,
    segmentationMask: Uint8ClampedArray | null,
    maskWidth: number,
    maskHeight: number,
    beautyValues: BeautyValues
  ) {
    if (!landmarks || landmarks.length === 0) return;

    // Convert landmarks to canvas pixel coordinate space
    const pts: Point2D[] = landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height
    }));

    // Face Color Grading Layer
    this.applyFaceColorGrading(ctx, pts, beautyValues);

    // Order of operations:
    // 1. Slimming/Reshaping (Warping changes geometry, so it must happen first or last. Doing it first creates correct geometry for subsequent overlays)
    this.slimFace(ctx, pts, beautyValues);
    this.refineNose(ctx, pts, beautyValues);
    this.plumpLips(ctx, pts, beautyValues);
    
    // Recalculate points in case they moved during warping
    const ptsUpdated = landmarks.map(lm => ({
      x: lm.x * width,
      y: lm.y * height
    }));

    // 2. Eye Enlargement
    this.enlargeEyes(ctx, ptsUpdated, beautyValues);

    // 3. Skin Smoothing & Glow (using vector boundaries and segmentation mask)
    this.smoothSkin(ctx, ptsUpdated, segmentationMask, maskWidth, maskHeight, beautyValues);
    
    // 4. Teeth Whitening
    this.whitenTeeth(ctx, ptsUpdated, beautyValues);

    // 5. Eye Brightening & Detail enhancement
    this.enhanceEyes(ctx, ptsUpdated, beautyValues);

    // 6. Makeup (Lip color, gloss, cheek blush)
    this.applyMakeup(ctx, ptsUpdated, beautyValues);
  }

  /**
   * Smooths the skin on the face by clipping to the face skin mask polygon and applying a blur filter.
   */
  private static smoothSkin(
    ctx: CanvasRenderingContext2D,
    pts: Point2D[],
    _segmentationMask: Uint8ClampedArray | null,
    _maskWidth: number,
    _maskHeight: number,
    bv: BeautyValues
  ) {
    const intensity = (bv.skinSmoothness * 0.4 + bv.skinBlemish * 0.3 + bv.skinAcne * 0.2 + bv.skinWrinkle * 0.1) / 100;
    if (intensity <= 0.05) return;

    ctx.save();

    // Skin mask path with FOREHEAD EXTRAPOLATION
    ctx.beginPath();
    if (pts[152] && pts[10] && pts[109] && pts[338]) {
      const chin = pts[152];
      const top = pts[10];
      const faceH = Math.hypot(top.x - chin.x, top.y - chin.y);
      const extDist = faceH * 0.22; // Extend forehead upwards by 22%
      
      const ux = (top.x - chin.x) / faceH;
      const uy = (top.y - chin.y) / faceH;
      
      const extTop = { x: top.x + ux * extDist, y: top.y + uy * extDist };
      const leftPt = pts[109];
      const rightPt = pts[338];
      const extLeft = { x: leftPt.x + ux * extDist * 0.7, y: leftPt.y + uy * extDist * 0.7 };
      const extRight = { x: rightPt.x + ux * extDist * 0.7, y: rightPt.y + uy * extDist * 0.7 };

      // Start at 338 (skip 10)
      ctx.moveTo(pts[JAWLINE_INDICES[1]].x, pts[JAWLINE_INDICES[1]].y);
      for (let i = 2; i < JAWLINE_INDICES.length; i++) {
        if (pts[JAWLINE_INDICES[i]]) ctx.lineTo(pts[JAWLINE_INDICES[i]].x, pts[JAWLINE_INDICES[i]].y);
      }
      
      // Curve across the extrapolated forehead to close the polygon
      ctx.quadraticCurveTo(extLeft.x, extLeft.y, extTop.x, extTop.y);
      ctx.quadraticCurveTo(extRight.x, extRight.y, rightPt.x, rightPt.y);
      ctx.closePath();
    }

    // Cut out left eye (counter-clockwise path)
    if (pts[LEFT_EYE_INDICES[0]]) {
      ctx.moveTo(pts[LEFT_EYE_INDICES[0]].x, pts[LEFT_EYE_INDICES[0]].y);
      for (let i = LEFT_EYE_INDICES.length - 1; i >= 0; i--) {
        const p = pts[LEFT_EYE_INDICES[i]];
        if (p) ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
    }

    // Cut out right eye
    if (pts[RIGHT_EYE_INDICES[0]]) {
      ctx.moveTo(pts[RIGHT_EYE_INDICES[0]].x, pts[RIGHT_EYE_INDICES[0]].y);
      for (let i = RIGHT_EYE_INDICES.length - 1; i >= 0; i--) {
        const p = pts[RIGHT_EYE_INDICES[i]];
        if (p) ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
    }

    // Cut out mouth
    if (pts[LIPS_OUTER_INDICES[0]]) {
      ctx.moveTo(pts[LIPS_OUTER_INDICES[0]].x, pts[LIPS_OUTER_INDICES[0]].y);
      for (let i = LIPS_OUTER_INDICES.length - 1; i >= 0; i--) {
        const p = pts[LIPS_OUTER_INDICES[i]];
        if (p) ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
    }

    ctx.clip("evenodd");

    // 2. Prepare blurred copy of the canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (tempCtx) {
      // Draw original frame onto offscreen
      tempCtx.drawImage(ctx.canvas, 0, 0);

      // Draw blurred image back to canvas inside face mask
      ctx.globalAlpha = intensity * 0.75;
      
      // Calculate dynamic blur radius based on canvas size (typically 6px for 720p)
      const blurRadius = Math.max(2, Math.round(ctx.canvas.width * 0.009));
      ctx.filter = `blur(${blurRadius}px) contrast(1.02)`;
      
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.filter = 'none';
    }

    // 3. Draw a skin-glow color overlay if skinOil/skinTone sliders are set
    if (bv.skinTone > 50 || bv.skinOil > 0) {
      ctx.globalAlpha = (bv.skinTone - 50) * 0.003 + (bv.skinOil * 0.001);
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = 'rgba(255, 230, 215, 0.4)';
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Whitens teeth inside the mouth opening region.
   */
  private static whitenTeeth(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    const intensity = (bv.teethWhitening * 0.7 + bv.teethBrightness * 0.3) / 100;
    if (intensity <= 0.05) return;

    ctx.save();
    
    // Path around inner lips opening
    ctx.beginPath();
    if (pts[LIPS_INNER_INDICES[0]]) {
      ctx.moveTo(pts[LIPS_INNER_INDICES[0]].x, pts[LIPS_INNER_INDICES[0]].y);
      for (let i = 1; i < LIPS_INNER_INDICES.length; i++) {
        const p = pts[LIPS_INNER_INDICES[i]];
        if (p) ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
    }
    
    ctx.clip();

    // Whiten: Desaturate yellow and increase brightness inside the mouth
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = intensity * 0.8;
    ctx.fillStyle = 'black'; // desaturates yellow/red tones
    ctx.fill();

    ctx.globalCompositeOperation = 'color-dodge';
    ctx.globalAlpha = intensity * 0.35;
    ctx.fillStyle = '#ffffff'; // boosts brightness of teeth
    ctx.fill();

    ctx.restore();
  }

  /**
   * Enhances eyes by increasing iris detail/contrast and brightening sclera.
   */
  private static enhanceEyes(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    const brightening = bv.eyeBrightening / 100;
    const sharpening = (bv.eyeSharpening * 0.6 + (bv.eyeIrisDetail || 0) * 0.4) / 100;
    
    if (brightening <= 0.05 && sharpening <= 0.05) return;

    const drawEyePath = (indices: number[]) => {
      ctx.beginPath();
      if (pts[indices[0]]) {
        ctx.moveTo(pts[indices[0]].x, pts[indices[0]].y);
        for (let i = 1; i < indices.length; i++) {
          const p = pts[indices[i]];
          if (p) ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
    };

    [LEFT_EYE_INDICES, RIGHT_EYE_INDICES].forEach(indices => {
      ctx.save();
      drawEyePath(indices);
      ctx.clip();

      if (brightening > 0.05) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = brightening * 0.22;
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      if (sharpening > 0.05) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = ctx.canvas.width;
        tempCanvas.height = ctx.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.drawImage(ctx.canvas, 0, 0);
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = sharpening * 0.45;
          ctx.filter = 'contrast(1.4) saturate(1.1)';
          ctx.drawImage(tempCanvas, 0, 0);
          ctx.filter = 'none';
        }
      }

      ctx.restore();
    });
  }

  /**
   * Enlarges the eyes using a feathered radial scaling warp.
   */
  private static enlargeEyes(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    const intensity = bv.eyeEnlargement / 100;
    if (intensity <= 0.05) return;

    const scale = 1.0 + intensity * 0.08; // scale up to 8% larger

    const processEye = (indices: number[]) => {
      // Calculate center of eye
      let sumX = 0, sumY = 0, count = 0;
      indices.forEach(idx => {
        if (pts[idx]) {
          sumX += pts[idx].x;
          sumY += pts[idx].y;
          count++;
        }
      });
      if (count === 0) return;
      const cx = sumX / count;
      const cy = sumY / count;

      // Calculate approximate radius of the eye area (from center to corner)
      const cornerPt = pts[indices[0]];
      const radius = cornerPt ? Math.hypot(cornerPt.x - cx, cornerPt.y - cy) * 1.8 : 35;

      ctx.save();

      // Create feathered radial path around eye
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.4, cx, cy, radius * 1.4);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      // Draw eye to a temp buffer and scale it
      const eyeCanvas = document.createElement('canvas');
      eyeCanvas.width = radius * 3;
      eyeCanvas.height = radius * 3;
      const eyeCtx = eyeCanvas.getContext('2d');

      if (eyeCtx) {
        // Copy the eye area from main canvas
        eyeCtx.drawImage(
          ctx.canvas,
          cx - radius * 1.5, cy - radius * 1.5, radius * 3, radius * 3,
          0, 0, radius * 3, radius * 3
        );

        // Apply scale centered on the local eye buffer
        const scaledCanvas = document.createElement('canvas');
        scaledCanvas.width = radius * 3;
        scaledCanvas.height = radius * 3;
        const scaledCtx = scaledCanvas.getContext('2d');
        if (scaledCtx) {
          scaledCtx.translate(radius * 1.5, radius * 1.5);
          scaledCtx.scale(scale, scale);
          scaledCtx.drawImage(eyeCanvas, -radius * 1.5, -radius * 1.5);
        }

        // Draw feathered overlay back
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 1.4, 0, Math.PI * 2);
        ctx.clip();
        
        ctx.drawImage(scaledCanvas, cx - radius * 1.5, cy - radius * 1.5);
      }

      ctx.restore();
    };

    processEye(LEFT_EYE_INDICES);
    processEye(RIGHT_EYE_INDICES);
  }

  /**
   * Slims the jawline and reshapes face contours using horizontal slices scaling.
   */
  private static slimFace(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    const slimFactor = (bv.faceSlimming * 0.5 + bv.faceJawline * 0.3 + bv.faceChin * 0.2) / 100;
    if (slimFactor <= 0.05) return;

    // Get lower face boundary limits
    const xCoords = pts.map(p => p.x);
    const yCoords = pts.map(p => p.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const faceW = maxX - minX;
    const faceH = maxY - minY;

    const cx = minX + faceW / 2;
    const cy = minY + faceH * 0.48; // center vertical line (nose tip level)

    const warpWidth = faceW * 1.2;
    const warpHeight = faceH * 0.55;

    ctx.save();

    // Create a copy of the canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) { ctx.restore(); return; }
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // Limit modifications to the lower face bounding box
    ctx.beginPath();
    ctx.rect(cx - warpWidth / 2, cy - 5, warpWidth, warpHeight + 15);
    ctx.clip();
    
    // Clear the rendering area of the face and redraw background first to avoid seams
    ctx.clearRect(cx - warpWidth / 2, cy - 5, warpWidth, warpHeight + 15);
    ctx.drawImage(tempCanvas, 0, 0);

    const numSlices = 20;
    const sliceH = warpHeight / numSlices;
    const maxSqueeze = slimFactor * 0.09; // up to 9% horizontal squeeze

    for (let i = 0; i < numSlices; i++) {
      const sy = cy + i * sliceH;
      const sh = sliceH + 0.5; // slight overlap to prevent black gaps

      // Squeeze factor is a parabolic curve peaking at the lower jaw/chin (around 75% down)
      const t = i / (numSlices - 1);
      const squeezeValue = Math.sin(t * Math.PI) * maxSqueeze;
      
      const sliceW = warpWidth;
      const targetW = sliceW * (1 - squeezeValue);
      const targetX = cx - targetW / 2;

      ctx.drawImage(
        tempCanvas,
        cx - sliceW / 2, sy, sliceW, sh,  // Source slice
        targetX, sy, targetW, sh          // Target warped slice
      );
    }

    ctx.restore();
  }

  /**
   * Refines the nose using local warping (slimming, shortening, and bridge highlighting).
   */
  private static refineNose(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    const noseWidth = bv.noseWidth / 100;
    const noseBridge = bv.noseBridge / 100;
    const noseLength = bv.noseLength / 100;

    if (noseWidth === 0 && noseBridge === 0 && noseLength === 0) return;

    const tip = pts[1];
    const bridge = pts[168];
    const bottom = pts[2];
    const innerLeft = pts[133];
    const innerRight = pts[362];

    if (!tip || !bridge || !bottom || !innerLeft || !innerRight) return;
    
    const boxW = Math.abs(innerLeft.x - innerRight.x) * 1.5;
    const boxH = Math.abs(bridge.y - bottom.y) * 1.5;

    ctx.save();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) { ctx.restore(); return; }
    tempCtx.drawImage(ctx.canvas, 0, 0);

    // 1. Nose Slimming (Horizontal squeeze)
    if (noseWidth > 0.05) {
      const cx = tip.x;
      const cy = tip.y - boxH * 0.2;
      
      ctx.clearRect(cx - boxW/2, cy - boxH/2, boxW, boxH);
      ctx.drawImage(tempCanvas, 0, 0);

      const numSlices = 10;
      const sliceH = boxH / numSlices;
      const maxSqueeze = noseWidth * 0.15; 

      for (let i = 0; i < numSlices; i++) {
        const sy = (cy - boxH/2) + i * sliceH;
        const t = i / (numSlices - 1);
        const squeeze = Math.sin(t * Math.PI) * maxSqueeze;
        const targetW = boxW * (1 - squeeze);
        const targetX = cx - targetW / 2;
        
        ctx.drawImage(
          tempCanvas,
          cx - boxW/2, sy, boxW, sliceH + 0.5,
          targetX, sy, targetW, sliceH + 0.5
        );
      }
      
      tempCtx.clearRect(0,0,tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(ctx.canvas, 0, 0);
    }

    // 2. Nose Length (Vertical squeeze)
    if (noseLength > 0.05) {
      const cx = tip.x;
      const cy = tip.y;

      ctx.clearRect(cx - boxW/2, cy - boxH/2, boxW, boxH);
      ctx.drawImage(tempCanvas, 0, 0);

      const numSlices = 10;
      const sliceW = boxW / numSlices;
      const maxSqueeze = noseLength * 0.1; 

      for (let i = 0; i < numSlices; i++) {
        const sx = (cx - boxW/2) + i * sliceW;
        const t = i / (numSlices - 1);
        const squeeze = Math.sin(t * Math.PI) * maxSqueeze;
        const targetH = boxH * (1 - squeeze);
        const targetY = cy - targetH / 2;

        ctx.drawImage(
          tempCanvas,
          sx, cy - boxH/2, sliceW + 0.5, boxH,
          sx, targetY, sliceW + 0.5, targetH
        );
      }
      
      tempCtx.clearRect(0,0,tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(ctx.canvas, 0, 0);
    }

    // 3. Nose Bridge Highlight
    if (noseBridge > 0.05) {
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = noseBridge * 0.3;
      
      const grad = ctx.createLinearGradient(tip.x - boxW*0.2, 0, tip.x + boxW*0.2, 0);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.5, 'rgba(255,255,255,1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(tip.x, (bridge.y + tip.y)/2, boxW*0.15, boxH*0.4, 0, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Plumps lips by vertically expanding the mouth bounding box.
   */
  private static plumpLips(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    const fullness = bv.lipFullness / 100;
    if (fullness <= 0.05) return;

    const top = pts[0]; 
    const bottom = pts[17]; 
    const left = pts[61]; 
    const right = pts[291]; 
    if (!top || !bottom || !left || !right) return;

    const cx = (left.x + right.x) / 2;
    const cy = (top.y + bottom.y) / 2;
    const w = Math.abs(right.x - left.x) * 1.5;
    const h = Math.abs(bottom.y - top.y) * 2.5;

    ctx.save();
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = ctx.canvas.width;
    tempCanvas.height = ctx.canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) { ctx.restore(); return; }
    tempCtx.drawImage(ctx.canvas, 0, 0);

    ctx.clearRect(cx - w/2, cy - h/2, w, h);
    ctx.drawImage(tempCanvas, 0, 0);

    const numSlices = 15;
    const sliceW = w / numSlices;
    const maxExpand = fullness * 0.25;

    for (let i = 0; i < numSlices; i++) {
      const sx = (cx - w/2) + i * sliceW;
      const t = i / (numSlices - 1);
      const expand = Math.sin(t * Math.PI) * maxExpand;
      const targetH = h * (1 + expand);
      const targetY = cy - targetH / 2;

      ctx.drawImage(
        tempCanvas,
        sx, cy - h/2, sliceW + 0.5, h,
        sx, targetY, sliceW + 0.5, targetH
      );
    }
    
    ctx.restore();
  }

  /**
   * Applies makeup details: lips coloration, gloss highlight, and cheeks blush.
   */
  private static applyMakeup(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    // 1. LIPS
    if (bv.lipColor && bv.lipColor !== '') {
      ctx.save();
      const lipOpacity = (bv.lipColorIntensity !== undefined ? bv.lipColorIntensity : 50) * 0.01;

      ctx.beginPath();
      if (pts[LIPS_OUTER_INDICES[0]]) {
        ctx.moveTo(pts[LIPS_OUTER_INDICES[0]].x, pts[LIPS_OUTER_INDICES[0]].y);
        for (let i = 1; i < LIPS_OUTER_INDICES.length; i++) {
          const p = pts[LIPS_OUTER_INDICES[i]];
          if (p) ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
      if (pts[LIPS_INNER_INDICES[0]]) {
        ctx.moveTo(pts[LIPS_INNER_INDICES[0]].x, pts[LIPS_INNER_INDICES[0]].y);
        for (let i = LIPS_INNER_INDICES.length - 1; i >= 0; i--) {
          const p = pts[LIPS_INNER_INDICES[i]];
          if (p) ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
      }
      ctx.clip('evenodd');

      // Texture blending
      ctx.globalCompositeOperation = bv.lipTexture === 'matte' ? 'multiply' : (bv.lipTexture === 'sheen' ? 'overlay' : 'soft-light');
      ctx.globalAlpha = lipOpacity * (bv.lipTexture === 'matte' ? 0.7 : 0.55);
      ctx.fillStyle = bv.lipColor;
      ctx.fill();

      // Gloss Specular Highlight
      if (bv.lipTexture === 'gloss' || bv.lipGloss > 15) {
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.max((bv.lipGloss * 0.01) * 0.8, 0.4);
        const topLipCenter = pts[0];
        const bottomLipCenter = pts[17];
        if (topLipCenter && bottomLipCenter) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.ellipse(topLipCenter.x, topLipCenter.y + 2, 10, 3, 0, 0, Math.PI * 2);
          ctx.ellipse(bottomLipCenter.x, bottomLipCenter.y - 2, 14, 4, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 2. BLUSH
    if (bv.makeupBlush > 0) {
      const blushOpacity = bv.makeupBlush * 0.006;
      const drawBlush = (cheekIndex: number) => {
        const cheek = pts[cheekIndex];
        if (!cheek) return;
        const jawPt = pts[JAWLINE_INDICES[8]];
        const radius = jawPt ? Math.hypot(jawPt.x - cheek.x, jawPt.y - cheek.y) * 0.5 : 35;
        
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = blushOpacity;
        const grad = ctx.createRadialGradient(cheek.x, cheek.y, 0, cheek.x, cheek.y, radius);
        // hex to rgba for gradient
        const r = parseInt(bv.makeupBlushColor.slice(1,3), 16) || 244;
        const g = parseInt(bv.makeupBlushColor.slice(3,5), 16) || 63;
        const b = parseInt(bv.makeupBlushColor.slice(5,7), 16) || 94;
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.7)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cheek.x, cheek.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawBlush(CHEEK_LEFT_INDEX);
      drawBlush(CHEEK_RIGHT_INDEX);
    }

    // 3. CONTOUR
    if (bv.makeupContour > 0) {
      const contourOpacity = bv.makeupContour * 0.004;
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = contourOpacity;
      // Cheekbone shadows
      const drawContour = (cheekIndex: number, jawIndex: number) => {
        const cheek = pts[cheekIndex];
        const jaw = pts[jawIndex];
        if (!cheek || !jaw) return;
        const midX = (cheek.x + jaw.x) / 2;
        const midY = (cheek.y + jaw.y) / 2;
        const grad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 40);
        grad.addColorStop(0, 'rgba(60, 30, 20, 0.6)');
        grad.addColorStop(1, 'rgba(60, 30, 20, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(midX, midY, 50, 15, Math.atan2(jaw.y - cheek.y, jaw.x - cheek.x), 0, Math.PI * 2);
        ctx.fill();
      };
      drawContour(CHEEK_LEFT_INDEX, JAWLINE_INDICES[2]); // left
      drawContour(CHEEK_RIGHT_INDEX, JAWLINE_INDICES[JAWLINE_INDICES.length - 3]); // right
      ctx.restore();
    }

    // 4. EYELINER
    if (bv.makeupEyeliner > 0) {
      ctx.save();
      ctx.globalAlpha = bv.makeupEyeliner * 0.01;
      ctx.strokeStyle = bv.makeupEyelinerColor || '#000000';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 3;

      const drawLiner = (indices: number[]) => {
        ctx.beginPath();
        ctx.moveTo(pts[indices[0]].x, pts[indices[0]].y);
        for(let i=1; i<=8; i++) { if(pts[indices[i]]) ctx.lineTo(pts[indices[i]].x, pts[indices[i]].y); } // Lower
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pts[indices[8]].x, pts[indices[8]].y);
        for(let i=9; i<16; i++) { if(pts[indices[i]]) ctx.lineTo(pts[indices[i]].x, pts[indices[i]].y); } // Upper
        if(pts[indices[0]]) ctx.lineTo(pts[indices[0]].x, pts[indices[0]].y);
        ctx.stroke();
      };
      drawLiner(LEFT_EYE_INDICES);
      drawLiner(RIGHT_EYE_INDICES);
      ctx.restore();
    }

    // 5. MASCARA & LASHES (2D Strokes)
    if (bv.makeupMascara > 0) {
      ctx.save();
      ctx.globalAlpha = bv.makeupMascara * 0.008;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      const drawLashes = (indices: number[], isLeft: boolean) => {
        // Draw outward strokes from upper lid (indices 8 to 15)
        for (let i = 8; i < 15; i++) {
          const pt = pts[indices[i]];
          if (!pt) continue;
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y);
          // angle radiates outward based on position
          const angleOffset = isLeft ? -0.5 : 0.5;
          ctx.quadraticCurveTo(pt.x + (isLeft ? -5 : 5), pt.y - 10, pt.x + (isLeft ? -8 : 8), pt.y - 12);
          ctx.stroke();
        }
      };
      drawLashes(LEFT_EYE_INDICES, true);
      drawLashes(RIGHT_EYE_INDICES, false);
      ctx.restore();
    }

    // 6. EYESHADOW
    if (bv.makeupEyeshadow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = bv.makeupEyeshadow * 0.007;
      ctx.fillStyle = bv.makeupEyeshadowColor || '#d97706';
      
      const drawShadow = (eye: number[], brow: number[]) => {
        ctx.beginPath();
        // Upper eyelid
        if (pts[eye[8]]) ctx.moveTo(pts[eye[8]].x, pts[eye[8]].y);
        for (let i = 9; i < 16; i++) { if (pts[eye[i]]) ctx.lineTo(pts[eye[i]].x, pts[eye[i]].y); }
        if (pts[eye[0]]) ctx.lineTo(pts[eye[0]].x, pts[eye[0]].y);
        
        // Up to brow (reverse order to close polygon)
        for (let i = brow.length - 1; i >= 0; i--) { if (pts[brow[i]]) ctx.lineTo(pts[brow[i]].x, pts[brow[i]].y); }
        ctx.closePath();
        ctx.fill();
      };
      drawShadow(LEFT_EYE_INDICES, LEFT_EYEBROW_INDICES);
      drawShadow(RIGHT_EYE_INDICES, RIGHT_EYEBROW_INDICES);
      ctx.restore();
    }

    // 7. EYEBROWS
    if (bv.makeupEyebrows > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = bv.makeupEyebrows * 0.008;
      ctx.fillStyle = bv.makeupEyebrowsColor || '#451a03';
      ctx.shadowColor = bv.makeupEyebrowsColor;
      ctx.shadowBlur = 4;
      const drawBrow = (indices: number[]) => {
        ctx.beginPath();
        if (pts[indices[0]]) {
          ctx.moveTo(pts[indices[0]].x, pts[indices[0]].y);
          for (let i = 1; i < indices.length; i++) {
            if (pts[indices[i]]) ctx.lineTo(pts[indices[i]].x, pts[indices[i]].y);
          }
          ctx.closePath();
          ctx.fill();
        }
      };
      drawBrow(LEFT_EYEBROW_INDICES);
      drawBrow(RIGHT_EYEBROW_INDICES);
      ctx.restore();
    }
  }

  /**
   * Applies color grading specifically to the face/skin region
   */
  private static applyFaceColorGrading(ctx: CanvasRenderingContext2D, pts: Point2D[], bv: BeautyValues) {
    if (bv.faceWarmth === 0 && bv.faceSaturation === 0 && bv.faceContrast === 0 && bv.faceBrightness === 0) return;

    const w = ctx.canvas.width;
    const h = ctx.canvas.height;

    // Create a temporary canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw original onto temp canvas with filters
    const saturate = 100 + bv.faceSaturation;
    const contrast = 100 + bv.faceContrast;
    const brightness = 100 + bv.faceBrightness;
    
    tempCtx.filter = `saturate(${saturate}%) contrast(${contrast}%) brightness(${brightness}%)`;
    tempCtx.drawImage(ctx.canvas, 0, 0);
    tempCtx.filter = 'none';

    // Warmth Overlay on temp canvas
    if (bv.faceWarmth !== 0) {
      tempCtx.save();
      tempCtx.fillStyle = bv.faceWarmth > 0 ? '#ff8c00' : '#0066ff';
      tempCtx.globalCompositeOperation = bv.faceWarmth > 0 ? 'overlay' : 'soft-light';
      tempCtx.globalAlpha = Math.abs(bv.faceWarmth) * 0.003;
      tempCtx.fillRect(0, 0, w, h);
      tempCtx.restore();
    }

    // Tint Overlay on temp canvas
    if (bv.faceTint !== 0) {
      tempCtx.save();
      tempCtx.fillStyle = bv.faceTint > 0 ? '#ff00ff' : '#00ff00';
      tempCtx.globalCompositeOperation = bv.faceTint > 0 ? 'overlay' : 'soft-light';
      tempCtx.globalAlpha = Math.abs(bv.faceTint) * 0.002;
      tempCtx.fillRect(0, 0, w, h);
      tempCtx.restore();
    }

    ctx.save();
    ctx.beginPath();
    
    // Face outline with FOREHEAD EXTRAPOLATION
    if (pts[152] && pts[10] && pts[109] && pts[338]) {
      const chin = pts[152];
      const top = pts[10];
      const faceH = Math.hypot(top.x - chin.x, top.y - chin.y);
      const extDist = faceH * 0.22; // Extend forehead upwards by 22%
      
      const ux = (top.x - chin.x) / faceH;
      const uy = (top.y - chin.y) / faceH;
      
      const extTop = { x: top.x + ux * extDist, y: top.y + uy * extDist };
      const leftPt = pts[109];
      const rightPt = pts[338];
      const extLeft = { x: leftPt.x + ux * extDist * 0.7, y: leftPt.y + uy * extDist * 0.7 };
      const extRight = { x: rightPt.x + ux * extDist * 0.7, y: rightPt.y + uy * extDist * 0.7 };

      ctx.moveTo(pts[JAWLINE_INDICES[1]].x, pts[JAWLINE_INDICES[1]].y);
      for (let i = 2; i < JAWLINE_INDICES.length; i++) {
        if (pts[JAWLINE_INDICES[i]]) ctx.lineTo(pts[JAWLINE_INDICES[i]].x, pts[JAWLINE_INDICES[i]].y);
      }
      ctx.quadraticCurveTo(extLeft.x, extLeft.y, extTop.x, extTop.y);
      ctx.quadraticCurveTo(extRight.x, extRight.y, rightPt.x, rightPt.y);
      ctx.closePath();
    }
    
    // Punch out eyes
    if (pts[LEFT_EYE_INDICES[0]]) {
      ctx.moveTo(pts[LEFT_EYE_INDICES[0]].x, pts[LEFT_EYE_INDICES[0]].y);
      for (let i = 1; i < LEFT_EYE_INDICES.length; i++) {
        if (pts[LEFT_EYE_INDICES[i]]) ctx.lineTo(pts[LEFT_EYE_INDICES[i]].x, pts[LEFT_EYE_INDICES[i]].y);
      }
      ctx.closePath();
    }
    if (pts[RIGHT_EYE_INDICES[0]]) {
      ctx.moveTo(pts[RIGHT_EYE_INDICES[0]].x, pts[RIGHT_EYE_INDICES[0]].y);
      for (let i = 1; i < RIGHT_EYE_INDICES.length; i++) {
        if (pts[RIGHT_EYE_INDICES[i]]) ctx.lineTo(pts[RIGHT_EYE_INDICES[i]].x, pts[RIGHT_EYE_INDICES[i]].y);
      }
      ctx.closePath();
    }
    
    // Punch out mouth
    if (pts[LIPS_OUTER_INDICES[0]]) {
      ctx.moveTo(pts[LIPS_OUTER_INDICES[0]].x, pts[LIPS_OUTER_INDICES[0]].y);
      for (let i = 1; i < LIPS_OUTER_INDICES.length; i++) {
        if (pts[LIPS_OUTER_INDICES[i]]) ctx.lineTo(pts[LIPS_OUTER_INDICES[i]].x, pts[LIPS_OUTER_INDICES[i]].y);
      }
      ctx.closePath();
    }
    
    // Clip the region
    ctx.clip("evenodd");

    // Replace the skin pixels with the filtered canvas
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tempCanvas, 0, 0);

    ctx.restore();
  }
}

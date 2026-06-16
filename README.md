# 🎨 SnapBeauty Studio

SnapBeauty Studio is a professional-grade, AI-powered web application for real-time video beauty enhancements, digital makeup application, and facial color grading. Built with a modern React stack, it leverages state-of-the-art WebAssembly AI models to run entirely in the browser, ensuring complete user privacy and zero server-side rendering latency.

## ✨ Features

### 🤖 Dual AI Engine Tracking
*   **468-Point FaceMesh**: Uses Google's MediaPipe Face Landmarker model running on WebGL/WASM to track complex facial geometry at 60 FPS.
*   **Semantic Segmentation**: Integrates a background and selfie segmentation model to accurately map the hairline, face, and background, allowing for pristine, edge-perfect masking.
*   **Procedural Geometry Extrapolation**: Intelligently expands the AI tracking bounds beyond the standard FaceMesh constraints to encompass the upper forehead organically.

### 💄 Digital Makeup Suite
A comprehensive suite of customizable procedural cosmetic overlays mapped directly to 3D facial topography:
*   **Lip Enhancements**: Plumpness, lip definition mapping, and tinting with dynamic texture finishes (Matte, Sheen, High-Gloss Specular Highlights).
*   **Eyes & Lashes**: Procedurally generated 2D mascara lashes, bezier-mapped eyeshadow, and crisp eyeliner strokes.
*   **Face Contouring**: Blush gradients mapped to the cheekbones and depth contouring along the jaw and nose bridge.
*   **Eyebrows**: Shape filling, defining, and custom tinting.

### 🧖‍♀️ Skin & Feature Retouching
*   **Skin Smoothing**: Dynamic gaussian blur masking with acne and shine reduction.
*   **Geometry Sculpting**: Slimmer jawlines, plumper lips, and nose refinement using high-performance 2D slice-warping to physically alter geometry on the canvas.
*   **Brightening**: Teeth whitening and eye sclera brightening masks.

### 🎥 Hardware-Accelerated Exporting
*   Exports high-fidelity video directly from the browser using the native `MediaRecorder` API.
*   Supports dynamic canvas resizing to match source video resolution (up to **4K**).
*   Configurable bitrate scaling up to **80 Mbps** using GPU-hardware encoders (`h264`, `vp8`) for maximum quality without AI CPU starvation.

### 💾 Custom Presets Engine
*   Save your exact mix of makeup, geometry modifications, and color grades as a Custom Preset.
*   Persisted to LocalStorage for instant recall across sessions.

## 🚀 Tech Stack

*   **Frontend Framework**: React 18 with Vite
*   **Styling**: TailwindCSS
*   **Icons**: Lucide React
*   **AI Backend**: `@mediapipe/tasks-vision` (WebAssembly / WebGL Delegate)
*   **Rendering Pipeline**: HTML5 `<canvas>` API with complex composite operations and pixel manipulation.

## 🛠️ Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RebReborn/snapBeauty-Studio.git
   cd snapBeauty-Studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Build for production:**
   ```bash
   npm run build
   ```

## 🔒 Privacy First
Unlike traditional cloud-based rendering solutions, SnapBeauty Studio runs **100% locally** in the user's browser. No video frames are ever uploaded to a server for processing, guaranteeing total user privacy.

---
*Built with ❤️ for creators.*

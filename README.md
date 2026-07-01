# 🎨 SnapBeauty Studio (Beta)

SnapBeauty Studio is a professional-grade, AI-powered web application for real-time video beauty enhancements, digital makeup application, and facial color grading. Built with a modern React stack, it leverages state-of-the-art WebAssembly AI models and WebCodecs to run entirely in the browser, ensuring complete user privacy and zero server-side rendering latency.

## ✨ Features

### 🤖 Core AI Engines
*   **468-Point FaceMesh**: Uses Google's MediaPipe Face Landmarker model running on WebGL/WASM to track complex facial geometry at 60 FPS.
*   **Semantic Background Segmentation**: Integrates a background and selfie segmentation model to accurately map the hairline, face, and background, allowing for pristine, edge-perfect masking.
*   **Lucid Temporal Engine**: A custom spatial-temporal processing layer that stabilizes video noise, recovers compression artifacts, and performs 3x3 high-fidelity convolution sharpening across sequential video frames.

### 🧖‍♀️ Skin & Feature Retouching
*   **Skin Smoothing**: Dynamic gaussian blur masking with acne and shine reduction.
*   **Chroma-Key Body Retouching**: Hardware-accelerated color-key isolation to dynamically detect, mask, and smooth the subject's body skin independently of the face and clothes.
*   **Geometry Sculpting**: Slimmer jawlines, plumper lips, and nose refinement using high-performance 2D slice-warping to physically alter geometry on the canvas.
*   **Brightening**: Teeth whitening and eye sclera brightening masks.

### 🎞️ Cinematic & Temporal Filtering
*   **Temporal Noise Reduction**: Multi-frame sampling to stabilize sensor noise and revert video compression artifacts without introducing ghosting.
*   **Spatial Convolution**: High-fidelity 3x3 sharpening kernels and anti-aliasing passes to recover lost details.
*   **Dehalo & Texture Recovery**: Edge brightness damping combined with unaltered source-interpolation to maintain natural skin textures.
*   **Film Grain**: Procedural sensor grain generation for an authentic, cinematic finish.

### 📷 G7X Signature Aesthetic
*   **Flash Simulation**: Simulates the iconic "G7X Flash" look with dynamic subject contrasting and highlight blooming.
*   **Background Dimming**: Applies inverse-square law approximations to isolate the subject from the background using the Semantic Segmentation mask.
*   **Film Grain & Color Shift**: Emulates authentic camera sensor noise and cool-shadow filmic color grades.

### 💄 Digital Makeup Suite
A comprehensive suite of customizable procedural cosmetic overlays mapped directly to 3D facial topography:
*   **Lip Enhancements**: Plumpness, lip definition mapping, and tinting with dynamic texture finishes (Matte, Sheen, High-Gloss Specular Highlights).
*   **Eyes & Lashes**: Procedurally generated 2D mascara lashes, bezier-mapped eyeshadow, and crisp eyeliner strokes.
*   **Face Contouring**: Blush gradients mapped to the cheekbones and depth contouring along the jaw and nose bridge.

### 🎥 Deterministic WebCodecs Exporting
*   Exports perfectly stable, high-fidelity `H264` MP4 video directly from the browser using the native `WebCodecs API` and `mp4-muxer`.
*   Uses a fully deterministic rendering loop that pauses the video decoder frame-by-frame, ensuring zero frame drops regardless of AI processing time.
*   Synchronously encodes standard `AAC` audio streams extracted directly from the video buffer.

### 💾 Custom Presets & Global Marketplace
*   Save your exact mix of makeup, geometry modifications, and color grades as a Custom Preset to your local workspace.
*   Publish your creations to the Global Marketplace to share with other creators via Firebase Firestore.

## 🚀 Tech Stack

*   **Frontend Framework**: React 18 with Vite
*   **Styling**: TailwindCSS
*   **Icons**: Lucide React
*   **AI Backend**: `@mediapipe/tasks-vision` (WebAssembly / WebGL Delegate)
*   **Rendering Pipeline**: HTML5 `<canvas>` API with custom convolution filters
*   **Video Encoding**: `WebCodecs API` & `mp4-muxer`
*   **Backend & Hosting**: Google Firebase (Firestore, Auth, Hosting)

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

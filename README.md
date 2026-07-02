# SnapBeauty Studio

SnapBeauty Studio is a professional-grade, AI-powered web application for real-time video beauty enhancements, digital makeup application, and facial color grading. Built with a modern React stack, it leverages state-of-the-art WebAssembly AI models, the WebCodecs API, and GPU-accelerated rendering pipelines to run entirely in-browser, ensuring complete user privacy and zero server-side latency.

## Key Features

### Core AI Engine
* **468-Point FaceMesh**: Utilizes Google MediaPipe Face Landmarker models executing on WebGL/WASM delegates to track facial geometry at 60 FPS.
* **Semantic Background Segmentation**: Integrates selfie and background segmentation masks to separate the subject from their surroundings with edge-accurate masking.
* **Lucid Detail & Clarity Engine**: A custom spatial-temporal processing pipeline designed to stabilize sensor noise, reduce compression artifacts, and perform high-fidelity sharpening passes.

### Retouching and Sculpting
* **Skin Retouching**: Dynamic skin smoothing utilizing adaptive Gaussian blur masks combined with acne and shine reduction.
* **Chroma-Key Body Smoothing**: Hardware-accelerated color-key isolation to dynamically smooth subject body skin independently of facial details or clothing.
* **Facial Sculpting**: Performs physical geometry alterations (jawline slimming, eye enlargement, lip plumping, and nose bridge resizing) using real-time 2D slice-warping algorithms.
* **Feature Brightening**: Sclera (eye) and teeth brightening masks dynamically tracked to the facial landmarks.

### Digital Makeup Suite
Procedural cosmetic overlays mapped onto 3D facial topography:
* **Lip Enhancements**: Plumpness adjustments, definition rendering, and color tinting with selectable finishes including Matte, Sheen, and High-Gloss Specular Highlights.
* **Eye Styling**: Procedural mascara lashes, Bezier-mapped eyeshadow gradients, and crisp eyeliner strokes.
* **Face Contour & Blush**: Cheekbone blush gradients and jaw/nose bridge depth contouring.

### Timeline Editing Suite
* **Frame-Accurate Seek Sync Loop**: Synchronizes timeline playhead offsets precisely with the source video's frames to avoid decoding lag.
* **Non-Destructive Splitting**: Instantly cuts clips at the playhead without re-encoding, modifying timeline structures dynamically.
* **Trim and Delete Controls**: Supports left/right edge trimming, clip deletions, and ripple deletes to automatically close timeline gaps.
* **Dip-to-Black Transitions**: Supports automatic parabolic fade-to-black transitions at clip boundaries.

### Cinematic Tones & LUT Filters
* **Color Grading**: Global controls for exposure, contrast, highlights, shadows, temperature, tint, and vibrance.
* **Cinematic LUT Tones**: Pre-compiled Lookup Table overlays including:
  * **Teal & Orange**: Classic Hollywood cinematic contrast.
  * **Retro Vintage**: Nostalgic film aesthetics.
  * **Cyberpunk Neon**: High-contrast violet and cyan tones.
  * **Warm Sunset**: Warm golden highlights.
  * **Noir Monochrome**: Deep, high-contrast grayscale.

### Deterministic WebCodecs Exporting
* Compiles timeline sequences into high-quality H.264 MP4 videos directly in the browser via the WebCodecs API and `mp4-muxer`.
* Operates on a deterministic rendering loop that processes frame-by-frame, ensuring zero frame drops regardless of CPU/GPU processing loads.
* Demuxes and encodes standard AAC audio tracks synced with the exported video timeline.

### Preset Templates and Community Marketplace
* **Personal Presets**: Save custom slider configurations locally and sync them to Firestore for cross-session access.
* **Community Marketplace**: Publish custom presets to the community store. Users can download published lenses, which instantly saves them to their account presets.

### Keyboard Shortcuts
* `Space`: Toggle play/pause playback.
* `C` / `c`: Split active clip at playhead position.
* `Delete` / `Backspace`: Remove currently selected clip.
* `ArrowLeft` / `ArrowRight`: Nudge playhead frame-by-frame (+/- 1/30s).
* `Ctrl + Z` / `Ctrl + Y`: Undo/Redo edits.
* `H` / `h`: Toggle keyboard shortcuts guide panel.

## Technical Architecture & Setup

### Technology Stack
* **Framework**: React 18 with Vite
* **Styling**: TailwindCSS & Custom CSS
* **Database & Authentication**: Firebase Auth and Firestore
* **AI Processing**: `@mediapipe/tasks-vision`
* **Video Muxing**: `mp4-muxer` & `web-demuxer`

### Getting Started

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

4. **Compile the production build:**
   ```bash
   npm run build
   ```

5. **Deploy security rules and build to Firebase:**
   ```bash
   npx firebase deploy
   ```

## Privacy & Security

SnapBeauty Studio executes all media decoding, AI processing, and encoding locally on the client's machine. No video files or frames are uploaded to external servers, providing an inherently secure and private editing environment.

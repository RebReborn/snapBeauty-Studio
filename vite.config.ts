import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    port: 5174,
  },

  optimizeDeps: {
    // onnxruntime-web self-manages its WASM files — don't let Vite rewrite imports
    exclude: ['onnxruntime-web'],
  },

  // Ensure .wasm files are served with the correct MIME type
  assetsInclude: ['**/*.wasm'],
})

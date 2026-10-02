import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Heavy libraries get their own long-cached chunks, loaded only by the pages that need them.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          three: ["three"],
          "face-api": ["face-api.js"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:5004", changeOrigin: true },
      "/uploads": { target: "http://localhost:5004", changeOrigin: true },
    },
  },
});

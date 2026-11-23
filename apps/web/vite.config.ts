import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import entranceHtml from "./entrance-html";
export default defineConfig({
  plugins: [react(), entranceHtml()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:3001" },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          terminal: ["@xterm/xterm", "@xterm/addon-fit"],
        },
      },
    },
  },
});

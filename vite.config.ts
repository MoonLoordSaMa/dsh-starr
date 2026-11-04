import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "./",
  plugins: [react()],
  root: "webui",
  build: { outDir: "../dist", emptyOutDir: true, chunkSizeWarningLimit: 650 },
  server: { proxy: { "/api": "http://127.0.0.1:17841" } },
});

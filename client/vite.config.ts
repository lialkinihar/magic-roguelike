import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

/** Игра открыта с того же хоста/порта, что и Vite → WS и save-status проксируются на [`GAME_WS_URL`] сервера (по умолчанию :3333). */
const gameBackendProxy = {
  "/game-ws": {
    target: "http://127.0.0.1:3333",
    changeOrigin: true,
    ws: true,
    rewrite: () => "/",
  },
  "/save-status": {
    target: "http://127.0.0.1:3333",
    changeOrigin: true,
  },
} as const;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@magic-roguelike/shared": path.resolve(dir, "../shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    proxy: { ...gameBackendProxy },
    fs: {
      allow: [dir, path.resolve(dir, "..")],
    },
  },
  preview: {
    proxy: { ...gameBackendProxy },
  },
});

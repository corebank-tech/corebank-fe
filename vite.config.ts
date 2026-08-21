/// <reference types="vitest/config" />

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // 로컬 백엔드에 CORS 설정이 없어서, 같은 오리진처럼 보이도록 프록시로 우회한다.
    proxy: {
      "/api/v1": "http://localhost:8080",
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/shared/lib/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
})

/// <reference types="vitest/config" />

import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { fileURLToPath } from "node:url"

/**
 * 프록시가 요청을 넘길 백엔드. 로컬 백엔드가 기본이다.
 * VITE_ 접두사를 쓰지 않는다 — 이 값은 vite.config(Node)에서만 읽고 브라우저로 나가지 않는다.
 */
const API_PROXY_TARGET = process.env.API_PROXY_TARGET ?? "http://localhost:8080"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    // 로컬 백엔드에 CORS 설정이 없어서, 같은 오리진처럼 보이도록 프록시로 우회한다.
    //
    // API_PROXY_TARGET 으로 배포된 서버를 가리킬 수도 있다. 서버 CORS 허용 오리진은
    // www.corebank.cloud 하나라 브라우저에서 직접 부르면 403 인데, 프록시는 Node 가
    // 서버 대 서버로 부르므로 CORS 를 타지 않는다. 다만 그대로는 두 군데서 막힌다:
    //   - Origin 헤더를 그대로 넘기면 서버 CORS 필터가 403 Invalid CORS request 로 막는다
    //   - XSRF-TOKEN 이 Domain=corebank.cloud 로 내려와 localhost 가 저장하지 못한다
    // 아래 removeHeader·cookieDomainRewrite 가 그 둘을 처리한다.
    //
    //   API_PROXY_TARGET=https://api.corebank.cloud pnpm dev
    proxy: {
      "/api/v1": {
        target: API_PROXY_TARGET,
        changeOrigin: true,
        // Domain 속성을 지워 host-only 쿠키로 만든다. 이게 없으면 customFetch 가
        // document.cookie 에서 CSRF 토큰을 못 읽어 상태변경 요청이 CMN0102 로 막힌다.
        cookieDomainRewrite: "",
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // 서버는 Origin 이 허용목록에 없으면 403 이고, 아예 없으면 CORS 검사를 하지 않는다.
            proxyReq.removeHeader("origin")
          })
        },
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./src/shared/lib/test-setup.ts"],
    // 셋업 파일의 `afterEach(cleanup)` 이 각 테스트 파일의 뒷정리보다 **나중에** 돌아야
    // 한다. 기본값 `parallel` 은 같은 그룹의 훅을 동시에 돌려 순서를 보장하지 않는다.
    // `stack` 은 등록 역순이라, 먼저 등록되는 셋업 훅이 마지막에 선다.
    sequence: { hooks: "stack" },
    include: ["src/**/*.test.{ts,tsx}"],
  },
})

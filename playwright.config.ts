import { defineConfig } from "@playwright/test"

const DEV_SERVER_PORT = 5173
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: DEV_SERVER_URL,
    trace: "on-first-retry",
  },
  webServer: {
    // 로그인이 서버 API 라 mock 없이는 e2e 가 실서버 세션을 요구한다.
    // POL-003(5회 연속 실패 시 잠금) 때문에 실계정을 쓰면 CI 가 계정을 잠글 수 있다.
    //
    // VITE_API_BASE_URL 은 .env 에서 오는데 그 파일은 커밋하지 않는다. 없으면
    // 요청 URL 이 "undefined/auth/login" 이 돼 MSW 가 가로채지 못하므로 여기서 못박는다.
    command: "VITE_ENABLE_MSW=true VITE_API_BASE_URL=/api/v1 pnpm dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
  },
})

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
    command: "pnpm dev",
    url: DEV_SERVER_URL,
    reuseExistingServer: !process.env.CI,
  },
})

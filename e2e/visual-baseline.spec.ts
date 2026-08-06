import { expect, test, type Page } from "@playwright/test"

/**
 * 렌더 불변 검증용 스크린샷 베이스라인.
 *
 * 하드코딩 정리·토큰 배선(globals.css)·공통 컴포넌트 추출 작업 전반에서
 * "겉보기 렌더 결과를 바꾸지 않는다"는 약속을 육안이 아니라 픽셀 diff로 증명하기 위한 것이다.
 * 라이트/다크 테마 × 대표 아키타입 5종(조회 그리드·스텝 폼·모달·대시보드·상품 카드)을 찍는다.
 *
 * 실행: `pnpm exec playwright test e2e/visual-baseline.spec.ts --update-snapshots` (베이스라인 갱신)
 *       `pnpm exec playwright test e2e/visual-baseline.spec.ts` (베이스라인과 diff 비교)
 *
 * 의도된 시각 변경(보더 색상 버그 수정 등)이 있는 커밋 직후에만 `--update-snapshots`로 재베이스라인한다.
 */

const CREDENTIALS = { userId: "honggildong", password: "Passw0rd!" }

async function login(page: Page) {
  await page.goto("/")
  await page.getByLabel("이용자ID").fill(CREDENTIALS.userId)
  await page.getByLabel("비밀번호").fill(CREDENTIALS.password)
  await page.getByRole("button", { name: "로그인" }).click()
  await page.waitForURL("**/dashboard")
}

/**
 * 세션 상태가 React 메모리(useState)에만 있고 localStorage 등에 영속화되지 않으므로
 * `page.goto(path)`로 이동하면 풀 리로드가 일어나 로그인 상태가 초기화된다.
 * React Router의 BrowserRouter는 popstate 이벤트로 주소 변경을 감지하므로
 * pushState + popstate 디스패치로 클라이언트 사이드 내비게이션을 흉내낸다.
 */
async function navigate(page: Page, path: string) {
  await page.evaluate((p) => {
    window.history.pushState({}, "", p)
    window.dispatchEvent(new PopStateEvent("popstate"))
  }, path)
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t)
    localStorage.setItem("corebank-theme", t)
  }, theme)
}

type Scenario = {
  name: string
  path: string
  ready: (page: Page) => Promise<unknown>
}

const SCENARIOS: Scenario[] = [
  {
    name: "dashboard",
    path: "/dashboard",
    ready: (page) =>
      page
        .getByRole("heading", { name: /메인|대시보드/ })
        .first()
        .waitFor(),
  },
  {
    name: "query-grid",
    path: "/accounts",
    ready: (page) => page.locator("table").first().waitFor(),
  },
  {
    name: "step-form",
    path: "/transfer/reservation/new",
    ready: (page) => page.getByRole("heading", { name: "예약이체" }).waitFor(),
  },
  {
    name: "product-card",
    path: "/products",
    ready: (page) => page.locator("[class*='rounded']").first().waitFor(),
  },
  {
    name: "modal",
    path: "/design-system",
    ready: async (page) => {
      await page.getByRole("button", { name: "조합" }).click()
      await page.getByRole("button", { name: "확인 다이얼로그 (A-91)" }).click()
      await page.getByRole("dialog").waitFor()
    },
  },
]

for (const scenario of SCENARIOS) {
  for (const theme of ["light", "dark"] as const) {
    test(`${scenario.name} — ${theme}`, async ({ page }) => {
      await login(page)
      await setTheme(page, theme)
      await navigate(page, scenario.path)
      await scenario.ready(page)
      await page.waitForTimeout(200)
      await expect(page).toHaveScreenshot(`${scenario.name}-${theme}.png`, {
        fullPage: true,
        animations: "disabled",
        // 헤더의 세션 잔여시간(mm:ss)이 매초 바뀌어 캡처 안정화를 막으므로 마스킹한다.
        // 개발 메뉴 버튼(App.tsx DevNav, 디자인시스템 비포함 dev 전용 UI)과 헤더 테마
        // 토글 버튼 주변에서 브라우저/OS 오버레이가 간헐적으로 겹쳐 찍혀 플레이키해지므로
        // 함께 마스킹한다(앱 코드에는 해당 위치에 그런 요소가 없음 — 환경 아티팩트).
        mask: [
          page.getByText(/^\d{2}:\d{2}$/),
          page.getByRole("button", { name: "개발 메뉴" }),
          page.getByRole("button", { name: /(다크|라이트) 모드로 전환/ }),
        ],
      })
    })
  }
}

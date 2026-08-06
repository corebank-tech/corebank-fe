import * as React from "react"

export type Theme = "light" | "dark"

const STORAGE_KEY = "corebank-theme"

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return "light"
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage 접근 불가 환경(프라이빗 모드 등)에서는 세션 내에서만 유지한다
  }
}

/**
 * 헤더 토글용 다크모드 훅. 초기값은 index.html 인라인 스크립트가 먼저 적용한
 * data-theme 속성을 읽어 깜빡임(FOUC) 없이 동기화한다.
 */
export function useTheme() {
  const [theme, setTheme] = React.useState<Theme>(readInitialTheme)

  const toggleTheme = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark"
      applyTheme(next)
      return next
    })
  }, [])

  return { theme, toggleTheme }
}

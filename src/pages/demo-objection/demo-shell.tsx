import { useEffect, useState, type ReactNode } from "react"
import { NavLink, useLocation } from "react-router"
import { SERIES_CSS } from "@/pages/demo-objection/chart-colors"
import { ADMIN_NAV, type AdminNavGroup } from "@/shared/config/admin-nav"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"

/** 이 시연이 들어갈 메뉴 그룹 — 실제 구현에서는 `admin-nav.ts` 에 추가한다. */
const DEMO_GROUP: AdminNavGroup = {
  title: "이상거래 사후 심사",
  items: [
    { label: "지급정지 이의제기 심사", path: "/demo/objection" },
    { label: "심사 성과", path: "/demo/objection/kpi" },
  ],
}

/**
 * 시연용 관리자 셸. `widgets/admin-shell` 의 `AdminShell` 과 같은 마크업이다.
 * 세션 없이 뜨도록 계정·세션 시계만 고정값으로 둔다(프로토타입 전용).
 */
export const DemoShell = ({
  title,
  children,
  defaultWide = false,
}: {
  title: string
  children: ReactNode
  /** 처음부터 사이드 메뉴를 접어 둔다(AI 분석 진행 화면) */
  defaultWide?: boolean
}) => {
  // 화면 넓게: 사이드 네비를 접어 발표 화면 폭을 넓힌다. F 키로도 켜고 끈다.
  const [wide, setWide] = useState(defaultWide)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return
      if (e.key === "f" || e.key === "F") setWide((v) => !v)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const groups = [...ADMIN_NAV, DEMO_GROUP]
  const { pathname } = useLocation()
  // 목록 메뉴는 상세(/demo/objection/:id)에서도 켜고, 성과 화면에서는 끈다
  const activeFor = (path: string, isActive: boolean) =>
    path === "/demo/objection"
      ? pathname.startsWith(path) && !pathname.endsWith("/kpi")
      : isActive

  return (
    <div className="flex min-h-screen bg-surface-2">
      {/* 개발 메뉴 버튼(DevNav)은 시연 화면에서 가린다 */}
      <style>{`${SERIES_CSS} .z-toast.fixed.right-4.bottom-4 { display: none !important; }`}</style>
      <aside
        className={cn(
          "flex w-60 shrink-0 flex-col border-r border-border bg-surface-elevated",
          wide && "hidden",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="text-base font-bold text-ink">CoreBank</span>
          <Badge>관리자</Badge>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-1.5 px-2 text-[13px] font-bold text-ink-faint">
                {group.title}
              </p>
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      end
                      className={({ isActive }) =>
                        cn(
                          "block rounded px-2 py-1.5 text-base",
                          activeFor(item.path, isActive)
                            ? "bg-primary-tint font-bold text-primary"
                            : "text-ink-muted hover:bg-surface-2",
                        )
                      }
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-elevated px-6">
          <h1 className="text-h3 truncate font-bold text-ink">{title}</h1>
          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[13px] text-ink-muted">김심사</span>
            <span className="min-w-[5ch] text-center text-[13px] text-ink-muted tabular-nums">
              29:41
            </span>
            <Button size="sm" variant="secondary">
              연장
            </Button>
            <Badge variant="success">변경 가능</Badge>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setWide((v) => !v)}
            >
              {wide ? "메뉴 보이기" : "화면 넓게"}
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

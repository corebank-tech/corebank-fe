import type * as React from "react"
import { NavLink, useNavigate } from "react-router"
import { useSession } from "@/features/session"
import { ADMIN_NAV } from "@/shared/config/admin-nav"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"

type AdminShellProps = {
  title?: React.ReactNode
  /** 조회 응답의 기준시점(PH-84). 정보계 계열 화면은 이 값 없이 숫자를 그리지 않는다. */
  asOf?: string
  children: React.ReactNode
}

/**
 * 관리자 채널의 셸. 고객용 `PageShell` 과 형제이고 디자인 토큰은 공유하되,
 * 레이아웃 전제가 다르다 — 고정폭(w-320)이 아니라 화면 폭을 쓰고, 텍스트 확대
 * 대신 사이드 네비를 둔다. 관리자 화면은 대부분 넓은 표이기 때문이다.
 */
export const AdminShell = ({ title, asOf, children }: AdminShellProps) => {
  const navigate = useNavigate()
  const { customerName, canModify, isLoggingOut, logout } = useSession()

  const handleLogout = async () => {
    await logout()
    navigate("/admin/login", { replace: true })
  }

  return (
    <div className="flex min-h-screen bg-surface-2">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-elevated">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <span className="text-base font-bold text-ink">CoreBank</span>
          <Badge>관리자</Badge>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          {ADMIN_NAV.map((group) => {
            const items = group.items.filter(
              (item) => !item.requiresModify || canModify,
            )
            if (items.length === 0) return null

            return (
              <div key={group.title} className="mb-4">
                <p className="mb-1.5 px-2 text-[13px] font-bold text-ink-faint">
                  {group.title}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {items.map((item) => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        end
                        className={({ isActive }) =>
                          cn(
                            "block rounded px-2 py-1.5 text-base",
                            isActive
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
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-elevated px-6">
          <div className="flex min-w-0 items-center gap-2">
            {title != null && (
              <h1 className="text-h3 truncate font-bold text-ink">{title}</h1>
            )}
            {asOf != null && (
              <span className="shrink-0 text-[13px] text-ink-faint">
                기준 {asOf}
              </span>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[13px] text-ink-muted">{customerName}</span>
            {/* 조회 전용 관리자에게 자기 권한을 계속 보이게 둔다 — 왜 버튼이
                없는지 화면에서 설명되지 않으면 결함으로 오인된다. */}
            <Badge variant={canModify ? "success" : "neutral"}>
              {canModify ? "변경 가능" : "조회 전용"}
            </Badge>
            <Button
              size="sm"
              variant="secondary"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              로그아웃
            </Button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

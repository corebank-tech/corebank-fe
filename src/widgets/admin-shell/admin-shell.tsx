import type * as React from "react"
import { NavLink, useNavigate } from "react-router"
import { useSession } from "@/features/session"
import { ADMIN_NAV } from "@/shared/config/admin-nav"
import { formatSessionClock } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"

type AdminShellProps = {
  title?: React.ReactNode
  children: React.ReactNode
}

/**
 * 관리자 채널의 셸. 고객용 `PageShell` 과 형제이고 디자인 토큰은 공유하되,
 * 레이아웃 전제가 다르다 — 고정폭(w-320)이 아니라 화면 폭을 쓰고, 텍스트 확대
 * 대신 사이드 네비를 둔다. 관리자 화면은 대부분 넓은 표이기 때문이다.
 */
export const AdminShell = ({ title, children }: AdminShellProps) => {
  const navigate = useNavigate()
  const {
    customerName,
    canModify,
    isLoggingOut,
    logout,
    remainingSeconds,
    extend,
  } = useSession()

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
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="text-[13px] text-ink-muted">{customerName}</span>

            {/* POL-001 무조작 만료는 채널을 가리지 않는다. 관리자 화면은 표를 놓고
                오래 머무는 작업이라 남은 시간과 연장 수단이 고객 화면보다 더 필요하다
                (REQ-AUTH-030). */}
            {/* 형제 셸(AppHeader)과 같은 방식이다. role 없는 span 의 aria-label 은
                상당수 스크린리더가 무시하고, aria-live 를 꺼 두는 이유는 매초 바뀌는
                숫자를 계속 읽으면 작업을 방해해서다. */}
            <span
              className="min-w-[5ch] text-center text-[13px] text-ink-muted tabular-nums"
              aria-live="off"
            >
              {formatSessionClock(remainingSeconds)}
            </span>
            <Button size="sm" variant="secondary" onClick={extend}>
              연장
            </Button>
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

import * as React from "react"
import { Link } from "react-router"
import { Bell, Menu, Moon, Sun } from "lucide-react"
import { NAV } from "@/shared/config/nav"
import { cn } from "@/shared/lib/utils"
import { useTheme } from "@/shared/lib/theme"
import { IconButton } from "@/shared/ui/icon-button"
import { Button } from "@/shared/ui/button"
import { Divider } from "@/shared/ui/divider"
import { Logo } from "@/shared/ui/logo"

type AppHeaderProps = {
  activeId?: string
  customerName?: string
  unreadCount?: number
  /** 세션 잔여시간(초). 상위(SessionProvider)가 1초 단위로 갱신해 전달한다. */
  remainingSeconds?: number
  /** REQ-CMN-005: 비로그인 상태면 [로그인]만 노출 */
  loggedIn?: boolean
  onExtend?: () => void
  onLogout?: () => void
  onOpenFullMenu?: () => void
  onOpenNotifications?: () => void
}

const formatSession = (seconds: number) => {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

const ICON_BTN_CLASS =
  "border border-border bg-surface-elevated text-ink-muted hover:bg-surface hover:text-ink"

/**
 * REQ-CMN-001/002/003/005 통합 헤더. utility-bar + gnb + breadcrumb-bar의
 * 유틸 영역을 병합한 흰 배경 sticky 헤더. hover 시 2뎁스 드롭다운을 노출한다.
 */
export const AppHeader = ({
  activeId,
  customerName = "홍길동",
  unreadCount = 0,
  remainingSeconds = 0,
  loggedIn = true,
  onExtend,
  onLogout,
  onOpenFullMenu,
  onOpenNotifications,
}: AppHeaderProps) => {
  const [hoverId, setHoverId] = React.useState<string | null>(null)
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const { theme, toggleTheme } = useTheme()

  const open = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setHoverId(id)
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setHoverId(null), 120)
  }

  const activeCategory = NAV.find((c) => c.id === hoverId)

  return (
    <header
      className="sticky top-0 z-header border-b border-border bg-surface-elevated"
      onMouseLeave={scheduleClose}
    >
      <div className="mx-auto flex h-18 w-320 items-stretch justify-between px-4">
        <div className="flex items-stretch">
          <Link to="/" className="flex shrink-0 items-center pr-8">
            <Logo />
          </Link>
          <ul
            className={cn(
              "flex items-stretch gap-[28px]",
              !loggedIn && "hidden",
            )}
          >
            {NAV.map((cat) => {
              const isActive = cat.id === activeId
              return (
                <li key={cat.id} className="flex items-stretch">
                  <a
                    href="#"
                    onMouseEnter={() => open(cat.id)}
                    onFocus={() => open(cat.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center text-lg leading-[1.5] transition-colors",
                      isActive
                        ? "-mb-px border-b-2 border-primary font-heading text-primary"
                        : "font-label text-ink-muted hover:text-primary",
                    )}
                  >
                    {cat.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <IconButton
            onClick={toggleTheme}
            className={ICON_BTN_CLASS}
            aria-label={
              theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"
            }
            aria-pressed={theme === "dark"}
          >
            {theme === "dark" ? (
              <Sun className="h-4.5 w-4.5" aria-hidden="true" />
            ) : (
              <Moon className="h-4.5 w-4.5" aria-hidden="true" />
            )}
          </IconButton>

          {loggedIn ? (
            <>
              <IconButton
                onClick={onOpenNotifications}
                className={cn("relative", ICON_BTN_CLASS)}
                aria-label={`알림 ${unreadCount}건`}
              >
                <Bell className="h-4.5 w-4.5" aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-4 font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </IconButton>

              <span className="text-base text-ink">
                <span className="font-value">{customerName}</span> 님
              </span>

              <span
                className="min-w-[5ch] text-center text-base text-ink-muted"
                aria-live="off"
              >
                {formatSession(remainingSeconds)}
              </span>

              <button
                type="button"
                onClick={onExtend}
                className="text-base text-ink-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                연장
              </button>
              <Divider tone="border-strong" />
              <button
                type="button"
                onClick={onLogout}
                className="text-base text-ink-muted transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                로그아웃
              </button>

              <Button
                variant="secondary"
                size="sm"
                onClick={onOpenFullMenu}
                onMouseEnter={scheduleClose}
              >
                <Menu className="h-4 w-4" aria-hidden="true" />
                전체메뉴
              </Button>
            </>
          ) : (
            <Link
              to="/"
              className="text-base font-label text-ink-muted transition-colors hover:text-primary"
            >
              로그인
            </Link>
          )}
        </div>
      </div>

      {/* 2-depth hover dropdown */}
      {activeCategory && (
        <div
          className="absolute inset-x-0 top-18 z-dropdown bg-surface-elevated shadow-card"
          onMouseEnter={() => open(activeCategory.id)}
          onMouseLeave={scheduleClose}
        >
          <div className="mx-auto w-320 px-4 py-6">
            <div className="grid grid-cols-4 gap-x-8 gap-y-6">
              {activeCategory.groups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-base leading-[1.5] whitespace-nowrap text-ink-faint">
                    {group.title}
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {group.items.map((item) => (
                      <li key={`${item.screenId}-${item.path}`}>
                        <Link
                          to={item.path}
                          data-screen-id={item.screenId}
                          onClick={() => setHoverId(null)}
                          className="inline-block py-0.5 text-lg leading-[1.5] font-label whitespace-nowrap text-ink hover:text-primary hover:underline"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

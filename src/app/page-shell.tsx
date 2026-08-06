import * as React from "react"
import { useNavigate } from "react-router"
import {
  AppHeader,
  BreadcrumbBar,
  Footer,
  FullMenuOverlay,
  PageHeader,
  SideNav,
} from "@/widgets/shell"
import { NoticeBox } from "@/shared/ui/notice-box"
import { cn } from "@/shared/lib/utils"
import { useNotifications } from "@/features/notifications"
import { useSession } from "@/features/session"

type PageShellProps = {
  activeId?: string
  breadcrumb?: string[]
  title?: React.ReactNode
  /** notice items rendered in a NoticeBox at the bottom of the content */
  notice?: React.ReactNode[]
  noticeTitle?: React.ReactNode
  /** hide breadcrumb + page header (e.g. login) */
  bare?: boolean
  children: React.ReactNode
}

/** [텍스트 크기 조절] 클릭 시 순환하는 콘텐츠 확대 배율. */
const TEXT_SCALES = [1, 1.15, 1.3]

export const PageShell = ({
  activeId,
  breadcrumb = ["개인", "이체", "예약이체", "예약이체 등록"],
  title,
  notice,
  noticeTitle,
  bare = false,
  children,
}: PageShellProps) => {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [textScaleIndex, setTextScaleIndex] = React.useState(0)
  const navigate = useNavigate()
  const { isAuthenticated, customerName, remainingSeconds, extend, logout } =
    useSession()
  const { unreadCount } = useNotifications()

  const handleLogout = () => {
    logout()
    navigate("/logout", { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <AppHeader
        activeId={activeId}
        customerName={customerName}
        loggedIn={isAuthenticated}
        remainingSeconds={remainingSeconds}
        unreadCount={unreadCount}
        onExtend={extend}
        onLogout={handleLogout}
        onOpenFullMenu={() => setMenuOpen(true)}
        onOpenNotifications={() => navigate("/notifications")}
      />

      <FullMenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="flex-1">
        <div
          className="mx-auto w-320 px-4 py-10"
          style={{ zoom: TEXT_SCALES[textScaleIndex] }}
        >
          {!bare && <BreadcrumbBar trail={breadcrumb} />}
          <div className="flex">
            {!bare && activeId && <SideNav activeId={activeId} />}
            <div className={cn("min-w-0 flex-1", !bare && activeId && "pl-6")}>
              {!bare && title != null && (
                <PageHeader
                  title={title}
                  textScaleActive={textScaleIndex > 0}
                  onCycleTextScale={() =>
                    setTextScaleIndex((i) => (i + 1) % TEXT_SCALES.length)
                  }
                />
              )}
              {children}
              {notice && notice.length > 0 && (
                <div className="mt-8">
                  <NoticeBox title={noticeTitle} items={notice} />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

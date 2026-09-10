import * as React from "react"
import { Link, useLocation } from "react-router"
import { cn } from "@/shared/lib/utils"

/** 개발용 라우트 목록 — 파트(A~G)별 화면ID 그룹. 디자인 시스템에 포함되지 않는다. */
type DevRoute = {
  screenId: string
  label: string
  path: string
}

const DEV_ROUTES: DevRoute[] = [
  { screenId: "A-01", label: "로그인", path: "/" },
  { screenId: "A-02", label: "회원가입 1단계", path: "/signup?step=1" },
  { screenId: "A-03", label: "회원가입 2단계", path: "/signup?step=2" },
  { screenId: "A-04", label: "회원가입 3단계", path: "/signup?step=3" },
  { screenId: "A-05", label: "회원가입 4단계", path: "/signup?step=4" },
  { screenId: "A-06", label: "회원가입 5단계", path: "/signup?step=5" },
  { screenId: "A-07", label: "아이디 찾기", path: "/find-id" },
  { screenId: "A-08", label: "비밀번호 재설정", path: "/reset-password" },
  { screenId: "A-09", label: "메인 대시보드", path: "/dashboard" },
  { screenId: "A-10", label: "로그아웃 완료", path: "/logout" },

  { screenId: "B-01", label: "전체계좌조회", path: "/accounts" },
  { screenId: "B-02", label: "예금/적금 계좌조회", path: "/accounts/deposits" },
  { screenId: "B-03", label: "거래내역조회", path: "/inquiry" },
  {
    screenId: "B-04",
    label: "계좌비밀번호 변경",
    path: "/user/accounts/password",
  },
  {
    screenId: "B-05",
    label: "출금계좌관리",
    path: "/user/accounts/withdrawal",
  },
  { screenId: "B-06", label: "계좌별명 관리", path: "/user/accounts/alias" },
  { screenId: "B-07", label: "계좌순서 변경", path: "/user/accounts/order" },

  { screenId: "C-01", label: "상품목록", path: "/products" },
  { screenId: "C-02", label: "상품상세", path: "/products/1" },
  { screenId: "C-03", label: "상품가입 1단계", path: "/product/1/join/1" },
  { screenId: "C-04", label: "상품가입 2단계", path: "/product/1/join/2" },
  { screenId: "C-05", label: "상품가입 3단계", path: "/product/1/join/3" },
  { screenId: "C-06", label: "상품가입 4단계", path: "/product/1/join/4" },

  { screenId: "D-01", label: "즉시이체", path: "/instant-transfer" },
  { screenId: "D-04", label: "이체결과조회", path: "/transfer/history" },
  {
    screenId: "D-05",
    label: "이체한도 조회/변경",
    path: "/user/transfer-limit",
  },

  {
    screenId: "E-01",
    label: "예약이체 등록",
    path: "/transfer/reservation/new",
  },
  {
    screenId: "E-04",
    label: "예약이체 조회/취소",
    path: "/transfer/reservation",
  },
  {
    screenId: "E-05",
    label: "예약이체 처리결과 조회",
    path: "/transfer/reservation/history",
  },

  { screenId: "F-01", label: "고객정보 조회/변경", path: "/user/profile" },
  { screenId: "F-02", label: "알림함", path: "/notifications" },

  { screenId: "G-01", label: "자동이체 등록", path: "/transfer/auto/new" },
  {
    screenId: "G-04",
    label: "자동이체 조회/변경/해지",
    path: "/transfer/auto",
  },
  {
    screenId: "G-05",
    label: "자동이체 결과조회",
    path: "/transfer/auto/history",
  },

  { screenId: "DS", label: "디자인 시스템", path: "/design-system" },
]

const DEV_PARTS = ["A", "B", "C", "D", "E", "F", "G", "DS"] as const

export const DevNav = () => {
  const location = useLocation()
  const [open, setOpen] = React.useState(false)

  return (
    <div className="fixed right-4 bottom-4 z-toast">
      {open && (
        <div className="mb-2 max-h-[70vh] w-[720px] overflow-y-auto rounded-lg border bg-white p-4 shadow-lg">
          <div className="grid grid-cols-4 gap-x-6 gap-y-4">
            {DEV_PARTS.map((part) => {
              const routes = DEV_ROUTES.filter(
                (r) => r.screenId.split("-")[0] === part,
              )
              if (routes.length === 0) return null
              return (
                <div key={part}>
                  <p className="mb-1.5 text-[13px] font-bold text-ink-faint">
                    {part}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {routes.map((r) => (
                      <li key={`${r.screenId}-${r.path}`}>
                        <Link
                          to={r.path}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "block text-[13px] leading-snug",
                            location.pathname === r.path
                              ? "font-bold text-primary"
                              : "text-ink-muted hover:text-primary",
                          )}
                        >
                          {r.screenId} {r.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border bg-white px-4 py-1.5 text-base font-bold text-ink-muted shadow-lg hover:bg-surface"
      >
        개발 메뉴
      </button>
    </div>
  )
}

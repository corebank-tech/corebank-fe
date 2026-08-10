import * as React from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { AlertCircle } from "lucide-react"
import { Input } from "@/shared/ui/input"
import { Checkbox } from "@/shared/ui/checkbox"
import { Button } from "@/shared/ui/button"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { useSession } from "@/features/session"
import { LOGIN_MAX_ATTEMPTS as MAX_ATTEMPTS } from "@/shared/config/policy"

type LoginFailure = {
  locked: boolean
  attempts: number
}

export const A01Login = () => {
  const [userId, setUserId] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [failure, setFailure] = React.useState<LoginFailure | null>(null)
  const { login } = useSession()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = login(userId, password)
    if (result.ok) {
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== "/" ? from : "/dashboard", { replace: true })
      return
    }
    setFailure({ locked: result.locked, attempts: result.attempts })
  }

  return (
    <div className="flex flex-col items-center py-10">
      <div className="w-full max-w-[480px]">
        <div className="login-card border border-border-strong bg-surface-elevated p-8 shadow-card">
          <div className="mb-6 text-center">
            <h1 className="text-page font-bold text-ink">로그인</h1>
            <p className="mt-1 text-base text-ink-muted">
              CoreBank 인터넷뱅킹에 오신 것을 환영합니다.
            </p>
          </div>

          {failure && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-md border border-danger bg-danger-tint p-3"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-danger"
                aria-hidden="true"
              />
              {failure.locked ? (
                <p className="text-base text-ink">
                  비밀번호를 5회 연속 잘못 입력해 계정이 잠겼습니다. 잠금 해제는
                  고객센터를 통한 관리자 확인 후에만 가능합니다.
                </p>
              ) : (
                <p className="text-base text-ink">
                  아이디 또는 비밀번호가 올바르지 않습니다.{" "}
                  <span className="font-bold text-danger">
                    ({failure.attempts}/{MAX_ATTEMPTS}회)
                  </span>
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-id"
                className="text-base font-bold text-ink"
              >
                이용자ID
              </label>
              <Input
                id="login-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="아이디를 입력하세요"
                autoComplete="username"
                invalid={!!failure}
              />
              <p className="text-2xs text-ink-muted">
                ※ 아이디·비밀번호 방식만 제공되며, 공동인증서·간편인증은
                지원하지 않습니다.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-pw"
                className="text-base font-bold text-ink"
              >
                비밀번호
              </label>
              <Input
                id="login-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                invalid={!!failure}
              />
              <p className="text-2xs text-ink-muted">
                ※ 비밀번호를 5회 연속 잘못 입력하면 계정이 잠깁니다(관리자 확인
                후 해제 가능).
              </p>
            </div>

            <Checkbox label="아이디 저장" />

            <Button type="submit" size="lg" fullWidth className="mt-1">
              로그인
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-center gap-3 text-base text-ink-muted">
            <Link to="/find-id" className="hover:text-primary hover:underline">
              아이디 찾기
            </Link>
            <span className="text-border-strong" aria-hidden="true">
              |
            </span>
            <Link
              to="/reset-password"
              className="hover:text-primary hover:underline"
            >
              비밀번호 재설정
            </Link>
            <span className="text-border-strong" aria-hidden="true">
              |
            </span>
            <Link to="/signup" className="hover:text-primary hover:underline">
              회원가입
            </Link>
          </div>
        </div>

        <NoticeBoxFooter
          className="mt-8"
          items={[
            "체험용 계정: 아이디 honggildong / 비밀번호 Passw0rd! (Mock 데이터, 실제 인증서버 연동 없음).",
            "보안을 위해 로그인 후 10분간 이용이 없으면 자동으로 로그아웃됩니다(헤더의 [연장]으로 세션을 갱신할 수 있습니다).",
            "비밀번호를 5회 연속 잘못 입력하면 계정이 잠기며, 잠금 해제는 고객센터를 통한 관리자 확인 후에만 가능합니다.",
            "인증서·간편인증·보안카드는 제공하지 않으며, 아이디·비밀번호 방식으로만 로그인할 수 있습니다.",
          ]}
        />
      </div>
    </div>
  )
}

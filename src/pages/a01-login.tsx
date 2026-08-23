import * as React from "react"
import { Link, Navigate, useLocation } from "react-router"
import { AlertCircle } from "lucide-react"
import { Input } from "@/shared/ui/input"
import { Checkbox } from "@/shared/ui/checkbox"
import { Button } from "@/shared/ui/button"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { useSession } from "@/features/session"
import {
  resolveLoginFailure,
  useLoginMutation,
  type LoginFailureReason,
} from "@/entities/auth"
import { isApiError } from "@/shared/api/api-error"
import { LOGIN_MAX_ATTEMPTS as MAX_ATTEMPTS } from "@/shared/config/policy"

const FAILURE_MESSAGE: Record<
  Exclude<LoginFailureReason, "UNKNOWN">,
  string
> = {
  MISMATCH: "아이디 또는 비밀번호가 올바르지 않습니다.",
  LOCKED: `비밀번호를 ${MAX_ATTEMPTS}회 연속 잘못 입력해 계정이 잠겼습니다. 잠금 해제는 고객센터를 통한 관리자 확인 후에만 가능합니다.`,
}

export const A01Login = () => {
  const [userId, setUserId] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [failure, setFailure] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { isAuthenticated, isBootstrapping, setSession } = useSession()
  const loginMutation = useLoginMutation()
  const location = useLocation()

  const from = (location.state as { from?: string } | null)?.from
  const redirectTo = from && from !== "/" ? from : "/dashboard"

  /** 잠금·불일치 안내는 그 입력에 대한 판정이다. 입력이 바뀌면 더 이상 사실이 아니다. */
  const handleUserIdChange = (value: string) => {
    setUserId(value)
    setFailure(null)
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setFailure(null)
  }

  const toFailureMessage = (error: unknown): string => {
    const reason = resolveLoginFailure(error)
    if (reason !== "UNKNOWN") return FAILURE_MESSAGE[reason]
    // 아이디·비밀번호와 무관한 실패(전송 실패·CSRF)는 서버 메시지를 그대로 보여준다.
    return isApiError(error)
      ? error.message
      : "로그인 처리 중 오류가 발생했습니다."
  }

  /**
   * 제출 상태를 mutation 의 isPending 이 아니라 여기서 든다.
   * mutate 의 per-call onSuccess 는 await 되지 않아(mutationObserver), 이어지는
   * 고객정보 조회가 끝나기 전에 버튼이 다시 눌리면 로그인 요청이 두 번 나간다.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFailure(null)
    setIsSubmitting(true)

    try {
      await loginMutation.mutateAsync({ userId, password })
    } catch (error) {
      setFailure(toFailureMessage(error))
      setIsSubmitting(false)
      return
    }

    // 세션 복원과 같은 경로로 고객명을 읽는다. 이동은 아래 isAuthenticated 분기가 한다.
    const restored = await setSession()
    if (!restored) {
      // 서버 세션은 생겼는데 고객정보를 못 읽은 상태다. 조용히 멈추면 사용자에게는
      // 아무 일도 일어나지 않은 화면으로 보인다.
      setFailure(
        "로그인은 처리되었지만 고객정보를 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
      )
      setIsSubmitting(false)
    }
  }

  // 서버 세션 복원 응답 전에는 로그인 여부가 미정이다. 폼을 먼저 그리면 세션이 있는
  // 사용자에게 로그인 화면이 한 번 번쩍였다가 넘어가고, 그 사이에 제출까지 되면
  // 서버가 새 세션을 발급해 상태가 어긋난다. RequireAuth 와 같은 방식으로 미룬다.
  if (isBootstrapping) return null

  // 이미 세션이 있는데 폼을 다시 제출하면 서버가 새 세션을 발급해 상태가 어긋난다.
  if (isAuthenticated) return <Navigate to={redirectTo} replace />

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
              <p className="text-base text-ink">{failure}</p>
            </div>
          )}

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="flex flex-col gap-4"
          >
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
                onChange={(e) => handleUserIdChange(e.target.value)}
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
                onChange={(e) => handlePasswordChange(e.target.value)}
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

            <Button
              type="submit"
              size="lg"
              fullWidth
              className="mt-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? "로그인 중..." : "로그인"}
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
            "회원가입 시 등록한 아이디와 비밀번호로 로그인합니다.",
            "보안을 위해 로그인 후 10분간 이용이 없으면 자동으로 로그아웃됩니다(헤더의 [연장]으로 세션을 갱신할 수 있습니다).",
            "비밀번호를 5회 연속 잘못 입력하면 계정이 잠기며, 잠금 해제는 고객센터를 통한 관리자 확인 후에만 가능합니다.",
            "인증서·간편인증·보안카드는 제공하지 않으며, 아이디·비밀번호 방식으로만 로그인할 수 있습니다.",
          ]}
        />
      </div>
    </div>
  )
}

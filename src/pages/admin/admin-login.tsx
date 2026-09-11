import * as React from "react"
import { useLocation, useNavigate } from "react-router"
import { resolveLoginFailureMessage, useLoginMutation } from "@/entities/auth"
import { useSession } from "@/features/session"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Alert } from "@/shared/ui/alert"

type RedirectState = { from?: string } | null

/**
 * 관리자 로그인. 고객 로그인(A-01)과 화면을 나눈 이유는 도착지가 다르기 때문이다 —
 * 인증 실패로 여기 온 사용자를 고객 메인으로 보내면 원래 가려던 관리자 화면으로
 * 돌아갈 수 없다.
 *
 * 인증 엔드포인트는 현재 고객과 같은 `/auth/login` 을 쓴다. 서버가 관리자 경로를
 * 분리할지 미정이라(BE 요청 문서 참조), 확정되면 이 훅만 바꾼다.
 */
export const AdminLogin = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useSession()
  const login = useLoginMutation()

  const [userId, setUserId] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const from = (location.state as RedirectState)?.from ?? "/admin"

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      await login.mutateAsync({ userId, password })
    } catch (cause) {
      setError(resolveLoginFailureMessage(cause))
      return
    }

    // 세션 복원까지 끝나야 역할이 정해진다. 그 전에 이동하면 RequireRole 이
    // 아직 CUSTOMER 로 보고 403 을 그린다.
    const restored = await setSession()
    if (!restored) {
      setError("로그인 상태를 확인하지 못했습니다. 다시 시도해 주세요.")
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="w-full max-w-100 rounded-lg border border-border bg-surface-elevated p-8"
      >
        <h1 className="text-h3 font-bold text-ink">관리자 로그인</h1>
        <p className="mt-1 text-[13px] text-ink-muted">
          관리자 권한이 있는 계정만 접근할 수 있습니다.
        </p>

        {error != null && (
          <Alert variant="danger" className="mt-4">
            {error}
          </Alert>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-bold text-ink-muted">아이디</span>
            <Input
              value={userId}
              autoComplete="username"
              onChange={(event) => setUserId(event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[13px] font-bold text-ink-muted">
              비밀번호
            </span>
            <Input
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        <Button
          type="submit"
          fullWidth
          className="mt-6"
          disabled={login.isPending || userId === "" || password === ""}
        >
          로그인
        </Button>
      </form>
    </div>
  )
}

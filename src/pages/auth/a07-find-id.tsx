import * as React from "react"
import { Link } from "react-router"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Alert } from "@/shared/ui/alert"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { maskUserId } from "@/shared/lib/format"
import { onlyDigits } from "@/shared/lib/input-filter"
import { ACCOUNT_PASSWORD_ERROR_LIMIT as ERROR_LIMIT } from "@/shared/config/policy"
import { MOCK_MEMBERS, type Member } from "@/entities/auth"

/** A-07 아이디 찾기. REQ-AUTH-032. */
export const A07FindId = () => {
  const [members, setMembers] = React.useState<Member[]>(MOCK_MEMBERS)
  const [name, setName] = React.useState("")
  const [birth, setBirth] = React.useState("")
  const [accountNo, setAccountNo] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [alert, setAlert] = React.useState<string | null>(null)
  const [blocked, setBlocked] = React.useState<string[] | null>(null)
  const [foundId, setFoundId] = React.useState<string | null>(null)

  const handleSearch = () => {
    setFoundId(null)
    if (
      name.trim().length === 0 ||
      birth.length !== 6 ||
      accountNo.length !== 12 ||
      password.length !== 4
    ) {
      setAlert("성명·생년월일·계좌번호·계좌비밀번호를 모두 정확히 입력하세요.")
      return
    }

    const member = members.find((m) => m.accountNo === accountNo)
    if (!member) {
      setAlert("입력하신 정보와 일치하는 회원을 찾을 수 없습니다.")
      return
    }
    if (member.status === "거래정지") {
      setBlocked([
        "누적 오류로 거래정지된 계좌입니다.",
        "영업점 또는 고객센터에서 거래정지 해제 후 다시 시도하세요.",
      ])
      return
    }
    if (member.ownerName !== name.trim() || member.birth !== birth) {
      setAlert("입력하신 정보와 일치하는 회원을 찾을 수 없습니다.")
      return
    }
    if (member.accountPassword !== password) {
      const nextCount = member.errorCount + 1
      const isBlocked = nextCount >= ERROR_LIMIT
      setMembers((prev) =>
        prev.map((m) =>
          m.accountNo === accountNo
            ? {
                ...m,
                errorCount: Math.min(nextCount, ERROR_LIMIT),
                status: isBlocked ? "거래정지" : m.status,
              }
            : m,
        ),
      )
      setPassword("")
      if (isBlocked) {
        setBlocked([
          "계좌비밀번호를 5회 연속 잘못 입력해 이 계좌가 거래정지 상태로 전환되었습니다.",
        ])
      } else {
        setAlert(
          `계좌비밀번호가 일치하지 않습니다. (누적 오류 ${nextCount}/${ERROR_LIMIT}회)`,
        )
      }
      return
    }

    setFoundId(member.memberId)
  }

  return (
    <div className="flex flex-col gap-8">
      {foundId && (
        <Alert variant="success" title="조회 결과">
          회원님의 아이디는{" "}
          <span className="font-bold text-ink">{maskUserId(foundId)}</span>{" "}
          입니다.
        </Alert>
      )}

      <FormSection title="본인확인">
        <div>
          <FormRow label="성명" required htmlFor="findid-name">
            <Input
              id="findid-name"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="생년월일" required htmlFor="findid-birth">
            <Input
              id="findid-birth"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={birth}
              onChange={(e) => setBirth(onlyDigits(e.target.value, 6))}
              placeholder="YYMMDD"
              className="w-40 tracking-2"
            />
          </FormRow>
          <FormRow label="당행 계좌번호" required htmlFor="findid-account">
            <Input
              id="findid-account"
              inputMode="numeric"
              autoComplete="off"
              maxLength={12}
              value={accountNo}
              onChange={(e) => setAccountNo(onlyDigits(e.target.value, 12))}
              placeholder="하이픈 없이 12자리 숫자"
              className="max-w-xs tracking-1"
            />
          </FormRow>
          <FormRow label="계좌비밀번호" required htmlFor="findid-pw">
            <Input
              id="findid-pw"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={4}
              value={password}
              onChange={(e) => setPassword(onlyDigits(e.target.value, 4))}
              className="w-32 text-center tracking-4"
            />
          </FormRow>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="primary"
            size="lg"
            className="min-w-40"
            onClick={handleSearch}
          >
            아이디 찾기
          </Button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-base text-ink-muted">
          <Link
            to="/reset-password"
            className="hover:text-primary hover:underline"
          >
            비밀번호 재설정
          </Link>
          <span className="text-border-strong" aria-hidden="true">
            |
          </span>
          <Link to="/" className="hover:text-primary hover:underline">
            로그인
          </Link>
        </div>
      </FormSection>

      <NoticeBoxFooter
        items={[
          "조회 결과의 아이디는 앞 3자리를 제외한 나머지가 마스킹되어 표시됩니다.",
          "계좌비밀번호를 5회 연속 잘못 입력하면 해당 계좌가 거래정지 상태로 전환됩니다.",
        ]}
      />

      <AlertDialog
        open={alert !== null}
        onClose={() => setAlert(null)}
        title="아이디 찾기"
        messages={alert ? [alert] : []}
      />
      <ErrorDialog
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        title="아이디 찾기 실패"
        messages={blocked ?? []}
      />
    </div>
  )
}

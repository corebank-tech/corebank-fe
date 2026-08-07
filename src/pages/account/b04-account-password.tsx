import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Alert } from "@/shared/ui/alert"
import { Modal } from "@/shared/ui/modal"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { formatAccountNo } from "@/shared/lib/format"
import {
  MOCK_PASSWORD_ACCOUNTS,
  type PasswordAccount,
} from "@/entities/account"
import { ACCOUNT_PASSWORD_ERROR_LIMIT as ERROR_LIMIT } from "@/shared/config/policy"
import { onlyDigits } from "@/shared/lib/input-filter"

const PASSWORD_LIMIT = 4

/** REQ-ACCT-006·007·008: 계좌비밀번호 변경. 대상은 입출금계좌만이며 예적금 계좌는 제외한다. */
export const B04AccountPassword = () => {
  const [accounts, setAccounts] = React.useState(MOCK_PASSWORD_ACCOUNTS)
  const [accountNo, setAccountNo] = React.useState(accounts[0]?.accountNo ?? "")
  const [currentPw, setCurrentPw] = React.useState("")
  const [newPw, setNewPw] = React.useState("")
  const [confirmPw, setConfirmPw] = React.useState("")
  const [fieldError, setFieldError] = React.useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [errorDialog, setErrorDialog] = React.useState<string[] | null>(null)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const account = accounts.find(
    (a) => a.accountNo === accountNo,
  ) as PasswordAccount

  const resetFields = () => {
    setCurrentPw("")
    setNewPw("")
    setConfirmPw("")
    setFieldError(null)
  }

  const handleAccountChange = (next: string) => {
    setAccountNo(next)
    resetFields()
    setSuccessMessage(null)
  }

  const handleSubmitClick = () => {
    setSuccessMessage(null)
    if (currentPw.length !== PASSWORD_LIMIT) {
      setFieldError("현재 비밀번호 4자리를 모두 입력하세요.")
      return
    }
    if (newPw.length !== PASSWORD_LIMIT) {
      setFieldError("신규 비밀번호는 숫자 4자리로 입력하세요.")
      return
    }
    if (newPw !== confirmPw) {
      setFieldError("신규 비밀번호와 신규 비밀번호 확인이 일치하지 않습니다.")
      return
    }
    setFieldError(null)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    if (currentPw !== account.mockPassword) {
      const nextCount = account.errorCount + 1
      const blocked = nextCount >= ERROR_LIMIT
      setAccounts((prev) =>
        prev.map((a) =>
          a.accountNo === accountNo
            ? {
                ...a,
                errorCount: Math.min(nextCount, ERROR_LIMIT),
                status: blocked ? "거래정지" : a.status,
              }
            : a,
        ),
      )
      setErrorDialog(
        blocked
          ? [
              "현재 비밀번호를 5회 연속 잘못 입력해 이 계좌가 거래정지 상태로 전환되었습니다.",
              "거래정지 해제는 영업점 또는 고객센터에서 처리할 수 있습니다.",
            ]
          : [
              "현재 비밀번호가 일치하지 않습니다.",
              `누적 오류 횟수 ${nextCount}회 (5회 도달 시 거래정지 처리됩니다.)`,
            ],
      )
      setCurrentPw("")
      return
    }
    setAccounts((prev) =>
      prev.map((a) =>
        a.accountNo === accountNo
          ? { ...a, errorCount: 0, mockPassword: newPw }
          : a,
      ),
    )
    resetFields()
    setSuccessMessage(
      "계좌비밀번호가 변경되었습니다. 다음 거래부터 신규 비밀번호가 적용됩니다.",
    )
  }

  const blocked = account?.status === "거래정지"

  return (
    <QueryPageLayout
      noticeItems={[
        "계좌비밀번호는 숫자 4자리이며 입출금계좌만 대상입니다. 예금·적금계좌는 계좌비밀번호가 없습니다.",
        "현재 비밀번호를 5회 연속 잘못 입력하면 해당 계좌가 거래정지 상태로 전환됩니다.",
        "정상 입력 시 신규 비밀번호로 즉시 이체가 가능합니다.",
      ]}
      footerItems={[
        "누적 오류 횟수는 계좌비밀번호 검증에 성공하면 0회로 초기화됩니다(REQ-ACCT-007).",
        "계좌비밀번호는 단방향 해시로 저장되어 평문으로 조회하거나 복원할 수 없습니다(REQ-ACCT-009).",
        "[오류횟수 조회] 버튼으로 현재 누적 오류 횟수와 제한 정책(5회)을 확인할 수 있습니다(REQ-ACCT-008).",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirm}
            title="계좌비밀번호 변경"
            messages={[
              "아래 계좌의 비밀번호를 변경합니다.",
              "확인을 누르면 신규 비밀번호로 적용됩니다.",
            ]}
            confirmLabel="변경하기"
            items={[
              {
                label: "대상계좌",
                value: `${account?.alias} / ${formatAccountNo(accountNo)}`,
              },
            ]}
          />

          <ErrorDialog
            open={errorDialog != null}
            onClose={() => setErrorDialog(null)}
            title="비밀번호 변경 실패"
            messages={errorDialog ?? []}
          />

          <Modal
            open={infoOpen}
            onClose={() => setInfoOpen(false)}
            title="오류횟수 조회"
            size="sm"
            footer={
              <Button
                variant="primary"
                size="lg"
                className="min-w-30"
                onClick={() => setInfoOpen(false)}
              >
                확인
              </Button>
            }
          >
            <dl className="flex flex-col gap-2 text-base text-ink">
              <div className="flex justify-between">
                <dt className="font-bold">대상계좌</dt>
                <dd className="font-tabular">
                  {account
                    ? `${account.alias} / ${formatAccountNo(account.accountNo)}`
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">현재 누적 오류 횟수</dt>
                <dd className="font-tabular font-bold text-primary">
                  {account?.errorCount ?? 0}회
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">제한 정책</dt>
                <dd className="font-tabular">5회 도달 시 거래정지</dd>
              </div>
            </dl>
          </Modal>
        </>
      }
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {blocked && (
        <Alert variant="danger" title="거래정지 계좌">
          누적 오류 5회로 거래정지된 계좌입니다. 영업점 또는 고객센터에서 해제
          후 다시 시도하세요.
        </Alert>
      )}

      <FormSection title="계좌비밀번호 변경">
        <div>
          <FormRow
            label="계좌 선택"
            required
            htmlFor="b04-account"
            labelWidth={180}
          >
            <Select
              id="b04-account"
              className="max-w-md"
              value={accountNo}
              onChange={(e) => handleAccountChange(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.accountNo} value={a.accountNo}>
                  {`${a.alias} / ${formatAccountNo(a.accountNo)}`}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow
            label="현재 비밀번호"
            required
            htmlFor="b04-current"
            labelWidth={180}
          >
            <Input
              id="b04-current"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PASSWORD_LIMIT}
              value={currentPw}
              disabled={blocked}
              onChange={(e) =>
                setCurrentPw(onlyDigits(e.target.value, PASSWORD_LIMIT))
              }
              className="w-32 text-center tracking-4"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInfoOpen(true)}
            >
              오류횟수 조회
            </Button>
          </FormRow>
          <FormRow
            label="신규 비밀번호"
            required
            htmlFor="b04-new"
            labelWidth={180}
          >
            <Input
              id="b04-new"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PASSWORD_LIMIT}
              value={newPw}
              disabled={blocked}
              onChange={(e) =>
                setNewPw(onlyDigits(e.target.value, PASSWORD_LIMIT))
              }
              className="w-32 text-center tracking-4"
            />
          </FormRow>
          <FormRow
            label="신규 비밀번호 확인"
            required
            htmlFor="b04-confirm"
            labelWidth={180}
          >
            <Input
              id="b04-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PASSWORD_LIMIT}
              value={confirmPw}
              disabled={blocked}
              onChange={(e) =>
                setConfirmPw(onlyDigits(e.target.value, PASSWORD_LIMIT))
              }
              className="w-32 text-center tracking-4"
            />
          </FormRow>
        </div>

        {fieldError && (
          <p role="alert" className="mt-2 text-base font-bold text-danger">
            {fieldError}
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={resetFields}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            disabled={blocked}
            onClick={handleSubmitClick}
          >
            변경하기
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}

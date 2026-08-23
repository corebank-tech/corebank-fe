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
  useAccountDetailQuery,
  useAccountOverviewQuery,
  useUpdateAccountPasswordMutation,
  useVerifyAccountPasswordMutation,
} from "@/entities/account"
import { ApiError } from "@/shared/api/api-error"
import { ACCOUNT_PASSWORD_ERROR_LIMIT as ERROR_LIMIT } from "@/shared/config/policy"
import { onlyDigits } from "@/shared/lib/input-filter"
import { OtpModal } from "@/entities/auth"

const PASSWORD_LIMIT = 4

/** REQ-ACCT-006·007·008: 계좌비밀번호 변경. 보유 계좌의 계좌비밀번호를 변경한다. */
export const B04AccountPassword = () => {
  const accountOverviewQuery = useAccountOverviewQuery()

  const accounts = React.useMemo(
    () =>
      (accountOverviewQuery.data?.items ?? [])
        .flatMap((group) => group.accounts ?? [])
        .filter(
          (account) =>
            account.accountId != null && account.accountNumber != null,
        ),
    [accountOverviewQuery.data],
  )

  const [accountId, setAccountId] = React.useState<number | null>(null)

  const selectedAccountId =
    accountId != null &&
    accounts.some((account) => account.accountId === accountId)
      ? accountId
      : (accounts[0]?.accountId ?? null)

  const account =
    accounts.find((account) => account.accountId === selectedAccountId) ?? null

  const accountDetailQuery = useAccountDetailQuery(selectedAccountId)
  const verifyPasswordMutation = useVerifyAccountPasswordMutation()
  const updatePasswordMutation = useUpdateAccountPasswordMutation()

  const passwordFailureCount =
    accountDetailQuery.data?.passwordFailureCount ?? 0

  const blocked = accountDetailQuery.data?.passwordLocked ?? false

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
  const [accountPasswordAuthToken, setAccountPasswordAuthToken] =
    React.useState<string | null>(null)
  const [otpOpen, setOtpOpen] = React.useState(false)

  const resetFields = () => {
    setCurrentPw("")
    setNewPw("")
    setConfirmPw("")
    setAccountPasswordAuthToken(null)
    setOtpOpen(false)
    setFieldError(null)
  }

  const handleAccountChange = (next: string) => {
    setAccountId(Number(next))
    resetFields()
    setSuccessMessage(null)
  }

  const handleSubmitClick = () => {
    setSuccessMessage(null)
    setAccountPasswordAuthToken(null)
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

  const handleConfirm = async () => {
    setConfirmOpen(false)

    if (selectedAccountId == null) {
      setErrorDialog(["변경할 계좌를 선택해 주세요."])
      return
    }

    try {
      const response = await verifyPasswordMutation.mutateAsync({
        accountId: selectedAccountId,
        data: {
          accountPassword: currentPw,
        },
      })

      // 현재 비밀번호 평문은 검증이 끝나는 즉시 제거
      setCurrentPw("")

      if (!response.accountPasswordAuthToken) {
        await accountDetailQuery.refetch()

        setErrorDialog([
          "계좌비밀번호 인증 토큰을 발급받지 못했습니다.",
          "다시 시도해 주세요.",
        ])
        return
      }

      setAccountPasswordAuthToken(response.accountPasswordAuthToken)

      await accountDetailQuery.refetch()

      setOtpOpen(true)
    } catch (error) {
      // 실패했어도 입력한 평문 비밀번호는 남겨두지 않는다.
      setCurrentPw("")

      // 비밀번호 실패횟수/잠금 상태를 서버 최신 값으로 다시 조회
      await accountDetailQuery.refetch()

      if (error instanceof ApiError) {
        setErrorDialog([error.message])
        return
      }

      setErrorDialog([
        "계좌비밀번호 확인 중 오류가 발생했습니다.",
        "잠시 후 다시 시도해 주세요.",
      ])
    }
  }

  const handleOtpConfirm = async (otpAuthToken: string) => {
    if (selectedAccountId == null || accountPasswordAuthToken == null) {
      setOtpOpen(false)
      setErrorDialog([
        "비밀번호 변경 인증 정보를 확인할 수 없습니다.",
        "처음부터 다시 시도해 주세요.",
      ])
      resetFields()
      return
    }

    setOtpOpen(false)

    try {
      await updatePasswordMutation.mutateAsync({
        accountId: selectedAccountId,
        data: {
          accountPasswordAuthToken,
          otpAuthToken,
          newAccountPassword: newPw,
          newAccountPasswordConfirm: confirmPw,
        },
      })

      // 인증 토큰과 신규 비밀번호 평문을 즉시 제거
      resetFields()

      // 비밀번호 오류횟수/잠금 상태 및 계좌 목록 최신화
      await Promise.all([
        accountDetailQuery.refetch(),
        accountOverviewQuery.refetch(),
      ])

      setSuccessMessage(
        "계좌비밀번호가 변경되었습니다. 다음 거래부터 신규 비밀번호가 적용됩니다.",
      )
    } catch (error) {
      // 최종 API에서 토큰이 소비됐을 가능성이 있으므로 재사용하지 않는다.
      resetFields()

      await accountDetailQuery.refetch()

      if (error instanceof ApiError) {
        setErrorDialog([error.message])
        return
      }

      setErrorDialog([
        "계좌비밀번호 변경 중 오류가 발생했습니다.",
        "처음부터 다시 시도해 주세요.",
      ])
    }
  }

  const handleOtpClose = () => {
    setOtpOpen(false)
    setAccountPasswordAuthToken(null)
    setCurrentPw("")
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "계좌비밀번호는 숫자 4자리이며 보유 계좌별로 변경할 수 있습니다.",
        "현재 비밀번호를 5회 연속 잘못 입력하면 해당 계좌의 비밀번호가 잠금 처리됩니다.",
        "비밀번호 변경을 위해 현재 계좌비밀번호 확인과 OTP 인증이 필요합니다.",
      ]}
      footerItems={[
        "누적 오류 횟수는 계좌비밀번호 검증에 성공하면 0회로 초기화됩니다(REQ-ACCT-007).",
        "계좌비밀번호는 단방향 해시로 저장되어 평문으로 조회하거나 복원할 수 없습니다(REQ-ACCT-009).",
        "[오류횟수 조회] 버튼으로 현재 누적 오류 횟수와 제한 정책(5회)을 확인할 수 있습니다(REQ-ACCT-008).",
      ]}
      modals={
        <>
          <OtpModal
            open={
              otpOpen &&
              accountPasswordAuthToken != null &&
              selectedAccountId != null
            }
            onClose={handleOtpClose}
            onConfirm={handleOtpConfirm}
            title="계좌비밀번호 변경 OTP 인증"
            guide="계좌비밀번호 변경을 위해 OTP를 발급한 뒤 6자리 번호를 입력하세요."
            transaction={{
              type: "ACCOUNT_PASSWORD_CHANGE",
              data: {
                accountId: selectedAccountId ?? 0,
              },
            }}
          />
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => {
              setConfirmOpen(false)
              setCurrentPw("")
            }}
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
                value: account
                  ? `${account.accountName ?? "계좌"} / ${formatAccountNo(
                      account.accountNumber ?? "",
                    )}`
                  : "-",
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
                <dd>
                  {account
                    ? `${account.accountName ?? "계좌"} / ${formatAccountNo(
                        account.accountNumber ?? "",
                      )}`
                    : "-"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">현재 누적 오류 횟수</dt>
                <dd className="font-bold text-primary">
                  {passwordFailureCount}회
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-bold">제한 정책</dt>
                <dd>{ERROR_LIMIT}회 도달 시 거래정지</dd>
              </div>
            </dl>
          </Modal>
        </>
      }
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {blocked && (
        <Alert variant="danger" title="계좌비밀번호 잠금">
          계좌비밀번호 오류 횟수가 제한에 도달해 비밀번호가 잠금 처리되었습니다.
          영업점 또는 고객센터를 통해 잠금을 해제한 후 다시 시도하세요.
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
              value={selectedAccountId?.toString() ?? ""}
              onChange={(e) => handleAccountChange(e.target.value)}
              disabled={accountOverviewQuery.isLoading || accounts.length === 0}
            >
              {accounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {`${account.accountName ?? "계좌"} / ${formatAccountNo(
                    account.accountNumber ?? "",
                  )}`}
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
            disabled={
              blocked ||
              selectedAccountId == null ||
              verifyPasswordMutation.isPending ||
              updatePasswordMutation.isPending
            }
            onClick={handleSubmitClick}
          >
            변경하기
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}

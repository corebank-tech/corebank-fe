import * as React from "react"
import { Link } from "react-router"
import {
  CLAUSE_LABEL,
  OBJECTION_CLAUSES,
  useReceiveObjection,
  useRegisterPaymentStopCase,
  type ObjectionClause,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { onlyDigits } from "@/shared/lib/input-filter"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Radio } from "@/shared/ui/radio"
import { Textarea } from "@/shared/ui/textarea"

/**
 * ADM-05 지급정지 이의제기 대리 접수 — 사건 등록과 이의제기 접수.
 *
 * 영업점 대리 접수(계획 D34)를 화면에서 돌리기 위한 입력이다. 고객 앱 비대면 접수
 * (PA-20, PA-21)가 생겨도 대리 접수 경로로 남는다.
 *
 * 다이얼로그가 아니라 별도 화면으로 둔다. 두 입력이 순서대로 이어지고(등록이 돌려준
 * 사건 번호로 접수한다) 소명이 길어 다이얼로그에 담기 어렵다. 변경 권한
 * `PAYMENT_STOP_WRITE` 는 라우트가 막는다.
 *
 * 형식 검사(필수 칸, 거래 번호 모양)만 화면이 하고, 업무 규칙(입금 거래인지, 신청
 * 기한, 신분증 사본 확인)은 서버가 판정한다. 서버 문구를 그대로 보인다(REQ-CMN-008).
 */

/** 서버 `RegisterRequest` 의 거래 번호 형식과 건수 상한. */
const TRANSACTION_NUMBER_PATTERN = /^[0-9A-Z]{20}$/
const MAX_DISPUTED_TRANSACTIONS = 20
/** 서버 `ReceiveRequest.statement` 의 `@Size(max = 4000)`. */
const MAX_STATEMENT_LENGTH = 4000
const MAX_ID_DIGITS = 18

/** 줄바꿈, 쉼표, 공백으로 나눠 적은 거래 번호를 목록으로 바꾼다. */
const parseTransactionNumbers = (raw: string): string[] =>
  raw
    .split(/[\s,]+/)
    .map((value) => value.trim().toUpperCase())
    .filter((value) => value !== "")

type RegisterDraft = {
  accountId: string
  transactionNumbers: string
  objectionDeadline: string
}

const EMPTY_REGISTER_DRAFT: RegisterDraft = {
  accountId: "",
  transactionNumbers: "",
  objectionDeadline: "",
}

/** 형식 오류 문구. 없으면 `null` 이다. */
const validateRegisterDraft = (draft: RegisterDraft): string | null => {
  if (draft.accountId === "") return "계좌 ID를 입력하세요."
  const numbers = parseTransactionNumbers(draft.transactionNumbers)
  if (numbers.length === 0) return "다툼 거래 번호를 하나 이상 입력하세요."
  if (numbers.length > MAX_DISPUTED_TRANSACTIONS) {
    return `다툼 거래는 한 사건에 ${MAX_DISPUTED_TRANSACTIONS}건까지 등록할 수 있습니다.`
  }
  const malformed = numbers.filter(
    (number) => !TRANSACTION_NUMBER_PATTERN.test(number),
  )
  if (malformed.length > 0) {
    return `거래 번호는 영문 대문자와 숫자 20자리입니다. 확인할 번호: ${malformed.join(", ")}`
  }
  if (draft.objectionDeadline === "") return "이의제기 신청 기한을 입력하세요."
  return null
}

const RegisterCaseSection = ({
  onRegistered,
}: {
  onRegistered: (caseId: number) => void
}) => {
  const register = useRegisterPaymentStopCase()
  const idempotency = useIdempotencyKey()
  const [draft, setDraft] = React.useState<RegisterDraft>(EMPTY_REGISTER_DRAFT)
  const [inputError, setInputError] = React.useState<string | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [registeredCaseId, setRegisteredCaseId] = React.useState<number | null>(
    null,
  )
  const [isConfirmOpen, setConfirmOpen] = React.useState(false)

  const setField = <K extends keyof RegisterDraft>(
    key: K,
    value: RegisterDraft[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setServerError(null)
    const error = validateRegisterDraft(draft)
    setInputError(error)
    if (error == null) setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    const request = {
      accountId: Number(draft.accountId),
      disputedTransactionNumbers: parseTransactionNumbers(
        draft.transactionNumbers,
      ),
      objectionDeadline: draft.objectionDeadline,
    }
    register.mutate(
      { request, idempotencyKey: idempotency.keyFor(request) },
      {
        onSuccess: (response) => {
          idempotency.reset()
          setDraft(EMPTY_REGISTER_DRAFT)
          setRegisteredCaseId(response.caseId ?? null)
          if (response.caseId != null) onRegistered(response.caseId)
        },
        onError: (error) => setServerError(toErrorMessage(error)),
      },
    )
  }

  return (
    <FormSection title="지급정지 사건 등록" className="mb-0">
      <form onSubmit={handleSubmit} noValidate>
        <FormRow label="계좌 ID" htmlFor="adm-register-account-id" required>
          <Input
            id="adm-register-account-id"
            className="max-w-48"
            inputMode="numeric"
            autoComplete="off"
            value={draft.accountId}
            onChange={(event) =>
              setField(
                "accountId",
                onlyDigits(event.target.value, MAX_ID_DIGITS),
              )
            }
          />
        </FormRow>
        <FormRow
          label="다툼 거래 번호"
          htmlFor="adm-register-transactions"
          required
        >
          <Textarea
            id="adm-register-transactions"
            className="max-w-md font-mono"
            placeholder="한 줄에 하나씩 입력합니다."
            value={draft.transactionNumbers}
            onChange={(event) =>
              setField("transactionNumbers", event.target.value)
            }
          />
          <p className="w-full text-2xs text-ink-muted">
            피해구제 신청을 받은 입금 거래의 번호입니다. 최근 180일 안의 성공한
            입금만 등록됩니다.
          </p>
        </FormRow>
        <FormRow
          label="신청 기한"
          htmlFor="adm-register-objection-deadline"
          required
        >
          <Input
            id="adm-register-objection-deadline"
            type="date"
            className="max-w-48"
            value={draft.objectionDeadline}
            onChange={(event) =>
              setField("objectionDeadline", event.target.value)
            }
          />
          <span className="text-2xs text-ink-muted">
            채권소멸 공고일 기준 이의제기를 받을 수 있는 마지막 날입니다.
          </span>
        </FormRow>

        {inputError && (
          <Alert variant="danger" className="mt-3">
            {inputError}
          </Alert>
        )}
        {serverError && (
          <Alert variant="danger" className="mt-3">
            {serverError}
          </Alert>
        )}
        {registeredCaseId != null && (
          <Alert variant="success" className="mt-3">
            사건 번호 {registeredCaseId}로 등록하고 계좌를 전부
            지급정지했습니다.
          </Alert>
        )}

        <div className="mt-4 flex items-center justify-center">
          <Button
            type="submit"
            className="min-w-30"
            disabled={register.isPending}
          >
            {register.isPending ? "등록 중" : "사건 등록"}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="지급정지 사건 등록"
        messages={[
          "아래 계좌를 지급정지합니다.",
          "등록하면 이 계좌의 입출금이 바로 막힙니다.",
        ]}
        items={[
          { label: "계좌 ID", value: draft.accountId },
          {
            label: "다툼 거래",
            value: `${parseTransactionNumbers(draft.transactionNumbers).length}건`,
          },
          { label: "신청 기한", value: draft.objectionDeadline },
        ]}
      />
    </FormSection>
  )
}

type ReceiveDraft = {
  caseId: string
  clause: ObjectionClause | null
  statement: string
  simplifiedRequested: boolean
  idCopyConfirmed: boolean
  litigationPending: boolean
}

const EMPTY_RECEIVE_DRAFT: ReceiveDraft = {
  caseId: "",
  clause: null,
  statement: "",
  simplifiedRequested: false,
  idCopyConfirmed: false,
  litigationPending: false,
}

const validateReceiveDraft = (draft: ReceiveDraft): string | null => {
  if (draft.caseId === "") return "사건 번호를 입력하세요."
  if (draft.clause == null) return "이의제기 사유를 고르세요."
  if (draft.statement.trim() === "") return "소명 내용을 입력하세요."
  return null
}

const ReceiveObjectionSection = ({
  initialCaseId,
}: {
  initialCaseId: number | null
}) => {
  const receive = useReceiveObjection()
  const idempotency = useIdempotencyKey()
  // 위에서 사건을 막 등록했으면 그 번호로 시작한다. 담당자가 번호를 옮겨 적다 틀리는
  // 일을 줄인다. 새 사건이 등록되면 화면이 `key` 를 바꿔 이 입력을 새로 연다.
  const [draft, setDraft] = React.useState<ReceiveDraft>({
    ...EMPTY_RECEIVE_DRAFT,
    caseId: initialCaseId != null ? String(initialCaseId) : "",
  })
  const [inputError, setInputError] = React.useState<string | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [receivedId, setReceivedId] = React.useState<number | null>(null)

  const setField = <K extends keyof ReceiveDraft>(
    key: K,
    value: ReceiveDraft[K],
  ) => setDraft((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setServerError(null)
    const error = validateReceiveDraft(draft)
    setInputError(error)
    if (error != null || draft.clause == null) return

    const request = {
      caseId: Number(draft.caseId),
      clause: draft.clause,
      statement: draft.statement.trim(),
      simplifiedRequested: draft.simplifiedRequested,
      idCopyConfirmed: draft.idCopyConfirmed,
      litigationPending: draft.litigationPending,
    }
    receive.mutate(
      { request, idempotencyKey: idempotency.keyFor(request) },
      {
        onSuccess: (response) => {
          idempotency.reset()
          setDraft(EMPTY_RECEIVE_DRAFT)
          setReceivedId(response.objectionId ?? null)
        },
        onError: (caught) => setServerError(toErrorMessage(caught)),
      },
    )
  }

  return (
    <FormSection title="이의제기 접수" className="mb-0">
      <form onSubmit={handleSubmit} noValidate>
        <FormRow label="사건 번호" htmlFor="adm-receive-case-id" required>
          <Input
            id="adm-receive-case-id"
            className="max-w-48"
            inputMode="numeric"
            autoComplete="off"
            value={draft.caseId}
            onChange={(event) =>
              setField("caseId", onlyDigits(event.target.value, MAX_ID_DIGITS))
            }
          />
        </FormRow>
        <div role="radiogroup" aria-labelledby="adm-receive-clause-label">
          <FormRow
            label={<span id="adm-receive-clause-label">이의제기 사유</span>}
            required
          >
            <div className="flex flex-col gap-2">
              {OBJECTION_CLAUSES.map((clause) => (
                <Radio
                  key={clause}
                  name="adm-receive-clause"
                  value={clause}
                  label={`제${clause}호 ${CLAUSE_LABEL[clause]}`}
                  checked={draft.clause === clause}
                  onChange={() => setField("clause", clause)}
                />
              ))}
            </div>
          </FormRow>
        </div>
        <FormRow label="소명 내용" htmlFor="adm-receive-statement" required>
          <Textarea
            id="adm-receive-statement"
            className="min-h-32"
            maxLength={MAX_STATEMENT_LENGTH}
            value={draft.statement}
            onChange={(event) => setField("statement", event.target.value)}
          />
          <span className="ml-auto text-2xs text-ink-faint">
            {draft.statement.length.toLocaleString("ko-KR")} /{" "}
            {MAX_STATEMENT_LENGTH.toLocaleString("ko-KR")}자
          </span>
        </FormRow>
        <FormRow label="접수 확인">
          <div className="flex flex-col gap-2">
            <Checkbox
              label="신분증 사본 확인"
              checked={draft.idCopyConfirmed}
              onChange={(event) =>
                setField("idCopyConfirmed", event.target.checked)
              }
            />
            <Checkbox
              label="일부 지급정지 간소화 절차 신청"
              checked={draft.simplifiedRequested}
              onChange={(event) =>
                setField("simplifiedRequested", event.target.checked)
              }
            />
            <Checkbox
              label="명의인과 피해자 사이 소송 계속 중"
              checked={draft.litigationPending}
              onChange={(event) =>
                setField("litigationPending", event.target.checked)
              }
            />
          </div>
        </FormRow>

        {inputError && (
          <Alert variant="danger" className="mt-3">
            {inputError}
          </Alert>
        )}
        {serverError && (
          <Alert variant="danger" className="mt-3">
            {serverError}
          </Alert>
        )}
        {receivedId != null && (
          <Alert variant="success" className="mt-3">
            이의제기 번호 {receivedId}로 접수했습니다.{" "}
            <Link
              to={`/admin/objections/${receivedId}`}
              className="font-bold text-link hover:underline"
            >
              심사 화면 열기
            </Link>
          </Alert>
        )}

        <div className="mt-4 flex items-center justify-center">
          <Button
            type="submit"
            className="min-w-30"
            disabled={receive.isPending}
          >
            {receive.isPending ? "접수 중" : "이의제기 접수"}
          </Button>
        </div>
      </form>
    </FormSection>
  )
}

export const Adm05ObjectionIntake = () => {
  const [registeredCaseId, setRegisteredCaseId] = React.useState<number | null>(
    null,
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/objections"
          className="text-base text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          ← 이의제기 목록
        </Link>
      </div>

      <RegisterCaseSection onRegistered={setRegisteredCaseId} />
      <ReceiveObjectionSection
        key={registeredCaseId ?? "empty"}
        initialCaseId={registeredCaseId}
      />

      <NoticeBoxFooter
        items={[
          "사건을 등록하면 다툼 거래가 입금된 계좌를 바로 전부 지급정지합니다.",
          "이미 다른 사건에 등록된 거래나 입금이 아닌 거래는 등록되지 않습니다.",
          "이의제기는 사건마다 한 번 접수합니다. 신청 기한이 지나면 접수되지 않습니다.",
          "신분증 사본 확인과 소명 내용이 없으면 접수되지 않으며 보완을 요청합니다.",
        ]}
      />
    </div>
  )
}

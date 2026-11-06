import * as React from "react"
import {
  CLAUSE_SCOPE,
  DECISION_LABEL,
  DECISION_RESULTS,
  closedDecisionReason,
  isReleasingDecision,
  useConfirmObjectionDecision,
  type DecisionResult,
  type ObjectionClause,
  type ObjectionDetail,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { Radio } from "@/shared/ui/radio"
import { Textarea } from "@/shared/ui/textarea"

/** 서버 `DecisionRequest` 의 `@Size(max = 500)`. */
const MAX_DECISION_TEXT_LENGTH = 500

/** 판정이 계좌에 하는 일. 확인 다이얼로그에서 무엇이 바뀌는지 먼저 보인다. */
const DECISION_EFFECT: Record<DecisionResult, string> = {
  ACCEPTED: "지급정지 전부 해제",
  PARTIAL: "다툼 입금액만 보류하고 나머지 해제",
  REJECTED: "지급정지 유지",
}

type InputError = {
  field: "result" | "reason" | "earlyReleaseBasis"
  message: string
}

type Props = {
  objection: ObjectionDetail
  /** 작성이 끝났을 때. `status` 가 `PENDING_APPROVAL` 이면 승인 대기로 저장만 됐다 */
  onConfirmed: (result: DecisionResult, status: string) => void
}

/**
 * 판정 입력. 불수용은 바로 확정되고, 수용과 일부 지급정지는 다른 관리자의 승인을 기다린다
 * (2인 승인, 계획 PA-10). 그래서 지급정지를 줄이는 판정은 버튼 이름이 "승인 요청"이다.
 *
 * 고를 수 있는 판정은 서버 해제 요건 점검(`gate.allowedResults`)이 정한다. 닫힌 판정은
 * 라디오를 잠그고 옆에 이유를 적는다 — 눌러서 서버 거부(`PST0301`)를 받는 건 이미 늦다.
 *
 * 수용과 일부 지급정지는 법상 조기 해제라 근거가 필수다(D29). 화면이 먼저 막고, 서버도
 * `PST0004` 로 막는다.
 *
 * 멱등키는 보내는 내용에 묶는다. 실패 뒤 같은 내용을 다시 보내면 같은 키라 서버가 한
 * 거래로 처리하고, 내용을 고치면 새 키가 된다.
 */
export const Adm05ObjectionDecisionForm = ({
  objection,
  onConfirmed,
}: Props) => {
  const confirmDecision = useConfirmObjectionDecision()
  const idempotency = useIdempotencyKey()

  const [result, setResult] = React.useState<DecisionResult | null>(null)
  const [reason, setReason] = React.useState("")
  const [earlyReleaseBasis, setEarlyReleaseBasis] = React.useState("")
  const [inputError, setInputError] = React.useState<InputError | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isConfirmOpen, setConfirmOpen] = React.useState(false)

  // 점검 결과가 다시 계산돼 고른 판정이 닫혔으면 선택을 버린다. 닫힌 라디오가 선택된 채
  // 남으면 담당자는 왜 확정이 막히는지 알 수 없다.
  const selected =
    result != null && objection.gate.allowedResults[result] ? result : null
  const needsBasis = selected != null && isReleasingDecision(selected)
  const scope = CLAUSE_SCOPE[objection.clause as ObjectionClause]

  const buildRequest = (decision: DecisionResult) => ({
    result: decision,
    reason: reason.trim(),
    ...(isReleasingDecision(decision)
      ? { earlyReleaseBasis: earlyReleaseBasis.trim() }
      : {}),
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setServerError(null)
    if (selected == null) {
      setInputError({ field: "result", message: "판정을 고르세요." })
      return
    }
    if (reason.trim() === "") {
      setInputError({ field: "reason", message: "판정 사유를 입력하세요." })
      return
    }
    if (isReleasingDecision(selected) && earlyReleaseBasis.trim() === "") {
      setInputError({
        field: "earlyReleaseBasis",
        message:
          "수용과 일부 지급정지는 조기 해제 근거를 입력해야 확정할 수 있습니다.",
      })
      return
    }
    setInputError(null)
    setConfirmOpen(true)
  }

  const handleConfirm = () => {
    setConfirmOpen(false)
    if (selected == null) return
    const request = buildRequest(selected)
    const idempotencyKey = idempotency.keyFor({
      objectionId: objection.objectionId,
      request,
    })
    confirmDecision.mutate(
      { objectionId: objection.objectionId, request, idempotencyKey },
      {
        onSuccess: (response) => {
          idempotency.reset()
          onConfirmed(
            selected,
            response.status ||
              (isReleasingDecision(selected)
                ? "PENDING_APPROVAL"
                : "CONFIRMED"),
          )
        },
        onError: (error) => setServerError(toErrorMessage(error)),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div role="radiogroup" aria-labelledby="adm-decision-result-label">
        <FormRow
          label={<span id="adm-decision-result-label">판정</span>}
          required
        >
          <div className="flex w-full flex-col gap-2">
            {DECISION_RESULTS.map((option) => {
              const closedReason = closedDecisionReason(objection, option)
              return (
                <div key={option} className="flex flex-wrap items-center gap-3">
                  <Radio
                    name="adm-decision-result"
                    value={option}
                    label={DECISION_LABEL[option]}
                    checked={selected === option}
                    disabled={closedReason != null}
                    aria-describedby={
                      closedReason ? `adm-decision-closed-${option}` : undefined
                    }
                    onChange={() => {
                      setResult(option)
                      setInputError(null)
                    }}
                  />
                  {closedReason && (
                    <span
                      id={`adm-decision-closed-${option}`}
                      className="text-xs text-ink-faint"
                    >
                      {closedReason}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </FormRow>
      </div>
      <FormRow label="판정 사유" htmlFor="adm-decision-reason" required>
        <Textarea
          id="adm-decision-reason"
          maxLength={MAX_DECISION_TEXT_LENGTH}
          value={reason}
          invalid={inputError?.field === "reason"}
          onChange={(event) => setReason(event.target.value)}
        />
      </FormRow>
      {needsBasis && (
        <FormRow
          label="조기 해제 근거"
          htmlFor="adm-decision-early-release-basis"
          required
        >
          <Textarea
            id="adm-decision-early-release-basis"
            maxLength={MAX_DECISION_TEXT_LENGTH}
            placeholder="근거 거래 번호나 외부 확인 내용을 적습니다."
            value={earlyReleaseBasis}
            invalid={inputError?.field === "earlyReleaseBasis"}
            onChange={(event) => setEarlyReleaseBasis(event.target.value)}
          />
          <p className="text-2xs text-ink-muted">
            피해자 통보 뒤 기다리지 않고 바로 해제하므로 법상 조기 해제 근거를
            남깁니다.
          </p>
        </FormRow>
      )}

      {inputError && (
        <Alert variant="danger" className="mt-3">
          {inputError.message}
        </Alert>
      )}
      {serverError && (
        <Alert variant="danger" className="mt-3">
          {serverError}
        </Alert>
      )}

      <div className="mt-4 flex items-center justify-center gap-2">
        <Button
          type="submit"
          size="md"
          className="min-w-30"
          disabled={confirmDecision.isPending}
        >
          {confirmDecision.isPending
            ? "처리 중"
            : needsBasis
              ? "승인 요청"
              : "판정 확정"}
        </Button>
      </div>

      <ConfirmDialog
        open={isConfirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={needsBasis ? "승인 요청" : "판정 확정"}
        messages={
          needsBasis
            ? [
                "아래 판정을 승인 대기로 올립니다.",
                "다른 관리자가 승인해야 계좌의 지급정지에 반영됩니다.",
              ]
            : [
                "아래 판정을 확정합니다.",
                "확정하면 계좌의 지급정지에 바로 반영되고 되돌릴 수 없습니다.",
              ]
        }
        items={
          selected
            ? [
                { label: "이의제기 번호", value: objection.objectionId },
                { label: "판정", value: DECISION_LABEL[selected] },
                {
                  label: "계좌 반영",
                  value: isReleasingDecision(selected)
                    ? `승인 뒤 ${DECISION_EFFECT[selected]}`
                    : DECISION_EFFECT[selected],
                },
                ...(isReleasingDecision(selected) && scope
                  ? [{ label: "해제 범위", value: scope }]
                  : []),
                { label: "판정 사유", value: reason.trim() },
                ...(isReleasingDecision(selected)
                  ? [
                      {
                        label: "조기 해제 근거",
                        value: earlyReleaseBasis.trim(),
                      },
                    ]
                  : []),
              ]
            : []
        }
      />
    </form>
  )
}

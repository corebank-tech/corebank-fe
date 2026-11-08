import * as React from "react"
import {
  CLAUSE_SCOPE,
  DECISION_LABEL,
  DECISION_RESULTS,
  decisionAvailability,
  isReleasingDecision,
  useConfirmObjectionDecision,
  type DecisionResult,
  type ObjectionClause,
  type ObjectionDetail,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { FormRow } from "@/shared/ui/form-row"
import { Radio } from "@/shared/ui/radio"
import { Textarea } from "@/shared/ui/textarea"

/** 서버 `DecisionRequest` 의 `@Size(max = 500)`. */
const MAX_DECISION_TEXT_LENGTH = 500

/** 서버 `DecisionRequest.discretionaryReason` 길이(20~1000자). */
const MIN_DISCRETIONARY_REASON_LENGTH = 20
const MAX_DISCRETIONARY_REASON_LENGTH = 1000

const DISCRETIONARY_WARNING =
  "해제 요건 점검과 다른 판정입니다. 사유와 다른 관리자 승인이 필요하고 기록이 남습니다."

/** 판정이 계좌에 하는 일. 확인 다이얼로그에서 무엇이 바뀌는지 먼저 보인다. */
const DECISION_EFFECT: Record<DecisionResult, string> = {
  ACCEPTED: "지급정지 전부 해제",
  PARTIAL: "다툼 입금액만 보류하고 나머지 해제",
  REJECTED: "지급정지 유지",
}

type InputError = {
  field: "result" | "reason" | "earlyReleaseBasis" | "discretionaryReason"
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
 * 고를 수 있는 판정은 서버 해제 요건 점검(`gate.allowedResults`, `gate.discretionaryResults`)과
 * 이의제기 상태가 함께 정한다. 수용과 일부 지급정지는 소명 완비 확인 뒤(`UNDER_REVIEW`)에만 쓸 수
 * 있다. 닫힌 판정은 라디오를 잠그고 옆에 이유를 적는다 — 눌러서 서버 거부(`PST0301`, `PST0308`,
 * `PST0310`)를 받는 건 이미 늦다.
 *
 * 최종 판단은 사람의 몫이라 해제 요건 점검이 닫았어도 재량으로 쓸 수 있는 판정은 막지 않는다.
 * 대신 옆에 점검이 닫힌 이유와 "재량 판정"을 적고, 고르면 경고와 재량 판정 사유(20~1000자)를
 * 받는다. 요청에는 `discretionary: true` 와 사유를 싣는다. 점검이 연 판정에는 싣지 않는다.
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
  const [discretionaryReason, setDiscretionaryReason] = React.useState("")
  const [inputError, setInputError] = React.useState<InputError | null>(null)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isConfirmOpen, setConfirmOpen] = React.useState(false)

  // 점검 결과가 다시 계산되거나 상태가 바뀌어 고른 판정이 닫혔으면 선택을 버린다. 닫힌
  // 라디오가 선택된 채 남으면 담당자는 왜 확정이 막히는지 알 수 없다.
  const selectedAvailability =
    result != null ? decisionAvailability(objection, result) : null
  const selected =
    selectedAvailability != null && selectedAvailability.kind !== "CLOSED"
      ? result
      : null
  const isDiscretionary = selectedAvailability?.kind === "DISCRETIONARY"
  const needsBasis = selected != null && isReleasingDecision(selected)
  const scope = CLAUSE_SCOPE[objection.clause as ObjectionClause]

  const buildRequest = (decision: DecisionResult) => ({
    result: decision,
    reason: reason.trim(),
    ...(isReleasingDecision(decision)
      ? { earlyReleaseBasis: earlyReleaseBasis.trim() }
      : {}),
    ...(isDiscretionary
      ? {
          discretionary: true,
          discretionaryReason: discretionaryReason.trim(),
        }
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
    if (
      isDiscretionary &&
      discretionaryReason.trim().length < MIN_DISCRETIONARY_REASON_LENGTH
    ) {
      setInputError({
        field: "discretionaryReason",
        message: `재량 판정 사유를 ${MIN_DISCRETIONARY_REASON_LENGTH}자 이상 입력하세요.`,
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
              const availability = decisionAvailability(objection, option)
              const note =
                availability.kind === "CLOSED"
                  ? availability.reason
                  : availability.kind === "DISCRETIONARY"
                    ? availability.gateReason
                    : null
              const noteId = `adm-decision-note-${option}`
              return (
                <div key={option} className="flex flex-wrap items-center gap-3">
                  <Radio
                    name="adm-decision-result"
                    value={option}
                    label={DECISION_LABEL[option]}
                    checked={selected === option}
                    disabled={availability.kind === "CLOSED"}
                    aria-describedby={note ? noteId : undefined}
                    onChange={() => {
                      setResult(option)
                      setInputError(null)
                    }}
                  />
                  {availability.kind === "DISCRETIONARY" && (
                    <Badge variant="warning">재량 판정</Badge>
                  )}
                  {note && (
                    <span id={noteId} className="text-xs text-ink-faint">
                      {note}
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

      {isDiscretionary && (
        <>
          <Alert variant="warning" title="재량 판정" className="my-3">
            {DISCRETIONARY_WARNING}
          </Alert>
          <FormRow
            label="재량 판정 사유"
            htmlFor="adm-decision-discretionary-reason"
            required
          >
            <Textarea
              id="adm-decision-discretionary-reason"
              maxLength={MAX_DISCRETIONARY_REASON_LENGTH}
              placeholder="해제 요건 점검과 다르게 판단한 근거를 적습니다."
              aria-describedby="adm-decision-discretionary-count"
              value={discretionaryReason}
              invalid={inputError?.field === "discretionaryReason"}
              onChange={(event) => setDiscretionaryReason(event.target.value)}
            />
            <p
              id="adm-decision-discretionary-count"
              className="text-2xs text-ink-muted"
            >
              {`${discretionaryReason.trim().length}자 / ${MIN_DISCRETIONARY_REASON_LENGTH}~${MAX_DISCRETIONARY_REASON_LENGTH}자`}
            </p>
          </FormRow>
        </>
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
        title={
          isDiscretionary
            ? "재량 판정 승인 요청"
            : needsBasis
              ? "승인 요청"
              : "판정 확정"
        }
        messages={
          isDiscretionary
            ? [
                "아래 재량 판정을 승인 대기로 올립니다.",
                "해제 요건 점검과 다른 재량 판정이라 다른 관리자가 재량 판정 사유를 확인하고 승인해야 계좌에 반영됩니다.",
              ]
            : needsBasis
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
                {
                  label: "판정",
                  value: isDiscretionary
                    ? `${DECISION_LABEL[selected]} (재량 판정)`
                    : DECISION_LABEL[selected],
                },
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
                ...(selectedAvailability?.kind === "DISCRETIONARY"
                  ? [
                      {
                        label: "해제 요건 점검",
                        value: selectedAvailability.gateReason,
                      },
                      {
                        label: "재량 판정 사유",
                        value: discretionaryReason.trim(),
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

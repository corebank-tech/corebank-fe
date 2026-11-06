import * as React from "react"
import {
  SUPPLEMENT_BUSINESS_DAYS,
  SUPPLEMENT_MAX_ROUNDS,
  useRequestSupplement,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { formatDate } from "@/shared/lib/format"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { FormRow } from "@/shared/ui/form-row"
import { Textarea } from "@/shared/ui/textarea"

/** 서버 `SupplementRequest` 의 상한(계약 v2 §3). */
const MAX_REASON_LENGTH = 500
const MAX_MISSING_DOCUMENTS = 20

type Props = {
  objectionId: number
  /** 지금까지 요청한 보완 횟수 */
  supplementRound: number
  /** 누락 서류 입력의 처음 값. AI 판정안의 누락 소명자료를 넘긴다 */
  suggestedDocuments?: string[]
}

const parseDocuments = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)

/**
 * 보완 요청(D12). 1회째는 요청일부터 5영업일, 2회째(재보완)는 3영업일 안에 받는다. 보완은
 * 2회까지라 그 뒤에는 입력을 그리지 않는다. 서버도 3회째를 `PST0006` 으로 막는다.
 */
export const SupplementRequestForm = ({
  objectionId,
  supplementRound,
  suggestedDocuments = [],
}: Props) => {
  const requestSupplement = useRequestSupplement()
  const idempotency = useIdempotencyKey()
  const [reason, setReason] = React.useState("")
  const [documentsText, setDocumentsText] = React.useState(() =>
    suggestedDocuments.join("\n"),
  )
  const [error, setError] = React.useState<string | null>(null)
  const [result, setResult] = React.useState<{
    round: number
    due: string | null
  } | null>(null)

  const nextRound = supplementRound + 1
  if (nextRound > SUPPLEMENT_MAX_ROUNDS) {
    return (
      <Alert variant="warning" title="보완 요청 횟수 소진">
        보완 요청 {SUPPLEMENT_MAX_ROUNDS}회를 모두 썼습니다. 더 요청할 수 없고
        제출된 자료로 판정합니다.
      </Alert>
    )
  }

  const documents = parseDocuments(documentsText)

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    if (reason.trim() === "") {
      setError("보완 요청 사유를 입력하세요.")
      return
    }
    if (documents.length === 0) {
      setError("요청할 서류를 한 줄에 하나씩 입력하세요.")
      return
    }
    if (documents.length > MAX_MISSING_DOCUMENTS) {
      setError(`요청할 서류는 ${MAX_MISSING_DOCUMENTS}개까지입니다.`)
      return
    }
    const request = { reason: reason.trim(), missingDocuments: documents }
    requestSupplement.mutate(
      {
        objectionId,
        request,
        idempotencyKey: idempotency.keyFor({ objectionId, request }),
      },
      {
        onSuccess: (data) => {
          idempotency.reset()
          setResult({
            round: data.round ?? nextRound,
            due: data.supplementDue ?? null,
          })
          setReason("")
          setDocumentsText("")
        },
        onError: (cause) => setError(toErrorMessage(cause)),
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="보완 요청">
      <p className="mb-2 text-xs text-ink-muted">
        이번 요청은 {nextRound}회째 보완입니다. 보완 기한은 요청일부터{" "}
        {SUPPLEMENT_BUSINESS_DAYS[nextRound]}영업일이고, 보완은{" "}
        {SUPPLEMENT_MAX_ROUNDS}회까지 요청할 수 있습니다.
      </p>
      <FormRow label="요청 사유" htmlFor="adm-supplement-reason" required>
        <Textarea
          id="adm-supplement-reason"
          maxLength={MAX_REASON_LENGTH}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </FormRow>
      <FormRow label="요청 서류" htmlFor="adm-supplement-documents" required>
        <Textarea
          id="adm-supplement-documents"
          placeholder="한 줄에 하나씩 적습니다."
          value={documentsText}
          onChange={(event) => setDocumentsText(event.target.value)}
        />
        <p className="text-2xs text-ink-muted">
          {documents.length}개 / 최대 {MAX_MISSING_DOCUMENTS}개
        </p>
      </FormRow>
      {error && (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      )}
      {result && (
        <Alert variant="success" className="mt-3">
          {result.round}회째 보완을 요청했습니다.
          {result.due && ` 보완 기한은 ${formatDate(result.due)}입니다.`} 명의인
          통지를 기록했습니다.
        </Alert>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="submit" size="sm" disabled={requestSupplement.isPending}>
          {requestSupplement.isPending ? "요청 중" : "보완 요청"}
        </Button>
      </div>
    </form>
  )
}

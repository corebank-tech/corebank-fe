import * as React from "react"
import { Link, useParams } from "react-router"
import {
  MAX_EVIDENCE_COUNT,
  OBJECTION_FILE_ACCEPT,
  SUPPLEMENT_REQUESTED,
  mySupplementFingerprint,
  selectObjectionFiles,
  summarizeFiles,
  useSubmitMyObjectionSupplement,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatFileSize } from "@/shared/lib/file-size"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { FileAttach } from "@/shared/ui/file-attach"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Spinner } from "@/shared/ui/spinner"
import { Textarea } from "@/shared/ui/textarea"
import {
  CaseInfoRows,
  CaseNotFound,
  CasesLoadError,
  LoadingCases,
  StatusBadge,
  SupplementRequestNotice,
} from "@/pages/objection/objection-case-parts"
import {
  MY_PAYMENT_STOPS_PATH,
  statusTextOf,
  useMyCase,
} from "@/pages/objection/objection-shared"

/**
 * H-03 이의제기 보완 서류 제출(고객 비대면, 계약 §4).
 *
 * 담당자가 보완을 요청한 이의제기에만 낼 수 있다. 다른 상태에서도 화면은 열되 입력을
 * 막고 이유를 보인다 — 목록의 링크가 아니라 주소로 들어와도 무엇을 기다리는지 알 수 있게.
 * 서버도 같은 조건으로 거부한다(`PST0308`).
 */

const MAX_NOTE_LENGTH = 1000
const EVIDENCE_INPUT_ID = "supplement-evidence"
const EVIDENCE_REQUIRED = "보완 서류를 하나 이상 첨부하세요."

const SupplementForm = ({ item }: { item: MyPaymentStop }) => {
  const submit = useSubmitMyObjectionSupplement()
  const idempotency = useIdempotencyKey()
  const enabled =
    item.objectionStatus === SUPPLEMENT_REQUESTED && item.objectionId != null

  const [evidence, setEvidence] = React.useState<File[]>([])
  const [errors, setErrors] = React.useState<string[]>([])
  const [checking, setChecking] = React.useState(false)
  const [note, setNote] = React.useState("")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [submittedCount, setSubmittedCount] = React.useState<number | null>(
    null,
  )
  const resultRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (submittedCount != null) resultRef.current?.focus()
  }, [submittedCount])

  const handleSelect = async (picked: File[]) => {
    setChecking(true)
    const result = await selectObjectionFiles({
      current: evidence,
      incoming: picked,
      maxCount: MAX_EVIDENCE_COUNT,
    })
    setChecking(false)
    setEvidence(result.files)
    setErrors(result.errors)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!enabled || item.objectionId == null) return
    if (evidence.length === 0) {
      setErrors([EVIDENCE_REQUIRED])
      document.getElementById(EVIDENCE_INPUT_ID)?.focus()
      return
    }
    setSubmitError(null)
    const draft = { evidence, note }
    submit.mutate(
      {
        objectionId: item.objectionId,
        draft,
        idempotencyKey: idempotency.keyFor(
          mySupplementFingerprint(item.objectionId, draft),
        ),
      },
      {
        onSuccess: (documents) => {
          idempotency.reset()
          setSubmittedCount(documents.length)
        },
        onError: (error) => setSubmitError(toErrorMessage(error)),
      },
    )
  }

  if (submittedCount != null) {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        className="flex flex-col gap-4 focus:outline-none"
      >
        <Alert variant="success" title="보완 서류를 제출했습니다">
          <p>
            서류 {submittedCount}개를 받았습니다. 담당자가 다시 확인한 뒤 소명
            자료가 모두 갖춰지면 그날부터 5영업일 안에 심사 결과를 알려
            드립니다.
          </p>
        </Alert>
        <div className="flex justify-center">
          <Link
            to={MY_PAYMENT_STOPS_PATH}
            className="inline-flex h-12 min-w-40 items-center justify-center rounded-md border border-primary bg-primary px-6 text-lg font-bold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            목록으로
          </Link>
        </div>
      </div>
    )
  }

  const isSubmitting = submit.isPending
  const summary = summarizeFiles(evidence)

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {!enabled && (
        <Alert variant="info" title="지금은 보완 서류를 낼 수 없습니다">
          보완 서류는 담당자가 보완을 요청한 이의제기에만 낼 수 있습니다. 지금
          상태는 {statusTextOf(item)}입니다.
        </Alert>
      )}
      <SupplementRequestNotice item={item} />

      <FormSection title="보완 서류" className="mb-0">
        <fieldset disabled={!enabled} className="contents">
          <FormRow label="보완 서류" htmlFor={EVIDENCE_INPUT_ID} required>
            <FileAttach
              id={EVIDENCE_INPUT_ID}
              label="보완 서류"
              accept={OBJECTION_FILE_ACCEPT}
              multiple
              required
              disabled={!enabled || isSubmitting}
              files={evidence}
              busy={checking}
              errors={errors}
              hint={`요청받은 서류를 ${MAX_EVIDENCE_COUNT}개까지 올립니다. PDF, PNG, JPG 파일만, 파일 하나 10MB, 모두 합쳐 30MB까지입니다.`}
              onSelect={(picked) => void handleSelect(picked)}
              onRemove={(index) => {
                setEvidence((prev) => prev.filter((_, i) => i !== index))
                setErrors([])
              }}
            />
          </FormRow>
          <FormRow label="전할 말" htmlFor="supplement-note">
            <Textarea
              id="supplement-note"
              maxLength={MAX_NOTE_LENGTH}
              placeholder="서류에 대해 담당자에게 전할 내용이 있으면 적으세요."
              value={note}
              disabled={!enabled || isSubmitting}
              aria-describedby="supplement-note-count"
              onChange={(event) => setNote(event.target.value)}
            />
            <span
              id="supplement-note-count"
              className="ml-auto text-2xs text-ink-faint"
            >
              {note.length.toLocaleString("ko-KR")} /{" "}
              {MAX_NOTE_LENGTH.toLocaleString("ko-KR")}자
            </span>
          </FormRow>
        </fieldset>
      </FormSection>

      <div aria-live="polite">
        {isSubmitting && (
          <p
            role="status"
            className="flex items-center gap-2 text-base text-ink-muted"
          >
            <Spinner size="sm" />
            서류 {summary.count}개({formatFileSize(summary.totalBytes)})를
            올리는 중입니다. 화면을 닫지 마세요.
          </p>
        )}
      </div>
      {submitError && (
        <Alert variant="danger" title="제출하지 못했습니다">
          <p>{submitError}</p>
          <p className="mt-1">
            첨부한 파일과 전할 말은 그대로 있습니다. 다시 제출을 누르세요.
          </p>
        </Alert>
      )}

      <div className="flex items-center justify-center gap-2">
        <Link
          to={MY_PAYMENT_STOPS_PATH}
          className="inline-flex h-12 min-w-40 items-center justify-center rounded-md border border-border-strong bg-surface px-6 text-lg font-bold text-ink hover:bg-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
        >
          목록으로
        </Link>
        <Button
          type="submit"
          size="lg"
          className="min-w-40"
          disabled={!enabled || isSubmitting || checking}
        >
          {isSubmitting
            ? "제출 중"
            : submitError
              ? "다시 제출"
              : "보완 서류 제출"}
        </Button>
      </div>
    </form>
  )
}

export const H03ObjectionSupplement = () => {
  const { caseId } = useParams()
  const { item, isPending, isError, error, refetch } = useMyCase(caseId)

  if (isPending) return <LoadingCases />
  if (isError) {
    return <CasesLoadError error={error} onRetry={() => void refetch()} />
  }
  if (!item || item.objectionId == null) return <CaseNotFound />

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="supplement-case-title"
        className="border border-border bg-surface-elevated p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="supplement-case-title" className="text-h2 font-bold text-ink">
            이의제기 접수 번호 {item.objectionId}
          </h2>
          <StatusBadge item={item} />
        </div>
        <CaseInfoRows item={item} />
      </section>
      <SupplementForm item={item} />
    </div>
  )
}

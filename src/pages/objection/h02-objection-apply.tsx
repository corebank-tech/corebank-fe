import * as React from "react"
import { Link, useNavigate, useParams } from "react-router"
import {
  MAX_EVIDENCE_COUNT,
  myObjectionFingerprint,
  selectObjectionFiles,
  useSubmitMyObjection,
  type MyObjectionDraft,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { getToday } from "@/shared/config/clock"
import { formatDate } from "@/shared/lib/format"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Button } from "@/shared/ui/button"
import { EmptyState } from "@/shared/ui/empty-state"
import { StepLayout } from "@/shared/ui/step-layout"
import {
  CaseNotFound,
  CasesLoadError,
  LoadingCases,
} from "@/pages/objection/objection-case-parts"
import {
  MY_PAYMENT_STOPS_PATH,
  isDeadlinePassed,
  useMyCase,
} from "@/pages/objection/objection-shared"
import {
  APPLY_STEPS,
  EMPTY_APPLY_FILES,
  EMPTY_APPLY_FORM,
  ID_COPY_REQUIRED,
  validateApplyForm,
  type ApplyFiles,
  type ApplyForm,
  type ApplyFormErrors,
} from "@/pages/objection/h02-apply-draft"
import {
  ApplyFormStep,
  type ApplyFormStepHandle,
} from "@/pages/objection/h02-apply-form-step"
import {
  ApplyAttachStep,
  ID_COPY_INPUT_ID,
} from "@/pages/objection/h02-apply-attach-step"
import { ApplyConfirmStep } from "@/pages/objection/h02-apply-confirm-step"
import { ApplyComplete } from "@/pages/objection/h02-apply-complete"

/**
 * H-02 지급정지 이의제기 신청(고객 비대면, 계획 PA-21, 계약 §4).
 *
 * 신청서 작성 → 서류 첨부 → 내용 확인 → 접수 완료. 입력은 이 화면이 끝까지 들고 있어
 * 단계를 오가거나 제출이 실패해도 지워지지 않는다. 같은 내용으로 다시 내면 같은 멱등키를
 * 써서, 응답을 못 받은 첫 요청이 서버에 닿았더라도 두 번 접수되지 않는다.
 *
 * 화면은 형식만 미리 본다(필수 칸, 파일 형식과 크기와 개수). 신청 기한, 본인 사건 여부,
 * 파일 바이트 재검사는 서버가 판정하고 그 문구를 그대로 보인다(REQ-CMN-008).
 */

const NOTICE: Record<number, string[]> = {
  1: [
    "이의제기 사유는 법에서 정한 세 가지 중 하나를 고릅니다.",
    "소명 내용에는 돈을 받은 경위, 상대방과의 관계, 거래 내용을 구체적으로 적으세요.",
  ],
  2: [
    "신분증 사본은 꼭 첨부해야 합니다. 증빙 서류는 9개까지 올릴 수 있습니다.",
    "PDF, PNG, JPG 파일만, 파일 하나 10MB, 모두 합쳐 30MB까지 올릴 수 있습니다.",
  ],
  3: ["제출한 뒤에는 신청 내용을 고칠 수 없습니다. 내용을 다시 확인하세요."],
}

type ApplyFlowProps = {
  item: MyPaymentStop
  onSubmitted: (objectionId: number) => void
}

const ApplyFlow = ({ item, onSubmitted }: ApplyFlowProps) => {
  const navigate = useNavigate()
  const submit = useSubmitMyObjection()
  const idempotency = useIdempotencyKey()

  const [step, setStep] = React.useState(1)
  const [form, setForm] = React.useState<ApplyForm>(EMPTY_APPLY_FORM)
  const [formErrors, setFormErrors] = React.useState<ApplyFormErrors>({})
  const [files, setFiles] = React.useState<ApplyFiles>(EMPTY_APPLY_FILES)
  const [checking, setChecking] = React.useState<"idCopy" | "evidence" | null>(
    null,
  )
  const [agreed, setAgreed] = React.useState(false)
  const [agreeError, setAgreeError] = React.useState<string | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const formStepRef = React.useRef<ApplyFormStepHandle>(null)
  const agreeRef = React.useRef<HTMLInputElement>(null)
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const isFirstRender = React.useRef(true)

  // 단계가 바뀌면 본문 처음으로 초점을 옮긴다. 버튼에 남아 있으면 키보드 사용자가
  // 새 단계 내용을 지나쳐 버린다. 처음 열릴 때는 옮기지 않는다.
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    bodyRef.current?.focus()
  }, [step])

  const setField = <K extends keyof ApplyForm>(key: K, value: ApplyForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setFormErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const handleSelectIdCopy = async (picked: File[]) => {
    setChecking("idCopy")
    const result = await selectObjectionFiles({
      current: [],
      incoming: picked.slice(0, 1),
      maxCount: 1,
      otherFiles: files.evidence,
    })
    setChecking(null)
    setFiles((prev) => ({
      ...prev,
      // 통과하지 못하면 이전에 고른 신분증 사본을 그대로 둔다
      idCopy: result.files.length > 0 ? result.files : prev.idCopy,
      idCopyErrors: result.errors,
    }))
  }

  const handleSelectEvidence = async (picked: File[]) => {
    setChecking("evidence")
    const result = await selectObjectionFiles({
      current: files.evidence,
      incoming: picked,
      maxCount: MAX_EVIDENCE_COUNT,
      otherFiles: files.idCopy,
    })
    setChecking(null)
    setFiles((prev) => ({
      ...prev,
      evidence: result.files,
      evidenceErrors: result.errors,
    }))
  }

  const handleNextFromForm = () => {
    const errors = validateApplyForm(form)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      formStepRef.current?.focusFirstError(errors)
      return
    }
    setStep(2)
  }

  const handleNextFromAttach = () => {
    if (files.idCopy.length === 0) {
      setFiles((prev) => ({ ...prev, idCopyErrors: [ID_COPY_REQUIRED] }))
      document.getElementById(ID_COPY_INPUT_ID)?.focus()
      return
    }
    setStep(3)
  }

  const handleSubmit = () => {
    if (!agreed) {
      setAgreeError("내용 확인에 동의해야 제출할 수 있습니다.")
      agreeRef.current?.focus()
      return
    }
    if (form.clause == null || files.idCopy.length === 0) return
    setSubmitError(null)
    const draft: MyObjectionDraft = {
      clause: form.clause,
      statement: form.statement.trim(),
      simplifiedRequested: form.simplifiedRequested,
      litigationPending: form.litigationPending,
      idCopy: files.idCopy[0],
      evidence: files.evidence,
    }
    submit.mutate(
      {
        caseId: item.caseId,
        draft,
        idempotencyKey: idempotency.keyFor(
          myObjectionFingerprint(item.caseId, draft),
        ),
      },
      {
        onSuccess: (response) => {
          idempotency.reset()
          onSubmitted(response.objectionId ?? 0)
        },
        onError: (error) => setSubmitError(toErrorMessage(error)),
      },
    )
  }

  const isSubmitting = submit.isPending

  const footer =
    step === 1 ? (
      <>
        <Button
          variant="secondary"
          size="lg"
          className="min-w-40"
          onClick={() => navigate(MY_PAYMENT_STOPS_PATH)}
        >
          취소
        </Button>
        <Button size="lg" className="min-w-40" onClick={handleNextFromForm}>
          다음
        </Button>
      </>
    ) : step === 2 ? (
      <>
        <Button
          variant="secondary"
          size="lg"
          className="min-w-40"
          onClick={() => setStep(1)}
        >
          이전
        </Button>
        <Button
          size="lg"
          className="min-w-40"
          disabled={checking != null}
          onClick={handleNextFromAttach}
        >
          다음
        </Button>
      </>
    ) : (
      <>
        <Button
          variant="secondary"
          size="lg"
          className="min-w-40"
          disabled={isSubmitting}
          onClick={() => setStep(2)}
        >
          이전
        </Button>
        <Button
          size="lg"
          className="min-w-40"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "제출 중" : submitError ? "다시 제출" : "제출"}
        </Button>
      </>
    )

  return (
    <StepLayout
      steps={APPLY_STEPS}
      currentStep={step}
      title="지급정지 이의제기 신청"
      notice={NOTICE[step]}
      footer={footer}
    >
      <div
        ref={bodyRef}
        tabIndex={-1}
        aria-label={`${step}단계 ${APPLY_STEPS[step - 1]}`}
        className="focus:outline-none"
      >
        {step === 1 && (
          <ApplyFormStep
            item={item}
            form={form}
            errors={formErrors}
            onChange={setField}
            handleRef={formStepRef}
          />
        )}
        {step === 2 && (
          <ApplyAttachStep
            files={files}
            checking={checking}
            onSelectIdCopy={(picked) => void handleSelectIdCopy(picked)}
            onSelectEvidence={(picked) => void handleSelectEvidence(picked)}
            onRemoveIdCopy={() =>
              setFiles((prev) => ({ ...prev, idCopy: [], idCopyErrors: [] }))
            }
            onRemoveEvidence={(index) =>
              setFiles((prev) => ({
                ...prev,
                evidence: prev.evidence.filter((_, i) => i !== index),
                evidenceErrors: [],
              }))
            }
          />
        )}
        {step === 3 && (
          <ApplyConfirmStep
            item={item}
            form={form}
            files={files}
            agreed={agreed}
            agreeError={agreeError}
            onAgreeChange={(checked) => {
              setAgreed(checked)
              if (checked) setAgreeError(null)
            }}
            agreeRef={agreeRef}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        )}
      </div>
    </StepLayout>
  )
}

const BackToList = () => (
  <Link
    to={MY_PAYMENT_STOPS_PATH}
    className="text-base font-bold text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
  >
    지급정지 이의제기 목록
  </Link>
)

export const H02ObjectionApply = () => {
  const { caseId } = useParams()
  const { item, isPending, isError, error, refetch } = useMyCase(caseId)
  const [submittedId, setSubmittedId] = React.useState<number | null>(null)

  // 접수 뒤 목록을 다시 받으면 이 사건에 이의제기 번호가 생긴다. 아래 "이미 신청" 분기보다
  // 먼저 완료 화면을 그려야 결과가 사라지지 않는다.
  if (submittedId != null) {
    return (
      <StepLayout
        steps={APPLY_STEPS}
        currentStep={4}
        title="지급정지 이의제기 신청"
        footer={
          <Link
            to={MY_PAYMENT_STOPS_PATH}
            className="inline-flex h-12 min-w-40 items-center justify-center rounded-md border border-primary bg-primary px-6 text-lg font-bold text-primary-foreground hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            목록으로
          </Link>
        }
      >
        <ApplyComplete objectionId={submittedId} />
      </StepLayout>
    )
  }

  if (isPending) return <LoadingCases />
  if (isError) {
    return <CasesLoadError error={error} onRetry={() => void refetch()} />
  }
  if (!item) return <CaseNotFound />
  if (item.objectionId != null) {
    return (
      <EmptyState
        message="이미 이의제기를 신청한 사건입니다."
        description={`접수 번호 ${item.objectionId}. 진행 상황은 목록에서 확인하세요.`}
        action={<BackToList />}
      />
    )
  }
  if (isDeadlinePassed(item, getToday())) {
    return (
      <EmptyState
        message="이의제기 신청 기한이 지났습니다."
        description={`신청 기한은 ${formatDate(item.objectionDeadline)}였습니다.`}
        action={<BackToList />}
      />
    )
  }

  return <ApplyFlow item={item} onSubmitted={setSubmittedId} />
}

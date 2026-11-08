import * as React from "react"
import { Link } from "react-router"
import {
  formatClause,
  summarizeFiles,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import { formatFileSize } from "@/shared/lib/file-size"
import { formatAmount } from "@/shared/lib/format"
import { Alert } from "@/shared/ui/alert"
import { Checkbox } from "@/shared/ui/checkbox"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Spinner } from "@/shared/ui/spinner"
import type { ApplyFiles, ApplyForm } from "@/pages/objection/h02-apply-draft"
import {
  MY_PAYMENT_STOPS_PATH,
  type SubmitFailure,
} from "@/pages/objection/objection-shared"

type Props = {
  item: MyPaymentStop
  form: ApplyForm
  files: ApplyFiles
  agreed: boolean
  agreeError: string | null
  onAgreeChange: (checked: boolean) => void
  agreeRef: React.Ref<HTMLInputElement>
  isSubmitting: boolean
  submitError: SubmitFailure | null
}

const Value = ({ children }: { children: React.ReactNode }) => (
  <span className="text-base text-ink">{children}</span>
)

const FileNames = ({ files }: { files: File[] }) =>
  files.length === 0 ? (
    <Value>없음</Value>
  ) : (
    <ul className="flex flex-col gap-0.5">
      {files.map((file, index) => (
        <li key={`${file.name}-${index}`} className="text-base text-ink">
          {file.name}{" "}
          <span className="text-xs text-ink-muted">
            {formatFileSize(file.size)}
          </span>
        </li>
      ))}
    </ul>
  )

/** 3단계 내용 확인과 제출. 보낼 내용을 그대로 보이고 사실 확인을 받는다. */
export const ApplyConfirmStep = ({
  item,
  form,
  files,
  agreed,
  agreeError,
  onAgreeChange,
  agreeRef,
  isSubmitting,
  submitError,
}: Props) => {
  const all = [...files.idCopy, ...files.evidence]
  const summary = summarizeFiles(all)

  return (
    <>
      <FormSection title="신청 내용 확인">
        <FormRow label="지급정지 계좌">
          <Value>{item.accountNumberMasked}</Value>
        </FormRow>
        <FormRow label="다툼 금액">
          <Value>{formatAmount(item.disputedTotal)}</Value>
        </FormRow>
        <FormRow label="이의제기 사유">
          <Value>{form.clause != null ? formatClause(form.clause) : "-"}</Value>
        </FormRow>
        <FormRow label="소명 내용">
          <p className="w-full text-base leading-relaxed break-words whitespace-pre-wrap text-ink">
            {form.statement.trim()}
          </p>
        </FormRow>
        <FormRow label="간소화 절차">
          <Value>{form.simplifiedRequested ? "신청함" : "신청 안 함"}</Value>
        </FormRow>
        <FormRow label="소송 중">
          <Value>{form.litigationPending ? "예" : "아니요"}</Value>
        </FormRow>
        <FormRow label="신분증 사본">
          <FileNames files={files.idCopy} />
        </FormRow>
        <FormRow label="증빙 서류">
          <FileNames files={files.evidence} />
        </FormRow>
        <FormRow label="첨부 합계">
          <Value>
            {summary.count}개, {formatFileSize(summary.totalBytes)}
          </Value>
        </FormRow>
      </FormSection>

      <div className="flex flex-col gap-1">
        <Checkbox
          ref={agreeRef}
          label="기재한 내용과 첨부한 서류가 사실과 같음을 확인합니다."
          checked={agreed}
          disabled={isSubmitting}
          aria-invalid={agreeError ? true : undefined}
          aria-describedby={agreeError ? "apply-agree-error" : undefined}
          onChange={(event) => onAgreeChange(event.target.checked)}
        />
        {agreeError && (
          <p id="apply-agree-error" className="text-2xs text-danger">
            {agreeError}
          </p>
        )}
      </div>

      <div aria-live="polite" className="mt-4">
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
        <Alert variant="danger" title="제출하지 못했습니다" className="mt-2">
          {submitError.message && <p>{submitError.message}</p>}
          {submitError.final ? (
            <p className="mt-1">
              이 사건은 다시 제출해도 접수되지 않습니다.{" "}
              <Link
                to={MY_PAYMENT_STOPS_PATH}
                className="font-bold text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                지급정지 이의제기 목록
              </Link>
              에서 사건의 진행 상황을 확인하세요.
            </p>
          ) : (
            <p className="mt-1">
              입력한 내용과 첨부 파일은 그대로 있습니다. 아래 다시 제출을
              누르세요. 파일 문제라면 이전 단계에서 파일을 바꾼 뒤 제출하세요.
            </p>
          )}
        </Alert>
      )}
    </>
  )
}

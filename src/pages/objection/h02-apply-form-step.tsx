import * as React from "react"
import {
  CLAUSE_HELP,
  CLAUSE_LABEL,
  OBJECTION_CLAUSES,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import { Checkbox } from "@/shared/ui/checkbox"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Radio } from "@/shared/ui/radio"
import { Textarea } from "@/shared/ui/textarea"
import { CaseInfoRows } from "@/pages/objection/objection-case-parts"
import {
  MAX_STATEMENT_LENGTH,
  type ApplyForm,
  type ApplyFormErrors,
} from "@/pages/objection/h02-apply-draft"

export type ApplyFormStepHandle = {
  /** 첫 오류 칸으로 초점을 옮긴다 */
  focusFirstError: (errors: ApplyFormErrors) => void
}

type Props = {
  item: MyPaymentStop
  form: ApplyForm
  errors: ApplyFormErrors
  onChange: <K extends keyof ApplyForm>(key: K, value: ApplyForm[K]) => void
  handleRef: React.Ref<ApplyFormStepHandle>
}

const FieldError = ({ id, message }: { id: string; message?: string }) =>
  message ? (
    <p id={id} className="w-full text-2xs text-danger">
      {message}
    </p>
  ) : null

/** 1단계 신청서 작성. 사유 조항, 소명, 간소화 절차, 소송 계속. */
export const ApplyFormStep = ({
  item,
  form,
  errors,
  onChange,
  handleRef,
}: Props) => {
  const firstClauseRef = React.useRef<HTMLInputElement>(null)
  const statementRef = React.useRef<HTMLTextAreaElement>(null)

  React.useImperativeHandle(handleRef, () => ({
    focusFirstError: (next) => {
      if (next.clause) firstClauseRef.current?.focus()
      else if (next.statement) statementRef.current?.focus()
    },
  }))

  const statementDescribedBy = [
    "apply-statement-count",
    errors.statement ? "apply-statement-error" : null,
  ]
    .filter((value) => value != null)
    .join(" ")

  return (
    <>
      <FormSection title="지급정지 계좌">
        <CaseInfoRows item={item} />
      </FormSection>

      <FormSection title="이의제기 내용" className="mb-0">
        <div
          role="radiogroup"
          aria-labelledby="apply-clause-label"
          aria-describedby={errors.clause ? "apply-clause-error" : undefined}
          aria-invalid={errors.clause ? true : undefined}
          aria-required="true"
        >
          <FormRow
            label={<span id="apply-clause-label">이의제기 사유</span>}
            required
          >
            <div className="flex flex-col gap-3 py-1">
              {OBJECTION_CLAUSES.map((clause, index) => (
                <div key={clause} className="flex flex-col gap-0.5">
                  <Radio
                    ref={index === 0 ? firstClauseRef : undefined}
                    name="apply-clause"
                    value={clause}
                    label={`제${clause}호 ${CLAUSE_LABEL[clause]}`}
                    checked={form.clause === clause}
                    aria-describedby={`apply-clause-help-${clause}`}
                    onChange={() => onChange("clause", clause)}
                  />
                  <span
                    id={`apply-clause-help-${clause}`}
                    className="pl-6.5 text-2xs text-ink-muted"
                  >
                    {CLAUSE_HELP[clause]}
                  </span>
                </div>
              ))}
            </div>
            <FieldError id="apply-clause-error" message={errors.clause} />
          </FormRow>
        </div>

        <FormRow label="소명 내용" htmlFor="apply-statement" required>
          <Textarea
            ref={statementRef}
            id="apply-statement"
            className="min-h-40"
            maxLength={MAX_STATEMENT_LENGTH}
            placeholder="돈을 받은 경위와 상대방과의 관계, 거래 내용을 구체적으로 적어 주세요."
            value={form.statement}
            invalid={errors.statement != null}
            aria-required="true"
            aria-describedby={statementDescribedBy}
            onChange={(event) => onChange("statement", event.target.value)}
          />
          <FieldError id="apply-statement-error" message={errors.statement} />
          <span
            id="apply-statement-count"
            className="ml-auto text-2xs text-ink-faint"
          >
            {form.statement.length.toLocaleString("ko-KR")} /{" "}
            {MAX_STATEMENT_LENGTH.toLocaleString("ko-KR")}자
          </span>
        </FormRow>

        <FormRow label="함께 신청할 내용">
          <div className="flex flex-col gap-3 py-1">
            <div className="flex flex-col gap-0.5">
              <Checkbox
                label="일부 지급정지 간소화 절차 신청"
                checked={form.simplifiedRequested}
                aria-describedby="apply-simplified-help"
                onChange={(event) =>
                  onChange("simplifiedRequested", event.target.checked)
                }
              />
              <span
                id="apply-simplified-help"
                className="pl-6.5 text-2xs text-ink-muted"
              >
                피해금만 지급정지로 남기고 나머지 금액을 먼저 풀어 달라는
                신청입니다. 계좌에 지급정지 이력이 있으면 일반 심사로
                진행합니다.
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <Checkbox
                label="피해자와 이 돈을 두고 소송 중"
                checked={form.litigationPending}
                aria-describedby="apply-litigation-help"
                onChange={(event) =>
                  onChange("litigationPending", event.target.checked)
                }
              />
              <span
                id="apply-litigation-help"
                className="pl-6.5 text-2xs text-ink-muted"
              >
                소송이 진행 중이면 표시하세요. 소송 중에는 판결이 날 때까지
                지급정지가 풀리지 않을 수 있습니다.
              </span>
            </div>
          </div>
        </FormRow>
      </FormSection>
    </>
  )
}

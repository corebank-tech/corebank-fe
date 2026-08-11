import * as React from "react"
import { Checkbox } from "@/shared/ui/checkbox"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Modal } from "@/shared/ui/modal"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import type { TermItem } from "@/shared/types/term"

type TermsAgreementProps = {
  terms: TermItem[]
  /**
   * 필수 항목이 모두 체크되면 true 로 올려준다.
   * 부모는 이 값으로 onNext 버튼의 활성화를 제어한다.
   */
  onAllRequiredAgreedChange?: (allRequiredAgreed: boolean) => void
}

export type TermsAgreementHandle = {
  /**
   * 다음 단계 진행 가능 여부를 검사한다. 필수 약관 중 미열람 항목이 있으면
   * 안내 팝업을 띄운 뒤 확인 시 해당 약관 전문을 열어준다(REQ-AUTH-004).
   * 열람은 했지만 미동의 상태면 별도 안내만 띄운다. 통과 시에만 true.
   */
  validateProceed: () => boolean
}

/**
 * 약관동의 블록. 회원가입 1단계(A-02)와 상품가입 1단계(C-03)가 공용한다.
 * 데이터는 props 로만 받고, 체크 상태만 내부에서 관리하는 프레젠테이션 컴포넌트.
 * 전문을 열람하지 않은 약관은 체크할 수 없다(REQ-AUTH-003).
 */
export const TermsAgreement = React.forwardRef<
  TermsAgreementHandle,
  TermsAgreementProps
>(({ terms, onAllRequiredAgreedChange }, ref) => {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [viewed, setViewed] = React.useState<Record<string, boolean>>({})
  const [viewing, setViewing] = React.useState<TermItem | null>(null)
  const [blocked, setBlocked] = React.useState<{
    message: string
    openTerm?: TermItem
  } | null>(null)

  const allRequiredAgreed = terms
    .filter((t) => t.required)
    .every((t) => checked[t.id])

  React.useEffect(() => {
    onAllRequiredAgreedChange?.(allRequiredAgreed)
  }, [allRequiredAgreed, onAllRequiredAgreedChange])

  const openTerm = (term: TermItem) => {
    setViewed((prev) => ({ ...prev, [term.id]: true }))
    setViewing(term)
  }

  const toggleOne = (id: string) => {
    if (!viewed[id]) return
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const agreeFromModal = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: true }))
    setViewing(null)
  }

  React.useImperativeHandle(ref, () => ({
    validateProceed: () => {
      if (allRequiredAgreed) return true
      const unviewed = terms.find((t) => t.required && !viewed[t.id])
      if (unviewed) {
        setBlocked({
          message: "고객동의서를 확인 후 진행하여 주십시오.",
          openTerm: unviewed,
        })
      } else {
        setBlocked({
          message: "필수 약관에 모두 동의해야 다음 단계로 진행할 수 있습니다.",
        })
      }
      return false
    },
  }))

  return (
    <div className="overflow-hidden border border-border">
      <ul>
        {terms.map((term) => (
          <li key={term.id} className="border-t border-border">
            {/* 윗줄: 뱃지 + 약관명 + 보기 */}
            <div className="flex items-center justify-between gap-3 px-5 pt-4">
              <div className="flex items-center gap-2">
                <Badge variant={term.required ? "primary" : "neutral"}>
                  {term.required ? "필수" : "선택"}
                </Badge>
                <span className="text-base font-bold text-ink">
                  {term.title}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openTerm(term)}
              >
                보기
              </Button>
            </div>

            {/* 아랫줄: 동의 질문 + 체크박스 */}
            <div className="mx-5 my-3 flex items-center justify-between gap-3 rounded-md bg-surface-2 px-4 py-3">
              <label
                htmlFor={`agree-${term.id}`}
                className="text-base text-ink-muted"
              >
                {viewed[term.id]
                  ? term.question
                  : `${term.question} (전문을 먼저 확인하세요.)`}
              </label>
              <Checkbox
                id={`agree-${term.id}`}
                checked={!!checked[term.id]}
                disabled={!viewed[term.id]}
                onChange={() => toggleOne(term.id)}
                aria-label={`${term.title} 동의`}
              />
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing?.title ?? ""}
        size="lg"
        footer={
          viewing && (
            <>
              <Button variant="secondary" onClick={() => setViewing(null)}>
                닫기
              </Button>
              <Button onClick={() => agreeFromModal(viewing.id)}>동의</Button>
            </>
          )
        }
      >
        <div className="max-h-[52vh] overflow-y-auto text-base leading-relaxed whitespace-pre-line text-ink">
          {viewing?.body}
        </div>
      </Modal>

      <AlertDialog
        open={blocked !== null}
        onClose={() => setBlocked(null)}
        title="약관 동의 확인"
        messages={blocked ? [blocked.message] : []}
        onConfirm={() => {
          const term = blocked?.openTerm
          setBlocked(null)
          if (term) openTerm(term)
        }}
      />
    </div>
  )
})

TermsAgreement.displayName = "TermsAgreement"

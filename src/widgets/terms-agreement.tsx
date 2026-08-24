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
  /**
   * 동의한 항목의 id 목록. 선택 약관 동의까지 서버에 실어 보내야 하는 화면(C-03)이
   * 쓴다. 필수만 필터해 보내면 고객이 동의한 선택 약관이 이력에서 누락된다.
   */
  onAgreedChange?: (agreedIds: string[]) => void
  /**
   * [보기] 를 눌러 전문을 열 때 호출된다. 전문을 서버에서 받아오는 화면(C-03)이
   * 이 시점에 조회를 걸고, 서버는 그 요청으로 열람 이력을 남긴다.
   * 전달한 `terms` 의 body 가 갱신되면 열려 있는 모달에도 그대로 반영된다.
   */
  onView?: (id: string) => void
}

/** 동의한 약관 id 를 하나의 키로 잇는 구분자. 약관 id 에 들어갈 수 없는 문자를 쓴다. */
const AGREED_ID_SEPARATOR = "\u0000"

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
>(({ terms, onAllRequiredAgreedChange, onAgreedChange, onView }, ref) => {
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [viewed, setViewed] = React.useState<Record<string, boolean>>({})
  // 열람 중인 약관은 객체가 아니라 id 로 들고 terms 에서 찾는다. 전문을 나중에
  // 받아오는 화면에서 body 가 도착했을 때 열려 있는 모달이 옛 객체를 계속
  // 가리키지 않게 하기 위해서다.
  const [viewingId, setViewingId] = React.useState<string | null>(null)
  const viewing = terms.find((t) => t.id === viewingId) ?? null
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

  // 동의한 항목을 terms 순서대로 이어붙인 키. 배열을 그대로 effect 의존성에 쓰면
  // terms 를 렌더마다 새로 만드는 소비자에서 effect → 부모 setState → 리렌더가
  // 끝없이 반복된다. 값이 실제로 바뀔 때만 올려보낸다.
  const agreedKey = terms
    .filter((t) => checked[t.id])
    .map((t) => t.id)
    .join(AGREED_ID_SEPARATOR)

  React.useEffect(() => {
    onAgreedChange?.(
      agreedKey === "" ? [] : agreedKey.split(AGREED_ID_SEPARATOR),
    )
  }, [agreedKey, onAgreedChange])

  const openTerm = (term: TermItem) => {
    setViewed((prev) => ({ ...prev, [term.id]: true }))
    setViewingId(term.id)
    onView?.(term.id)
  }

  const toggleOne = (id: string) => {
    if (!viewed[id]) return
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const agreeFromModal = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: true }))
    setViewingId(null)
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
        onClose={() => setViewingId(null)}
        title={viewing?.title ?? ""}
        size="lg"
        footer={
          viewing && (
            <>
              <Button variant="secondary" onClick={() => setViewingId(null)}>
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

import * as React from "react"
import { AlertTriangle, ChevronDown } from "lucide-react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/lib/utils"
import {
  CUSTOMER_CENTER_PHONE,
  CUSTOMER_CENTER_HOURS,
} from "@/shared/config/contact"

type ErrorDialogProps = {
  open: boolean
  onClose: () => void
  /** Title bar text. */
  title?: React.ReactNode
  /** What went wrong and how to fix it. One or more lines. */
  messages: React.ReactNode[]
  /** Error code shown for reference, e.g. "E-40312". */
  code?: string
  confirmLabel?: string
  onConfirm?: () => void
}

/**
 * A-92 오류 다이얼로그. Danger-toned modal with a warning icon, a plain-language
 * error message, and a reference error code. Never surfaces stack traces,
 * internal paths, or SQL. REQ-CMN-009: 오류코드는 접기/펼치기 영역에, 고객센터
 * 안내를 함께 표시한다.
 */
export const ErrorDialog = ({
  open,
  onClose,
  title = "오류",
  messages,
  code,
  confirmLabel = "확인",
  onConfirm,
}: ErrorDialogProps) => {
  const [codeOpen, setCodeOpen] = React.useState(false)

  // 닫힐 때 오류코드 펼침 상태를 지운다. effect 대신 렌더 중 상태 조정
  // 패턴(React 공식 가이드 "Adjusting state when a prop changes")을 쓴다.
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (!open) setCodeOpen(false)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      tone="danger"
      size="sm"
      footer={
        <Button
          variant="danger"
          size="lg"
          className="min-w-30"
          onClick={onConfirm ?? onClose}
        >
          {confirmLabel}
        </Button>
      }
    >
      <div className="flex flex-col items-center">
        <span
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-danger-tint text-danger"
          aria-hidden="true"
        >
          <AlertTriangle className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <div className="text-center">
          {messages.map((line, i) => (
            <p key={i} className="text-base leading-relaxed text-ink">
              {line}
            </p>
          ))}
        </div>

        <p className="mt-4 text-base text-ink-muted">
          {`문제가 반복되면 고객센터 ${CUSTOMER_CENTER_PHONE}(${CUSTOMER_CENTER_HOURS})으로 문의하세요.`}
        </p>

        {code && (
          <div className="mt-3 w-full">
            <button
              type="button"
              onClick={() => setCodeOpen((v) => !v)}
              aria-expanded={codeOpen}
              className="mx-auto flex items-center gap-1 text-xs text-ink-faint hover:text-ink-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              오류코드 보기
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  codeOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
            {codeOpen && (
              <p className="mt-1.5 text-center font-tabular text-base text-ink-muted">
                오류코드 : {code}
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

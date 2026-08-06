import * as React from "react"
import { Info } from "lucide-react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"

type AlertDialogProps = {
  open: boolean
  onClose: () => void
  /** Title bar text. */
  title?: React.ReactNode
  /** What the user needs to know, one or more lines. */
  messages: React.ReactNode[]
  confirmLabel?: string
  /** Runs instead of onClose when the single button is clicked, e.g. to open a follow-up modal. */
  onConfirm?: () => void
}

/**
 * REQ-CMN-010 공통 알림 팝업(Alert). 확인 버튼 1개만 갖는 단순 안내 팝업으로,
 * 실행 전 재확인이 필요한 ConfirmDialog나 서버 오류를 다루는 ErrorDialog와는 별도로
 * 입력값 검증·진행 차단 등 클라이언트 안내에 사용한다(REQ-CMN-011).
 */
export const AlertDialog = ({
  open,
  onClose,
  title = "안내",
  messages,
  confirmLabel = "확인",
  onConfirm,
}: AlertDialogProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="min-w-30"
          onClick={onConfirm ?? onClose}
        >
          {confirmLabel}
        </Button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <span
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary"
          aria-hidden="true"
        >
          <Info className="h-7 w-7" strokeWidth={2.25} />
        </span>
        {messages.map((line, i) => (
          <p key={i} className="text-base leading-relaxed text-ink">
            {line}
          </p>
        ))}
      </div>
    </Modal>
  )
}

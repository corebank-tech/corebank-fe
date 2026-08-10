import * as React from "react"
import { Check } from "lucide-react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"

export type ConfirmDialogItem = {
  label: React.ReactNode
  value: React.ReactNode
}

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  /** Title bar text. */
  title?: React.ReactNode
  /** Up to two guidance lines shown under the icon. */
  messages?: React.ReactNode[]
  /** label : value review rows, framed in a scrollable box. Omit to show messages only. */
  items?: ConfirmDialogItem[]
  cancelLabel?: string
  confirmLabel?: string
}

/**
 * A-91 확인 다이얼로그. Modal shell + a circular check mark, one or two
 * guidance lines, and a bordered (scrollable) list of label : value rows the
 * user reviews before committing an action.
 */
export const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "거래내용 확인",
  messages = ["아래 내용을 확인합니다.", "확인을 누르면 거래가 실행됩니다."],
  items = [],
  cancelLabel = "취소",
  confirmLabel = "확인",
}: ConfirmDialogProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center">
        <span
          className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-tint text-primary"
          aria-hidden="true"
        >
          <Check className="h-7 w-7" strokeWidth={2.5} />
        </span>
        <div className="mb-5 text-center">
          {messages.map((line, i) => (
            <p key={i} className="text-base leading-relaxed font-bold text-ink">
              {line}
            </p>
          ))}
        </div>
      </div>

      {items.length > 0 && (
        <div className="max-h-[240px] overflow-y-auto rounded-md border border-border bg-surface-2 px-5 py-4">
          <dl className="flex flex-col gap-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 text-base leading-relaxed">
                <dt className="shrink-0 font-bold text-ink">{item.label}</dt>
                <dd className="min-w-0 flex-1 text-ink">: {item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </Modal>
  )
}

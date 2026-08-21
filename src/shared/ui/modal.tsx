import * as React from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"
import { cn } from "@/shared/lib/utils"

type ModalSize = "sm" | "md" | "lg"
type ModalTone = "primary" | "danger"

const MODAL_SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-120",
  md: "max-w-160",
  lg: "max-w-220",
}

const MODAL_TONE_CLASSES: Record<ModalTone, string> = {
  primary: "bg-primary text-primary-foreground",
  danger: "bg-danger text-white",
}

type ModalProps = {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  /** Title bar color. Use "danger" for error dialogs. */
  tone?: ModalTone
  size?: ModalSize
  /** Centered action row pinned to the bottom of the modal. */
  footer?: React.ReactNode
  /** Close when the overlay backdrop is clicked. Defaults to true. */
  closeOnOverlay?: boolean
  /** Close when the Escape key is pressed. Defaults to true. */
  closeOnEsc?: boolean
  /** Hide the title-bar close (X) button. */
  hideCloseButton?: boolean
  children: React.ReactNode
}

/**
 * Shared modal shell: a colored title bar with an optional close button, a
 * white padded body, and a centered footer action row. Rendered in a portal
 * over a translucent black overlay. ESC and overlay clicks close it unless
 * disabled.
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const Modal = ({
  open,
  onClose,
  title,
  tone = "primary",
  size = "md",
  footer,
  closeOnOverlay = true,
  closeOnEsc = true,
  hideCloseButton = false,
  children,
}: ModalProps) => {
  const titleId = React.useId()
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const [prevOpen, setPrevOpen] = React.useState(open)
  const [previouslyFocused, setPreviouslyFocused] =
    React.useState<HTMLElement | null>(null)

  // open이 false→true로 바뀌는 렌더 시점(커밋·autoFocus 이전)에 캡처해야
  // 실제 트리거 요소를 얻는다 — effect 안에서 읽으면 다이얼로그 내부의
  // autoFocus 요소가 이미 activeElement가 된 뒤라 잘못된 값을 저장한다.
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open && typeof document !== "undefined") {
      setPreviouslyFocused(document.activeElement as HTMLElement | null)
    }
  }

  React.useEffect(() => {
    if (!open || !closeOnEsc) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, closeOnEsc, onClose])

  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // 열릴 때 다이얼로그 안으로 포커스를 옮기고, Tab/Shift+Tab을 다이얼로그
  // 안에 가둔 뒤, 닫히면 이전에 포커스가 있던 요소로 되돌린다.
  React.useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    // children의 autoFocus가 이미 다이얼로그 안으로 포커스를 옮겨뒀다면
    // 그대로 존중하고 덮어쓰지 않는다.
    const alreadyFocusedInside =
      !!dialog && dialog.contains(document.activeElement)
    if (!alreadyFocusedInside) {
      const firstFocusable =
        dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
      ;(firstFocusable ?? dialog)?.focus()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("keydown", onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, previouslyFocused])

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div
      className="fixed inset-0 z-modal flex items-center justify-center bg-overlay-scrim p-6"
      onMouseDown={(e) => {
        if (closeOnOverlay && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "flex max-h-[calc(100vh-48px)] w-full flex-col overflow-hidden rounded-lg bg-surface-elevated shadow-pop",
          MODAL_SIZE_CLASSES[size],
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-center justify-between gap-4 px-6 py-3.5",
            MODAL_TONE_CLASSES[tone],
          )}
        >
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          {!hideCloseButton && (
            <IconButton
              size="sm"
              onClick={onClose}
              aria-label="닫기"
              className="text-current hover:bg-overlay-white-15 focus-visible:ring-overlay-white-70"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-surface-elevated px-6 py-6">
          {children}
        </div>

        {footer != null && (
          <div className="flex shrink-0 items-center justify-center gap-2 border-t border-border px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

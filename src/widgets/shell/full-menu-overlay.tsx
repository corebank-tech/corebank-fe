import * as React from "react"
import { Link } from "react-router"
import { X } from "lucide-react"
import { NAV } from "@/shared/config/nav"
import { IconButton } from "@/shared/ui/icon-button"

type FullMenuOverlayProps = {
  open: boolean
  onClose: () => void
}

export const FullMenuOverlay = ({ open, onClose }: FullMenuOverlayProps) => {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="전체메뉴"
    >
      <div
        className="absolute inset-0 bg-overlay-scrim"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-x-0 top-0 bg-surface-elevated shadow-pop">
        <div className="mx-auto w-320 px-4">
          <div className="flex h-18 items-center justify-between border-b border-border">
            <span className="text-h2 leading-[1.5] font-heading text-primary">
              전체메뉴
            </span>
            <IconButton
              onClick={onClose}
              className="text-ink-muted hover:bg-primary-tint hover:text-primary"
              aria-label="전체메뉴 닫기"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          </div>

          <div className="grid grid-cols-4 gap-8 pt-8 pb-12">
            {NAV.map((cat) => (
              <div key={cat.id}>
                <h3 className="mb-3 text-lg leading-[1.5] font-heading text-primary">
                  {cat.label}
                </h3>
                <div className="flex flex-col gap-4">
                  {cat.groups.map((group) => (
                    <div key={group.title}>
                      <p className="mb-1 text-base leading-[1.5] whitespace-nowrap text-ink-faint">
                        {group.title}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {group.items.map((item) => (
                          <li key={`${item.screenId}-${item.path}`}>
                            <Link
                              to={item.path}
                              data-screen-id={item.screenId}
                              onClick={onClose}
                              className="inline-block py-0.5 text-lg leading-[1.5] font-label whitespace-nowrap text-ink hover:text-primary hover:underline"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

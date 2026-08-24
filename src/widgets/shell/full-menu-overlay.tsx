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
    // 상단 GNB 헤더(h-18)는 그대로 두고, 그 아래 영역만 메뉴 시트로 덮는다.
    <nav
      id="full-menu"
      aria-label="전체 메뉴"
      className="fixed inset-x-0 top-18 bottom-0 z-overlay"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 overflow-y-auto bg-surface-elevated"
      >
        <div
          className="mx-auto w-320 px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-18 items-center justify-between border-b border-border">
            <span className="text-page leading-[1.5] font-heading text-ink">
              전체메뉴
            </span>
            <IconButton
              onClick={onClose}
              className="border border-border bg-surface-elevated text-ink-muted hover:bg-surface hover:text-ink"
              aria-label="전체메뉴 닫기"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          </div>

          <div className="grid grid-cols-4 gap-x-12 pb-12">
            {NAV.map((cat) => (
              <div key={cat.id} className="pt-10">
                <h3 className="mb-6 text-h2 leading-[1.5] font-heading text-primary">
                  {cat.label}
                </h3>
                <div className="flex flex-col gap-10">
                  {cat.groups.map((group) => (
                    <div key={group.title}>
                      <p className="mb-4 flex items-center gap-2 text-lg leading-[1.5] font-heading whitespace-nowrap text-ink">
                        <span
                          aria-hidden="true"
                          className="h-4 w-0.5 bg-primary"
                        />
                        {group.title}
                      </p>
                      <ul className="flex flex-col gap-5 pl-3">
                        {group.items.map((item) => (
                          <li key={`${item.screenId}-${item.path}`}>
                            <Link
                              to={item.path}
                              data-screen-id={item.screenId}
                              onClick={onClose}
                              className="inline-block text-base leading-[1.5] font-label whitespace-nowrap text-ink-muted hover:text-primary hover:underline"
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
    </nav>
  )
}

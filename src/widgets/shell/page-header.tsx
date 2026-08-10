import * as React from "react"
import { Star, Type, Printer } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"

type PageHeaderProps = {
  title: React.ReactNode
  /** [텍스트 크기 조절] 클릭 시 호출. 생략 시 버튼은 비활성 표시된다. */
  onCycleTextScale?: () => void
  /** 현재 텍스트 확대가 적용된 상태인지(버튼 강조 표시용). */
  textScaleActive?: boolean
}

const ICON_BTN_CLASS =
  "border border-border bg-surface-elevated text-ink-muted hover:bg-surface hover:text-ink"

export const PageHeader = ({
  title,
  onCycleTextScale,
  textScaleActive = false,
}: PageHeaderProps) => {
  const [favorite, setFavorite] = React.useState(false)
  const [printConfirmOpen, setPrintConfirmOpen] = React.useState(false)

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h1 className="text-page font-bold text-balance text-ink">{title}</h1>
      <div className="flex shrink-0 items-center gap-1.5">
        <IconButton
          onClick={() => setFavorite((v) => !v)}
          aria-pressed={favorite}
          className={cn(
            ICON_BTN_CLASS,
            favorite && "border-primary text-primary",
          )}
          aria-label={favorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
        >
          <Star
            className="h-4.5 w-4.5"
            fill={favorite ? "currentColor" : "none"}
            aria-hidden="true"
          />
        </IconButton>
        <IconButton
          onClick={onCycleTextScale}
          aria-pressed={textScaleActive}
          className={cn(
            ICON_BTN_CLASS,
            textScaleActive && "border-primary text-primary",
          )}
          aria-label="텍스트 크기 조절"
        >
          <Type className="h-4.5 w-4.5" aria-hidden="true" />
        </IconButton>
        <IconButton
          onClick={() => setPrintConfirmOpen(true)}
          className={ICON_BTN_CLASS}
          aria-haspopup="dialog"
          aria-label="인쇄"
        >
          <Printer className="h-4.5 w-4.5" aria-hidden="true" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={printConfirmOpen}
        onClose={() => setPrintConfirmOpen(false)}
        onConfirm={() => {
          setPrintConfirmOpen(false)
          window.print()
        }}
        title="인쇄 확인"
        messages={[<>{title} 화면을 인쇄하시겠습니까?</>]}
        confirmLabel="인쇄"
        cancelLabel="취소"
      />
    </div>
  )
}

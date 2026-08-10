import * as React from "react"
import { Accessibility, Download, Printer, Search } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Select } from "@/shared/ui/select"
import { Divider } from "@/shared/ui/divider"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 30, 50] as const

type GridToolbarProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Period range label, e.g. "2026.06.23 ~ 2026.07.23". */
  periodLabel?: React.ReactNode
  /** Total result count. */
  totalCount: number
  /** Current page size. Use "all" for 전체. */
  pageSize: number | "all"
  onPageSizeChange?: (size: number | "all") => void
  /** Reference timestamp label, e.g. "2026.07.23 08:57:34". */
  baseTimeLabel?: React.ReactNode
  onPrint?: () => void
  onBrailleView?: () => void
  onSaveFile?: () => void
  /** What onSaveFile downloads, e.g. "예약이체 조회 결과". Shown in the confirm dialog. */
  saveFileLabel?: string
  onSearch?: () => void
}

export const GridToolbar = ({
  periodLabel,
  totalCount,
  pageSize,
  onPageSizeChange,
  baseTimeLabel,
  onPrint,
  onBrailleView,
  onSaveFile,
  saveFileLabel,
  onSearch,
  className,
  ...props
}: GridToolbarProps) => {
  const [saveConfirmOpen, setSaveConfirmOpen] = React.useState(false)

  return (
    <div className={cn("mb-2 flex flex-col gap-1", className)} {...props}>
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-center gap-2 text-base text-ink">
          <span className="font-bold text-ink">조회결과</span>
          {periodLabel != null && (
            <>
              <Divider tone="ink-faint" />
              <span className="text-ink-muted">{periodLabel}</span>
            </>
          )}
          <span className="font-bold text-primary">
            [총 {totalCount.toLocaleString("ko-KR")}건]
          </span>
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            onClick={onPrint}
          >
            <Printer className="h-4 w-4" aria-hidden="true" />
            보고서인쇄
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            onClick={onBrailleView}
          >
            <Accessibility className="h-4 w-4" aria-hidden="true" />
            점자보기
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            aria-haspopup="dialog"
            onClick={() => setSaveConfirmOpen(true)}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            파일저장
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            onClick={onSearch}
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            검색
          </Button>
          <label className="sr-only" htmlFor="grid-page-size">
            페이지당 표시 개수
          </label>
          <Select
            id="grid-page-size"
            className="h-8 w-[104px] text-base"
            value={String(pageSize)}
            onChange={(e) => {
              const v = e.target.value
              onPageSizeChange?.(v === "all" ? "all" : Number(v))
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개 보기
              </option>
            ))}
            <option value="all">전체 보기</option>
          </Select>
        </div>
      </div>

      {baseTimeLabel != null && (
        <p className="text-right text-2xs text-ink-muted">
          기준일시 : {baseTimeLabel}
        </p>
      )}

      <ConfirmDialog
        open={saveConfirmOpen}
        onClose={() => setSaveConfirmOpen(false)}
        onConfirm={() => {
          setSaveConfirmOpen(false)
          onSaveFile?.()
        }}
        title="파일저장 확인"
        messages={[`${saveFileLabel ?? "조회 결과"} 파일을 저장하시겠습니까?`]}
        confirmLabel="저장"
        cancelLabel="취소"
      />
    </div>
  )
}

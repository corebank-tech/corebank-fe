import * as React from "react"
import { Accessibility, Download, Printer, Search } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Select } from "@/shared/ui/select"
import { Divider } from "@/shared/ui/divider"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { cn } from "@/shared/lib/utils"
import { QUERY_PAGE_SIZE_OPTIONS } from "@/shared/config/policy"

type GridToolbarProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Period range label, e.g. "2026.06.23 ~ 2026.07.23". */
  periodLabel?: React.ReactNode
  /** Total result count. */
  totalCount: number
  /** Current page size. Use "all" for 전체. */
  pageSize: number | "all"
  onPageSizeChange?: (size: number | "all") => void
  /**
   * "전체 보기" 선택지를 노출할지. 기본값은 노출이라 기존 화면은 그대로다.
   *
   * POL-022·REQ-CMN-019는 페이징 건수 선택지를 `5·10·20·30·50·전체` 6종으로
   * 규정한다. 즉 이 prop을 끄는 것은 **규정 미충족 상태를 감수하는 임시 조치**다 —
   * 서버가 페이지 크기를 5·10·20·30·50 화이트리스트로 막아(CMN0005) 전체를
   * 요청할 방법이 없고, 큰 수를 잘라 보내면 사용자는 전체를 골랐다고 믿는 채
   * 일부만 보게 되기 때문이다.
   *
   * 서버에 전체 조회 수단을 요청해 두었다(corebank-server#297). 그것이 들어오면
   * 이 prop은 제거하고, 지금 `false`를 넘기는 서버 페이징 화면 5개
   * (B-03·E-04·E-05·G-04·G-05)가 "전체 보기"를 되살린다. 클라이언트가 전체
   * 목록을 들고 페이지 크기로 잘라 쓰는 화면(D-04·F-02)은 기본값 그대로 두면
   * 된다. B-01은 `pageSize`를 이 툴바에 넘기기만 하고 목록을 자르는 데 쓰지
   * 않아 어느 값을 골라도 결과가 같다 — 별개의 기존 문제다.
   */
  showAllOption?: boolean
  /** Reference timestamp label, e.g. "2026.07.23 08:57:34". */
  baseTimeLabel?: React.ReactNode
  onPrint?: () => void
  onBrailleView?: () => void
  onSaveFile?: () => void
  /**
   * What onPrint/onSaveFile produces, e.g. "예약이체 조회 결과". Shown in the confirm dialog.
   *
   * 서버 페이징 화면은 "현재 페이지 …"로 적는다. 인쇄·파일저장·점자보기가 모두
   * 현재 페이지 행만 담는데, 라벨이 "예약이체조회"면 사용자는 전체가 저장된다고
   * 믿고 확인을 누른다 — `showAllOption`을 되살리지 않은 이유와 같은 문제다.
   *
   * TODO: 서버에 전체 조회 수단이 들어오면(corebank-server#297) 파일저장은 전체를
   * 담도록 바꾸고 이 라벨도 되돌린다.
   */
  resultLabel?: string
  onSearch?: () => void
}

type PendingAction = "print" | "save" | null

export const GridToolbar = ({
  periodLabel,
  totalCount,
  pageSize,
  onPageSizeChange,
  showAllOption = true,
  baseTimeLabel,
  onPrint,
  onBrailleView,
  onSaveFile,
  resultLabel,
  onSearch,
  className,
  ...props
}: GridToolbarProps) => {
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null)

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
            aria-haspopup="dialog"
            onClick={() => setPendingAction("print")}
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
            onClick={() => setPendingAction("save")}
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
            className="h-8 w-[108px] pr-8 text-base"
            value={String(pageSize)}
            onChange={(e) => {
              const v = e.target.value
              onPageSizeChange?.(v === "all" ? "all" : Number(v))
            }}
          >
            {QUERY_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}개 보기
              </option>
            ))}
            {showAllOption && <option value="all">전체 보기</option>}
          </Select>
        </div>
      </div>

      {baseTimeLabel != null && (
        <p className="text-right text-2xs text-ink-muted">
          기준일시 : {baseTimeLabel}
        </p>
      )}

      <ConfirmDialog
        open={pendingAction != null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          const action = pendingAction
          setPendingAction(null)
          if (action === "print") {
            // 다이얼로그가 화면에서 완전히 사라진 뒤 인쇄해야 인쇄 결과에
            // 다이얼로그가 찍히지 않는다.
            window.setTimeout(() => onPrint?.(), 0)
          } else if (action === "save") {
            onSaveFile?.()
          }
        }}
        title={pendingAction === "print" ? "인쇄 확인" : "파일저장 확인"}
        messages={[
          pendingAction === "print"
            ? `${resultLabel ?? "조회 결과"}를 인쇄하시겠습니까?`
            : `${resultLabel ?? "조회 결과"} 파일을 저장하시겠습니까?`,
        ]}
        confirmLabel={pendingAction === "print" ? "인쇄" : "저장"}
        cancelLabel="취소"
      />
    </div>
  )
}

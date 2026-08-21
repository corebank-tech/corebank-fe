import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Badge } from "@/shared/ui/badge"
import { GridToolbar, SavedConditionAlert } from "@/widgets/query"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import { downloadCsv } from "@/shared/lib/csv"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import { formatDateTime } from "@/shared/lib/format"
import type { NotificationInboxRow } from "@/entities/notification"
import { useNotifications } from "@/features/notifications"
import { cn } from "@/shared/lib/utils"
import { getToday } from "@/shared/config/clock"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"

/** F-02 알림함. REQ-MYPG-004·005. */
export const F02NotificationInbox = () => {
  const BASE_TIME = useBaseTime()
  const TODAY = getToday()
  const { notifications: rows, unreadCount, markRead } = useNotifications()
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const [brailleOpen, setBrailleOpen] = React.useState(false)
  const downloadComplete = useSavedConditionAlert()

  const size = pageSize === "all" ? rows.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * size, safePage * size)

  const exportHeaders = ["상태", "발생일시", "구분", "제목", "내용"]
  const exportRows = rows.map((r) => [
    r.read ? "읽음" : "안읽음",
    formatDateTime(r.occurredAt),
    r.category,
    r.title,
    r.content,
  ])

  const columns: DataGridColumn<NotificationInboxRow>[] = [
    {
      key: "read",
      header: "상태",
      align: "center",
      width: 60,
      render: (r) =>
        r.read ? (
          <span className="text-xs text-ink-faint">읽음</span>
        ) : (
          <span className="text-xs font-bold text-primary">안읽음</span>
        ),
    },
    {
      key: "occurredAt",
      header: "발생일시",
      width: 150,
      sortable: true,
      sortValue: (r) => r.occurredAt,
      render: (r) => (
        <span className="text-ink-muted">{formatDateTime(r.occurredAt)}</span>
      ),
    },
    {
      key: "category",
      header: "구분",
      align: "center",
      width: 90,
      render: (r) => <Badge variant="neutral">{r.category}</Badge>,
    },
    {
      key: "title",
      header: "제목 / 내용",
      align: "left",
      render: (r) => (
        <button
          type="button"
          onClick={() => markRead(r.id)}
          className="flex w-full flex-col items-start gap-1 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span
            className={cn(
              "text-base",
              r.read ? "text-ink" : "font-bold text-ink",
            )}
          >
            {r.title}
          </span>
          <span className="text-base text-ink-muted">{r.content}</span>
        </button>
      ),
    },
  ]

  return (
    <QueryPageLayout
      noticeItems={[
        "이체·예약이체·자동이체·상품가입과 관련된 알림만 표시됩니다.",
        "알림을 클릭하면 읽음 상태로 전환되고 헤더의 미읽음 배지 건수에 즉시 반영됩니다.",
      ]}
      footerItems={[
        "알림은 이체, 예약이체, 자동이체, 상품가입 처리 결과에 대해 생성되며 최신순으로 표시됩니다(REQ-MYPG-004).",
        "알림을 클릭하면 읽음 상태로 전환되며, 헤더의 미읽음 건수 배지에 즉시 반영됩니다(REQ-MYPG-005).",
      ]}
      modals={
        <TextViewModal
          open={brailleOpen}
          onClose={() => setBrailleOpen(false)}
          title="알림함 점자보기"
          headers={exportHeaders}
          rows={exportRows}
        />
      }
    >
      <FormSection title="알림함" className="mb-0">
        <p className="mb-4 text-base text-ink-muted">
          미읽음 <span className="font-bold text-primary">{unreadCount}</span>건
        </p>

        <GridToolbar
          totalCount={rows.length}
          pageSize={pageSize}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
          baseTimeLabel={formatDateTime(BASE_TIME)}
          onPrint={() => window.print()}
          onBrailleView={() => setBrailleOpen(true)}
          onSaveFile={() => {
            downloadCsv(`알림함_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="알림함"
        />

        <DataGrid
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          emptyMessage="도착한 알림이 없습니다."
        />

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <SavedConditionAlert
          open={downloadComplete.saved}
          message="파일이 저장되었습니다."
          className="mt-2"
        />
      </FormSection>
    </QueryPageLayout>
  )
}

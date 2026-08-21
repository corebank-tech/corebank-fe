import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Badge } from "@/shared/ui/badge"
import {
  GridToolbar,
  PeriodField,
  RadioRowField,
  SavedConditionAlert,
  SearchPanel,
} from "@/widgets/query"
import { SummaryRow } from "@/shared/ui/summary-row"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import { downloadCsv } from "@/shared/lib/csv"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
  maskName,
} from "@/shared/lib/format"
import {
  MOCK_RESERVATION_RESULTS,
  getReservationResultBadgeVariant,
  type ReservationResultRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"

const ORDER_OPTIONS = [
  { label: "최근거래순", value: "recent" },
  { label: "과거거래순", value: "past" },
]

export const E05ReservationResults = () => {
  const BASE_TIME = useBaseTime()
  const TODAY = getToday()
  const [period, setPeriod] = React.useState({
    start: "2026-06-23",
    end: TODAY,
  })
  const [order, setOrder] = React.useState("recent")
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const rows = React.useMemo(() => {
    const next = MOCK_RESERVATION_RESULTS.filter(
      (r) => r.transferDate >= period.start && r.transferDate <= period.end,
    )
    return [...next].sort((a, b) =>
      order === "recent"
        ? b.transferDate.localeCompare(a.transferDate)
        : a.transferDate.localeCompare(b.transferDate),
    )
  }, [period, order])

  const normal = rows.filter((r) => r.result === "정상")
  const error = rows.filter((r) => r.result === "오류")
  const canceled = rows.filter((r) => r.result === "취소")
  const sum = (list: ReservationResultRow[]) =>
    list.reduce((s, r) => s + r.amount, 0)

  const size = pageSize === "all" ? rows.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * size, safePage * size)

  const handleReset = () => {
    setPeriod({ start: "2026-06-23", end: TODAY })
    setOrder("recent")
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const exportHeaders = [
    "처리결과",
    "이체일자",
    "출금계좌",
    "입금계좌",
    "예금주",
    "이체금액",
    "거래번호",
    "실패사유",
  ]
  const exportRows = rows.map((r) => [
    r.result,
    formatDate(r.transferDate),
    `${r.fromAlias} ${maskAccountNo(r.fromAccountNo)}`,
    maskAccountNo(r.toAccountNo),
    maskName(r.payeeName),
    formatAmount(r.amount),
    r.txId ?? "-",
    r.failReason ?? "-",
  ])

  const columns: DataGridColumn<ReservationResultRow>[] = [
    {
      key: "result",
      header: "처리결과",
      align: "center",
      width: 90,
      render: (r) => (
        <Badge variant={getReservationResultBadgeVariant(r.result)}>
          {r.result}
        </Badge>
      ),
    },
    {
      key: "transferDate",
      header: "이체일자",
      align: "center",
      width: 110,
      sortable: true,
      sortValue: (r) => r.transferDate,
      render: (r) => <span>{formatDate(r.transferDate)}</span>,
    },
    {
      key: "fromAccountNo",
      header: "출금계좌",
      width: 170,
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.fromAlias} <span className="text-ink-faint">/</span>{" "}
          <span>{formatAccountNo(r.fromAccountNo)}</span>
        </span>
      ),
    },
    {
      key: "toAccountNo",
      header: "입금계좌",
      width: 150,
      render: (r) => <span>{formatAccountNo(r.toAccountNo)}</span>,
    },
    {
      key: "payeeName",
      header: "예금주",
      align: "center",
      width: 90,
      render: (r) => maskName(r.payeeName),
    },
    {
      key: "amount",
      header: "이체금액",
      align: "right",
      width: 120,
      render: (r) => formatAmount(r.amount),
    },
    {
      key: "txId",
      header: "거래번호",
      width: 170,
      render: (r) => (
        <span>
          {r.txId ?? <span className="text-2xs text-ink-faint">-</span>}
        </span>
      ),
    },
    {
      key: "failReason",
      header: "실패사유",
      align: "left",
      render: (r) =>
        r.failReason ?? <span className="text-2xs text-ink-faint">-</span>,
    },
  ]

  return (
    <QueryPageLayout
      noticeItems={[
        "예약이체는 매일 00:10에 일괄 실행되며 실패 건은 재시도되지 않습니다.",
        "집계 금액은 페이징과 무관하게 조회 조건에 해당하는 전체 건 기준입니다.",
      ]}
      footerItems={[
        "처리 실패 건은 재시도 없이 실패로 확정되며, 실패 사유는 목록의 실패사유 열에서 확인할 수 있습니다.",
      ]}
      modals={
        <>
          <TextViewModal
            open={brailleOpen}
            onClose={() => setBrailleOpen(false)}
            title="예약이체 처리결과 점자보기"
            headers={exportHeaders}
            rows={exportRows}
          />
        </>
      }
    >
      <FormSection title="조회조건">
        <SearchPanel
          onReset={handleReset}
          onSearch={() => {
            setPage(1)
            savedCondition.clear()
            downloadComplete.clear()
          }}
          onSaveCondition={savedCondition.save}
        >
          <FormRow label="조회기간">
            <PeriodField
              start={period.start}
              end={period.end}
              onChange={setPeriod}
              today={TODAY}
            />
          </FormRow>
          <FormRow label="정렬순서">
            <RadioRowField
              name="e05-order"
              options={ORDER_OPTIONS}
              value={order}
              onChange={setOrder}
            />
          </FormRow>
        </SearchPanel>
      </FormSection>

      <FormSection title="예약이체 처리결과" className="mb-0">
        <SummaryRow
          className="mb-3"
          items={[
            {
              label: "정상처리",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(sum(normal))}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({normal.length}건)
                  </span>
                </span>
              ),
              valueColor: "var(--color-success)",
            },
            {
              label: "오류처리",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(sum(error))}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({error.length}건)
                  </span>
                </span>
              ),
              valueColor: "var(--color-danger)",
            },
            {
              label: "취소처리",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(sum(canceled))}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({canceled.length}건)
                  </span>
                </span>
              ),
            },
          ]}
        />
        <p className="mb-3 text-2xs text-ink-faint">
          ※ 취소처리 건은 이체 예정일 전에 취소된 예약이체입니다.
        </p>

        <GridToolbar
          periodLabel={`${formatDate(period.start)} ~ ${formatDate(period.end)}`}
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
            downloadCsv(
              `예약이체처리결과_${TODAY}.csv`,
              exportHeaders,
              exportRows,
            )
            downloadComplete.save()
          }}
          resultLabel="예약이체처리결과"
        />

        <DataGrid
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          emptyMessage="조회 결과가 없습니다."
        />

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />

        <SavedConditionAlert open={savedCondition.saved} className="mt-2" />
        <SavedConditionAlert
          open={downloadComplete.saved}
          message="파일이 저장되었습니다."
          className="mt-2"
        />
      </FormSection>
    </QueryPageLayout>
  )
}

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
import { formatAmount, formatDate, formatDateTime } from "@/shared/lib/format"
import {
  getReservationResultBadgeVariant,
  toReservationResultRow,
  useScheduledTransferExecutions,
  type ReservationResultRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { recentPeriod } from "@/shared/config/query-period"
import { QUERY_DEFAULT_PAGE_SIZE } from "@/shared/config/policy"

/**
 * 조회조건 한 벌. [조회]를 통과한 값만 결과 영역에 반영한다(REQ-RSV-014).
 */
const defaultCondition = () => ({
  period: recentPeriod(),
  order: "recent",
})

const ORDER_OPTIONS = [
  { label: "최근거래순", value: "recent" },
  { label: "과거거래순", value: "past" },
]

/** 화면의 정렬순서 → 서버 sort 파라미터. */
const ORDER_TO_SORT: Record<string, "LATEST" | "OLDEST"> = {
  recent: "LATEST",
  past: "OLDEST",
}

export const E05ReservationResults = () => {
  const TODAY = getToday()
  // applied는 [조회]를 통과해 실제 조회에 쓰인 조건, 나머지는 입력 중인 값이다.
  // 쿼리 키가 입력 state에 바로 물려 있으면 조건을 건드릴 때마다 요청이 나가고
  // "조회" 버튼이 무의미해진다.
  const [applied, setApplied] = React.useState(defaultCondition)
  const [period, setPeriod] = React.useState(applied.period)
  const [order, setOrder] = React.useState(applied.order)
  const [pageSize, setPageSize] = React.useState<number | "all">(
    QUERY_DEFAULT_PAGE_SIZE,
  )
  const [page, setPage] = React.useState(1)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  // 툴바에서 "전체 보기"를 내렸으므로(showAllOption={false}) "all"은 도달하지
  // 않는다. 타입을 좁히기 위한 분기다.
  const size = pageSize === "all" ? QUERY_DEFAULT_PAGE_SIZE : pageSize
  const {
    page: pageData,
    baseTime,
    isFetching,
    isError,
    refetch,
  } = useScheduledTransferExecutions({
    // REQ-RSV-014: 조회조건은 조회기간과 정렬순서뿐이다. 출금계좌를 보내지
    // 않으면 서버가 내 전체 계좌를 대상으로 조회한다.
    fromDate: applied.period.start,
    toDate: applied.period.end,
    sort: ORDER_TO_SORT[applied.order],
    page: page - 1,
    size,
  })

  const pageRows = (pageData?.items ?? []).map(toReservationResultRow)
  const totalCount = pageData?.totalCount ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)

  // REQ-RSV-014: 집계는 페이징과 무관한 조회조건 전체 기준이라 서버가 계산해 준다.
  // 현재 페이지만 더하면 페이지를 넘길 때마다 값이 달라진다.
  const summary = pageData?.summary

  // 조회조건이 바뀌어 결과가 줄면 totalPages만 작아지고 page는 그대로라, 요청은 범위
  // 밖 페이지를 계속 보내면서 빈 목록이 뜬다. 렌더 중 보정하면 React가 커밋 전에
  // 다시 렌더해서 같은 패스에서 올바른 페이지로 요청이 나간다.
  if (page > totalPages) setPage(totalPages)

  const handleReset = () => {
    const next = defaultCondition()
    setApplied(next)
    setPeriod(next.period)
    setOrder(next.order)
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const handleSearch = () => {
    const sameCondition =
      applied.period.start === period.start &&
      applied.period.end === period.end &&
      applied.order === order
    setApplied({ period, order })
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
    // 조건도 페이지도 그대로면 쿼리 키가 같아 요청이 나가지 않는다. 조회를 누른
    // 이상 최신 상태를 보여줘야 하므로 명시적으로 다시 부른다.
    if (sameCondition && page === 1) refetch()
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
  // 계좌번호·예금주명은 서버가 이미 마스킹해서 내려준다(REQ-INQR-015).
  const exportRows = pageRows.map((r) => [
    r.result,
    formatDate(r.transferDate),
    r.fromAccountNo,
    r.toAccountNo,
    r.payeeName,
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
        <span className="whitespace-nowrap">{r.fromAccountNo}</span>
      ),
    },
    {
      key: "toAccountNo",
      header: "입금계좌",
      width: 150,
      render: (r) => <span>{r.toAccountNo}</span>,
    },
    {
      key: "payeeName",
      header: "예금주",
      align: "center",
      width: 90,
      render: (r) => r.payeeName,
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
          onSearch={handleSearch}
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
                  {formatAmount(summary?.successAmount ?? 0)}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({summary?.successCount ?? 0}건)
                  </span>
                </span>
              ),
              valueColor: "var(--color-success)",
            },
            {
              label: "오류처리",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(summary?.failureAmount ?? 0)}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({summary?.failureCount ?? 0}건)
                  </span>
                </span>
              ),
              valueColor: "var(--color-danger)",
            },
            {
              label: "취소처리",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(summary?.canceledAmount ?? 0)}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({summary?.canceledCount ?? 0}건)
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
          // POL-022의 "전체"는 서버 지원 전까지 임시로 내린다 — 근거는
          // GridToolbar의 showAllOption 주석(#46).
          showAllOption={false}
          periodLabel={`${formatDate(applied.period.start)} ~ ${formatDate(applied.period.end)}`}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
          baseTimeLabel={
            baseTime ? formatDateTime(new Date(baseTime)) : undefined
          }
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
          loading={isFetching}
          rowKey={(r) => r.id}
          emptyMessage={
            isError
              ? "예약이체 처리결과를 불러오지 못했습니다."
              : "조회 결과가 없습니다."
          }
        />

        <Pagination
          page={page}
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

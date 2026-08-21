import * as React from "react"
import { BarChart3 } from "lucide-react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Select } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Modal } from "@/shared/ui/modal"
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
import {
  GridSearchModal,
  type GridSearchField,
} from "@/shared/ui/grid-search-modal"
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
  MOCK_TRANSFER_HISTORY,
  MOCK_MONTHLY_TRANSFER_STATS,
  getTransferStatusBadgeVariant,
  type TransferHistoryRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { recentPeriod } from "@/shared/config/query-period"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"

const STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "정상", value: "정상" },
  { label: "오류", value: "오류" },
  { label: "처리중", value: "처리중" },
]

const FROM_ACCOUNTS = Array.from(
  new Map(
    MOCK_TRANSFER_HISTORY.map((r) => [r.fromAccountNo, r.fromAlias]),
  ).entries(),
)

const toISODate = (datetime: string) => {
  return datetime.slice(0, 10)
}

/** REQ-CMN-020: 그리드가 보유한 컬럼 중 검색 대상 목록. */
const SEARCH_FIELDS: GridSearchField[] = [
  { key: "fromAccountNo", label: "출금계좌" },
  { key: "toAccountNo", label: "입금계좌" },
  { key: "payeeName", label: "예금주" },
  { key: "txId", label: "거래번호" },
]

export const D04TransferHistory = () => {
  const BASE_TIME = useBaseTime()
  const TODAY = getToday()
  const [period, setPeriod] = React.useState(recentPeriod)
  const [status, setStatus] = React.useState("all")
  const [fromAccount, setFromAccount] = React.useState("all")
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const [detail, setDetail] = React.useState<TransferHistoryRow | null>(null)
  const [statsOpen, setStatsOpen] = React.useState(false)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [search, setSearch] = React.useState<{
    field: string
    keyword: string
  } | null>(null)

  const rows = React.useMemo(() => {
    return MOCK_TRANSFER_HISTORY.filter((r) => {
      const d = toISODate(r.datetime)
      if (d < period.start || d > period.end) return false
      if (status !== "all" && r.status !== status) return false
      if (fromAccount !== "all" && r.fromAccountNo !== fromAccount) return false
      if (search && search.keyword) {
        const value = String(r[search.field as keyof TransferHistoryRow] ?? "")
        if (!value.includes(search.keyword)) return false
      }
      return true
    }).sort((a, b) => b.datetime.localeCompare(a.datetime))
  }, [period, status, fromAccount, search])

  const normalCount = rows.filter((r) => r.status === "정상").length
  const normalAmount = rows
    .filter((r) => r.status === "정상")
    .reduce((s, r) => s + r.amount, 0)
  const errorAmount = rows
    .filter((r) => r.status === "오류")
    .reduce((s, r) => s + r.amount, 0)
  const totalFee = rows.reduce((s, r) => s + r.fee, 0)

  const size = pageSize === "all" ? rows.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * size, safePage * size)

  const handleReset = () => {
    setPeriod(recentPeriod())
    setStatus("all")
    setFromAccount("all")
    setSearch(null)
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const exportHeaders = [
    "이체일시",
    "출금계좌",
    "입금계좌",
    "예금주",
    "이체금액",
    "처리상태",
    "거래번호",
  ]
  const exportRows = rows.map((r) => [
    formatDateTime(r.datetime),
    `${r.fromAlias} ${maskAccountNo(r.fromAccountNo)}`,
    maskAccountNo(r.toAccountNo),
    maskName(r.payeeName),
    formatAmount(r.amount),
    r.status,
    r.txId,
  ])

  const columns: DataGridColumn<TransferHistoryRow>[] = [
    {
      key: "datetime",
      header: "이체일시",
      width: 150,
      sortable: true,
      sortValue: (r) => r.datetime,
      render: (r) => <span>{formatDateTime(r.datetime)}</span>,
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
      sortable: true,
      sortValue: (r) => r.amount,
      render: (r) => formatAmount(r.amount),
    },
    {
      key: "status",
      header: "처리상태",
      align: "center",
      width: 90,
      render: (r) => (
        <Badge variant={getTransferStatusBadgeVariant(r.status)}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "txId",
      header: "거래번호",
      width: 170,
      render: (r) => (
        <button
          type="button"
          onClick={() => setDetail(r)}
          className="text-base text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {r.txId}
        </button>
      ),
    },
  ]

  return (
    <QueryPageLayout
      noticeItems={[
        "조회기간은 최대 1년까지 선택할 수 있으며 기본값은 최근 1개월입니다.",
        "처리중 상태는 서버 처리 지연 시에만 표시되며 이후 정상 또는 오류로 확정됩니다.",
        "집계 금액은 페이징과 무관하게 조회 조건에 해당하는 전체 건 기준입니다.",
      ]}
      footerItems={[
        "이체 처리상태는 정상, 오류, 처리중 3종으로만 관리됩니다(POL-025).",
        "당행이체는 수수료가 발생하지 않습니다(POL-028).",
      ]}
      modals={
        <>
          <Modal
            open={detail != null}
            onClose={() => setDetail(null)}
            title="이체 상세"
            size="sm"
            footer={
              <Button
                variant="primary"
                size="lg"
                className="min-w-30"
                onClick={() => setDetail(null)}
              >
                확인
              </Button>
            }
          >
            {detail && (
              <dl className="flex flex-col gap-3">
                {(
                  [
                    { label: "거래번호", value: detail.txId },
                    {
                      label: "이체일시",
                      value: formatDateTime(detail.datetime),
                    },
                    {
                      label: "출금계좌",
                      value: `${detail.fromAlias} / ${formatAccountNo(detail.fromAccountNo)}`,
                    },
                    {
                      label: "입금계좌",
                      value: formatAccountNo(detail.toAccountNo),
                    },
                    { label: "예금주", value: maskName(detail.payeeName) },
                    {
                      label: "이체금액",
                      value: formatAmount(detail.amount),
                      dominant: true,
                    },
                    { label: "수수료", value: formatAmount(detail.fee) },
                    { label: "표시내용", value: detail.memo },
                    {
                      label: "처리상태",
                      value: (
                        <Badge
                          variant={getTransferStatusBadgeVariant(detail.status)}
                        >
                          {detail.status}
                        </Badge>
                      ),
                    },
                    ...(detail.errorReason
                      ? [{ label: "오류사유", value: detail.errorReason }]
                      : []),
                  ] satisfies {
                    label: string
                    value: React.ReactNode
                    dominant?: boolean
                  }[]
                ).map((item) => (
                  <div key={item.label} className="flex gap-2">
                    <dt
                      className={
                        item.dominant
                          ? "w-24 shrink-0 text-xs text-ink-faint"
                          : "w-24 shrink-0 text-base text-ink-muted"
                      }
                    >
                      {item.label}
                    </dt>
                    <dd
                      className={
                        item.dominant
                          ? "min-w-0 flex-1 text-h2 font-bold text-primary"
                          : "min-w-0 flex-1 text-base font-bold text-ink"
                      }
                    >
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-2xs leading-relaxed text-ink-faint">
              ※ 예금주명은 개인정보 보호를 위해 가운데 1자를 마스킹하여
              표시합니다.
            </p>
          </Modal>

          <Modal
            open={statsOpen}
            onClose={() => setStatsOpen(false)}
            title="이체결과 통계"
            size="md"
            footer={
              <Button
                variant="primary"
                size="lg"
                className="min-w-30"
                onClick={() => setStatsOpen(false)}
              >
                확인
              </Button>
            }
          >
            <p className="mb-4 text-2xs text-ink-faint">
              전월 기준 최근 1년 이내 월별·출금계좌별 이체건수와 이체금액입니다.
            </p>
            <DataGrid
              columns={[
                { key: "month", header: "월", align: "center", width: 90 },
                { key: "fromAlias", header: "출금계좌", align: "left" },
                {
                  key: "count",
                  header: "이체건수",
                  align: "right",
                  width: 90,
                  render: (r) => `${r.count}건`,
                },
                {
                  key: "amount",
                  header: "이체금액",
                  align: "right",
                  width: 130,
                  render: (r) => formatAmount(r.amount),
                },
              ]}
              rows={MOCK_MONTHLY_TRANSFER_STATS}
              rowKey={(r, i) => `${r.month}-${r.fromAlias}-${i}`}
            />
          </Modal>

          <TextViewModal
            open={brailleOpen}
            onClose={() => setBrailleOpen(false)}
            title="이체결과조회 점자보기"
            headers={exportHeaders}
            rows={exportRows}
          />

          <GridSearchModal
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            fields={SEARCH_FIELDS}
            onApply={(field, keyword) => {
              setSearch(keyword ? { field, keyword } : null)
              setPage(1)
            }}
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
          <FormRow label="처리상태">
            <RadioRowField
              name="d04-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </FormRow>
          <FormRow label="출금계좌" htmlFor="d04-from">
            <Select
              id="d04-from"
              className="max-w-md"
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
            >
              <option value="all">전체</option>
              {FROM_ACCOUNTS.map(([accountNo, alias]) => (
                <option key={accountNo} value={accountNo}>
                  {`${alias} / ${formatAccountNo(accountNo)}`}
                </option>
              ))}
            </Select>
          </FormRow>
        </SearchPanel>
      </FormSection>

      <FormSection
        title="이체결과"
        className="mb-0"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setStatsOpen(true)}
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            이체결과 통계
          </Button>
        }
      >
        <SummaryRow
          className="mb-3"
          items={[
            {
              label: "총 정상이체건수",
              value: `${normalCount.toLocaleString("ko-KR")}건`,
            },
            {
              label: "총 이체금액",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(normalAmount)}
                </span>
              ),
              valueColor: "var(--color-success)",
            },
            {
              label: "총 오류금액",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(errorAmount)}
                </span>
              ),
              valueColor: "var(--color-danger)",
            },
            { label: "총 수수료", value: formatAmount(totalFee) },
          ]}
        />

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
            downloadCsv(`이체결과조회_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="이체결과조회"
          onSearch={() => setSearchOpen(true)}
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

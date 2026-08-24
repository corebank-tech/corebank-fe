import * as React from "react"
import { toErrorMessage } from "@/shared/api/api-error"
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
import { downloadCsv } from "@/shared/lib/csv"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
} from "@/shared/lib/format"
import {
  MOCK_MONTHLY_TRANSFER_STATS,
  getTransferStatusBadgeVariant,
  toTransferHistoryDetail,
  toTransferHistoryRow,
  useTransferDetail,
  useTransferHistory,
  type TransferHistoryRow,
} from "@/entities/transfer"
import { useWithdrawAccounts } from "@/entities/account"
import { getToday } from "@/shared/config/clock"
import { recentPeriod } from "@/shared/config/query-period"
import { QUERY_DEFAULT_PAGE_SIZE } from "@/shared/config/policy"

/**
 * 조회조건 한 벌. [조회]를 통과한 값만 결과 영역에 반영한다(REQ-TRSF-021).
 * 출금계좌는 계좌 목록이 도착해야 정해지므로 여기서 채우지 않는다.
 */
const defaultCondition = () => ({
  period: recentPeriod(),
  status: "all",
  order: "recent",
})

const STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "정상", value: "정상" },
  { label: "오류", value: "오류" },
  { label: "처리중", value: "처리중" },
]

/** 화면의 처리상태 → 서버 status 파라미터. "전체"는 보내지 않는다. */
const STATUS_TO_PARAM: Record<string, string | undefined> = {
  all: undefined,
  정상: "SUCCESS",
  오류: "ERROR",
  처리중: "PROCESSING",
}

const ORDER_OPTIONS = [
  { label: "최근거래순", value: "recent" },
  { label: "과거거래순", value: "past" },
]

/** 화면의 정렬순서 → 서버 sort 파라미터. */
const ORDER_TO_SORT: Record<string, "LATEST" | "OLDEST"> = {
  recent: "LATEST",
  past: "OLDEST",
}

/**
 * POL-028: 당행이체는 수수료가 발생하지 않는다. EX-001(타행이체 미제공)·EX-031
 * (수수료 면제횟수·우대 정책 미제공)도 같은 전제다. 서버 집계(summary)에 수수료
 * 항목이 없어 REQ-TRSF-032의 '총 수수료'는 이 값으로 표시한다.
 *
 * 서버가 상세(detail.fee)에 0이 아닌 값을 주기 시작하면 같은 화면에서 집계와
 * 상세가 어긋난다. 그때는 summary.fee 를 서버에 요청한다.
 */
const TOTAL_FEE = 0

const clampPage = (page: number, totalPages: number) =>
  page > totalPages ? totalPages : page

export const D04TransferHistory = () => {
  const TODAY = getToday()
  const {
    accounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    error: accountsError,
  } = useWithdrawAccounts()

  const [applied, setApplied] = React.useState(defaultCondition)
  const [period, setPeriod] = React.useState(applied.period)
  const [status, setStatus] = React.useState(applied.status)
  const [order, setOrder] = React.useState(applied.order)
  // REQ-TRSF-021의 출금계좌 조건은 계좌 하나를 가리킨다 — 서버가 전체 조회를 지원하지 않는다.
  const [accountId, setAccountId] = React.useState<number | null>(null)
  const [appliedAccountId, setAppliedAccountId] = React.useState<number | null>(
    null,
  )
  const [pageSize, setPageSize] = React.useState<number | "all">(
    QUERY_DEFAULT_PAGE_SIZE,
  )
  const [page, setPage] = React.useState(1)
  const [detailTxId, setDetailTxId] = React.useState<string | null>(null)
  const [statsOpen, setStatsOpen] = React.useState(false)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const resolveAccountId = (selected: number | null) => {
    if (selected == null) return accounts[0]?.accountId ?? null
    return accounts.some((account) => account.accountId === selected)
      ? selected
      : null
  }
  const effectiveAccountId = resolveAccountId(accountId)
  const effectiveAppliedAccountId = resolveAccountId(appliedAccountId)

  const size = pageSize === "all" ? QUERY_DEFAULT_PAGE_SIZE : pageSize
  const {
    page: transferPage,
    asOf,
    isFetching,
    isError,
    error,
    refetch,
  } = useTransferHistory(
    {
      withdrawalAccountId: effectiveAppliedAccountId ?? 0,
      status: STATUS_TO_PARAM[applied.status],
      fromDate: applied.period.start,
      toDate: applied.period.end,
      sort: ORDER_TO_SORT[applied.order],
      page: page - 1,
      size,
    },
    { enabled: effectiveAppliedAccountId != null },
  )

  const {
    detail: detailResponse,
    isFetching: isDetailFetching,
    error: detailError,
  } = useTransferDetail(detailTxId)
  const detail = detailResponse ? toTransferHistoryDetail(detailResponse) : null

  const pageRows = (transferPage?.items ?? []).map(toTransferHistoryRow)
  const totalCount = transferPage?.totalCount ?? 0
  const totalPages = Math.max(1, transferPage?.totalPages ?? 1)

  // REQ-TRSF-032: 집계는 페이징과 무관한 조회조건 전체 기준이라 서버가 계산해 준다.
  const summary = transferPage?.summary

  const clampedPage = clampPage(page, totalPages)
  if (clampedPage !== page) setPage(clampedPage)

  const appliedAccount = accounts.find(
    (account) => account.accountId === effectiveAppliedAccountId,
  )
  const fromAccountLabel = appliedAccount
    ? `${appliedAccount.accountName ?? ""} / ${formatAccountNo(appliedAccount.accountNumber ?? "")}`
    : "-"

  const handleReset = () => {
    const next = defaultCondition()
    setApplied(next)
    setPeriod(next.period)
    setStatus(next.status)
    setOrder(next.order)
    setAccountId(null)
    setAppliedAccountId(null)
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const handleSearch = () => {
    const isSameCondition =
      applied.period.start === period.start &&
      applied.period.end === period.end &&
      applied.status === status &&
      applied.order === order &&
      effectiveAppliedAccountId === effectiveAccountId
    setApplied({ period, status, order })
    setAppliedAccountId(accountId)
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
    if (isSameCondition && page === 1) refetch()
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
  // 입금계좌·예금주명은 서버가 이미 마스킹해서 내려준다(REQ-INQR-015). 출금계좌는
  // 조회조건으로 고른 내 계좌라 파일 저장 시에만 여기서 마스킹한다.
  const exportRows = pageRows.map((r) => [
    formatDateTime(r.datetime),
    appliedAccount
      ? `${appliedAccount.accountName ?? ""} ${maskAccountNo(appliedAccount.accountNumber ?? "")}`
      : "-",
    r.toAccountNo,
    r.payeeName,
    formatAmount(r.amount),
    r.status,
    r.txId,
  ])

  const columns: DataGridColumn<TransferHistoryRow>[] = [
    {
      key: "datetime",
      header: "이체일시",
      width: 150,
      render: (r) => <span>{formatDateTime(r.datetime)}</span>,
    },
    {
      key: "fromAccountNo",
      header: "출금계좌",
      width: 170,
      render: () => (
        <span className="whitespace-nowrap">{fromAccountLabel}</span>
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
          onClick={() => setDetailTxId(r.txId)}
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
        "이체결과는 출금계좌 단위로 조회하며, 계좌를 바꾸면 다시 조회해야 합니다.",
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
            open={detailTxId != null}
            onClose={() => setDetailTxId(null)}
            title="이체 상세"
            size="sm"
            footer={
              <Button
                variant="primary"
                size="lg"
                className="min-w-30"
                onClick={() => setDetailTxId(null)}
              >
                확인
              </Button>
            }
          >
            {isDetailFetching && (
              <p className="text-base text-ink-muted">
                상세 내역을 불러오는 중입니다.
              </p>
            )}
            {!isDetailFetching && detail == null && (
              <p className="text-base text-ink-muted">
                {toErrorMessage(detailError)}
              </p>
            )}
            {!isDetailFetching && detail && (
              <dl className="flex flex-col gap-3">
                {(
                  [
                    { label: "거래번호", value: detail.txId },
                    {
                      label: "이체일시",
                      value: formatDateTime(detail.datetime),
                    },
                    { label: "출금계좌", value: fromAccountLabel },
                    { label: "입금계좌", value: detail.toAccountNo },
                    { label: "예금주", value: detail.payeeName },
                    {
                      label: "이체금액",
                      value: formatAmount(detail.amount),
                      dominant: true,
                    },
                    { label: "수수료", value: formatAmount(detail.fee) },
                    { label: "표시내용", value: detail.memo || "-" },
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
                    ...(detail.errorCode
                      ? [{ label: "오류코드", value: detail.errorCode }]
                      : []),
                    ...(detail.failureReason
                      ? [{ label: "오류사유", value: detail.failureReason }]
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
              ※ 예금주명은 개인정보 보호를 위해 일부를 가려 표시합니다.
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
          <FormRow label="처리상태">
            <RadioRowField
              name="d04-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </FormRow>
          <FormRow label="정렬순서">
            <RadioRowField
              name="d04-order"
              options={ORDER_OPTIONS}
              value={order}
              onChange={setOrder}
            />
          </FormRow>
          <FormRow label="출금계좌" htmlFor="d04-from">
            <Select
              id="d04-from"
              className="max-w-md"
              value={effectiveAccountId ?? ""}
              disabled={isAccountsLoading || accounts.length === 0}
              onChange={(e) => setAccountId(Number(e.target.value))}
            >
              {accounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {`${account.accountName ?? ""} / ${formatAccountNo(account.accountNumber ?? "")}`}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-2xs text-ink-faint">
              ※ 이체결과는 출금계좌 한 개를 기준으로 조회합니다.
            </p>
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
              value: `${(summary?.successCount ?? 0).toLocaleString("ko-KR")}건`,
            },
            {
              label: "총 이체금액",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(summary?.successAmount ?? 0)}
                </span>
              ),
              valueColor: "var(--color-success)",
            },
            {
              label: "총 오류금액",
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(summary?.failureAmount ?? 0)}
                </span>
              ),
              valueColor: "var(--color-danger)",
            },
            { label: "총 수수료", value: formatAmount(TOTAL_FEE) },
          ]}
        />

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
          baseTimeLabel={asOf ? formatDateTime(asOf) : undefined}
          onPrint={() => window.print()}
          onBrailleView={() => setBrailleOpen(true)}
          onSaveFile={() => {
            downloadCsv(`이체결과조회_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="현재 페이지 이체결과조회"
        />

        <DataGrid
          columns={columns}
          rows={pageRows}
          loading={isFetching}
          rowKey={(r) => r.txId}
          emptyMessage={
            isAccountsError
              ? (toErrorMessage(accountsError) ?? "")
              : isError
                ? (toErrorMessage(error) ?? "")
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

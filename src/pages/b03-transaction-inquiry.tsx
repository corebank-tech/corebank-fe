import * as React from "react"
import { toErrorMessage } from "@/shared/api/api-error"
import { useSearchParams } from "react-router"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Badge } from "@/shared/ui/badge"
import { CollapsibleSection } from "@/shared/ui/collapsible-section"
import {
  AccountSelectField,
  GridToolbar,
  KeywordField,
  PeriodField,
  RadioRowField,
  SavedConditionAlert,
  SearchPanel,
} from "@/widgets/query"
import { SummaryRow } from "@/shared/ui/summary-row"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import { downloadCsv } from "@/shared/lib/csv"
import {
  getAccountStatusBadgeVariant,
  toTransactionRows,
  useAccountTransactionQuery,
  type Transaction,
} from "@/entities/transaction"
import {
  useAccountDetailQuery,
  useInquirableAccounts,
} from "@/entities/account"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
} from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import { getToday } from "@/shared/config/clock"
import { useCapturedBaseTime } from "@/shared/lib/hooks/use-base-time"
import {
  QUERY_MAX_RANGE_DAYS as MAX_PERIOD_DAYS,
  QUERY_DEFAULT_PAGE_SIZE,
} from "@/shared/config/policy"
import { checkPeriodRange } from "@/entities/transaction"
import { recentPeriod } from "@/shared/config/query-period"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"

/**
 * 조회조건 한 벌. [조회]를 통과한 값만 결과 영역에 반영한다(REQ-INQR-009 인수기준:
 * "각 조건 변경 후 재조회 시 결과가 조건에 맞게 필터링·정렬된다").
 */
const defaultCondition = (accountId: number | null) => ({
  accountId,
  period: recentPeriod(),
  content: "all",
  order: "recent",
  keyword: "",
})

const CONTENT_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "입금만", value: "deposit" },
  { label: "출금만", value: "withdraw" },
]

const DIRECTION_BY_CONTENT: Record<string, "ALL" | "DEPOSIT" | "WITHDRAWAL"> = {
  all: "ALL",
  deposit: "DEPOSIT",
  withdraw: "WITHDRAWAL",
}

const SORT_BY_ORDER: Record<string, "LATEST" | "OLDEST"> = {
  recent: "LATEST",
  past: "OLDEST",
}

const ORDER_OPTIONS = [
  { label: "최근거래순", value: "recent" },
  { label: "과거거래순", value: "past" },
]

const amountCell = (value: number, color: string) => {
  if (value === 0) return <span className="text-ink-faint">-</span>
  return <span style={{ color }}>{formatAmount(value, { suffix: false })}</span>
}

type InfoItem = {
  term: string
  desc: React.ReactNode
  dominant?: boolean
}

const InfoRow = ({
  items,
  gridCols,
}: {
  items: InfoItem[]
  gridCols: string
}) => {
  return (
    <dl className={cn("grid divide-x divide-border", gridCols)}>
      {items.map((item) => (
        <div key={item.term} className="flex flex-col gap-1 px-4 py-3">
          <dt
            className={cn(
              "text-xs",
              item.dominant ? "text-ink-faint" : "text-ink-muted",
            )}
          >
            {item.term}
          </dt>
          <dd
            className={cn(
              item.dominant
                ? "text-h2 font-bold text-primary"
                : "text-base font-bold text-ink",
            )}
          >
            {item.desc}
          </dd>
        </div>
      ))}
    </dl>
  )
}

export const B03TransactionInquiry = () => {
  const { time: BASE_TIME, capture: captureBaseTime } = useCapturedBaseTime()
  const TODAY = getToday()
  const [searchParams] = useSearchParams()

  const rawAccountIdParam = searchParams.get("accountId")
  const legacyAccountParam = searchParams.get("account")

  const accountIdParam = React.useMemo(() => {
    if (!rawAccountIdParam) return null

    const parsed = Number(rawAccountIdParam)

    return Number.isInteger(parsed) && parsed > 0 ? parsed : null
  }, [rawAccountIdParam])

  const {
    overview,
    accounts,
    isLoading: isAccountsLoading,
    isError: isAccountsError,
    error: accountsError,
  } = useInquirableAccounts()

  const hasRequestedAccountParam =
    rawAccountIdParam !== null || legacyAccountParam !== null

  const requestedAccountId = React.useMemo(() => {
    if (rawAccountIdParam !== null) {
      if (accountIdParam == null) {
        return null
      }

      return accounts.some((account) => account.accountId === accountIdParam)
        ? accountIdParam
        : null
    }

    if (legacyAccountParam !== null) {
      return (
        accounts.find((account) => account.accountNumber === legacyAccountParam)
          ?.accountId ?? null
      )
    }

    return null
  }, [rawAccountIdParam, legacyAccountParam, accountIdParam, accounts])

  const initialAccountId = hasRequestedAccountParam
    ? requestedAccountId
    : (accounts[0]?.accountId ?? null)

  const [applied, setApplied] = React.useState(() => defaultCondition(null))

  const [accountId, setAccountId] = React.useState<number | null>(null)

  const effectiveAccountId =
    accountId != null
      ? accounts.some((item) => item.accountId === accountId)
        ? accountId
        : null
      : initialAccountId

  const effectiveAppliedAccountId =
    applied.accountId != null
      ? accounts.some((item) => item.accountId === applied.accountId)
        ? applied.accountId
        : null
      : initialAccountId

  const [period, setPeriod] = React.useState(applied.period)
  const [content, setContent] = React.useState(applied.content)
  const [order, setOrder] = React.useState(applied.order)
  const [keyword, setKeyword] = React.useState(applied.keyword)
  const [pageSize, setPageSize] = React.useState<number>(
    QUERY_DEFAULT_PAGE_SIZE,
  )
  const [page, setPage] = React.useState(1)
  const {
    incomplete: periodIncomplete,
    reversed: periodReversed,
    overLimit: periodOverLimit,
  } = checkPeriodRange(period.start, period.end, TODAY, MAX_PERIOD_DAYS)
  const transactionParams = React.useMemo(
    () => ({
      fromDate: applied.period.start,
      toDate: applied.period.end,
      direction: DIRECTION_BY_CONTENT[applied.content] ?? "ALL",
      keyword: applied.keyword.trim() || undefined,
      sort: SORT_BY_ORDER[applied.order] ?? "LATEST",
      page,
      size: pageSize,
    }),
    [applied, page, pageSize],
  )

  const {
    data: transactionData,
    isLoading: isTransactionsLoading,
    isError: isTransactionsError,
    error: transactionsError,
  } = useAccountTransactionQuery(effectiveAppliedAccountId, transactionParams)
  const {
    data: accountDetail,
    isLoading: isAccountDetailLoading,
    isError: isAccountDetailError,
    refetch: refetchAccountDetail,
  } = useAccountDetailQuery(effectiveAppliedAccountId)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)
  const [periodAlertMessage, setPeriodAlertMessage] = React.useState<
    string | null
  >(null)
  const selectedAccount =
    accounts.find((item) => item.accountId === effectiveAppliedAccountId) ??
    null
  const accountOptions = React.useMemo(
    () =>
      accounts.map((item) => ({
        alias: item.accountName,
        accountNo: item.accountNumber,
        balance: item.balance,
      })),
    [accounts],
  )

  const selectedInputAccountNo =
    accounts.find((item) => item.accountId === effectiveAccountId)
      ?.accountNumber ?? ""

  const rows = React.useMemo<Transaction[]>(
    () => toTransactionRows(transactionData?.items ?? []),
    [transactionData?.items],
  )
  const renderAccountDetailValue = (value: React.ReactNode) => {
    if (isAccountDetailLoading) {
      return <Skeleton className="h-5 w-24" />
    }

    if (isAccountDetailError || accountDetail == null) {
      return "-"
    }

    return value
  }

  const depositSum = transactionData?.summary?.depositAmount ?? 0
  const depositCount = transactionData?.summary?.depositCount ?? 0
  const withdrawSum = transactionData?.summary?.withdrawalAmount ?? 0
  const withdrawCount = transactionData?.summary?.withdrawalCount ?? 0

  const totalCount = transactionData?.totalCount ?? 0
  const totalPages = transactionData?.totalPages ?? 0

  const accountStatus =
    accountDetail?.status === "SUSPENDED" ? "거래정지" : "정상"
  const columns: DataGridColumn<Transaction>[] = [
    {
      key: "date",
      header: "거래일자",
      align: "center",
      width: 110,
      render: (r) => <span>{formatDate(r.date)}</span>,
    },
    {
      key: "time",
      header: "거래시각",
      align: "center",
      width: 90,
      render: (r) => <span>{r.time}</span>,
    },
    { key: "description", header: "적요", align: "left", width: 100 },
    {
      key: "withdraw",
      header: "출금금액",
      align: "right",
      width: 120,
      render: (r) => amountCell(r.withdraw, "var(--color-danger)"),
    },
    {
      key: "deposit",
      header: "입금금액",
      align: "right",
      width: 120,
      render: (r) => amountCell(r.deposit, "var(--color-deposit)"),
    },
    { key: "content", header: "거래내용", align: "left" },
    {
      key: "balance",
      header: "거래후잔액",
      align: "right",
      width: 130,
      render: (r) => formatAmount(r.balance, { suffix: false }),
    },
    { key: "channel", header: "거래채널", align: "center", width: 100 },
  ]

  const exportHeaders = [
    "거래일자",
    "거래시각",
    "계좌번호",
    "적요",
    "거래내용",
    "출금금액",
    "입금금액",
    "거래후잔액",
    "거래채널",
  ]

  const handleReset = () => {
    const next = defaultCondition(accounts[0]?.accountId ?? null)
    setApplied(next)
    setAccountId(next.accountId)
    setPeriod(next.period)
    setContent(next.content)
    setOrder(next.order)
    setKeyword(next.keyword)
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const handleSearch = () => {
    savedCondition.clear()
    downloadComplete.clear()
    /** REQ-INQR-010: 시작일이 1년을 초과하거나 종료일보다 늦으면 조회를 거부한다. */
    if (periodIncomplete) {
      setPeriodAlertMessage("조회 시작일과 종료일을 모두 입력하세요.")
      return
    }
    if (periodReversed) {
      setPeriodAlertMessage(
        "종료일이 시작일보다 빠릅니다. 조회기간을 다시 지정하세요.",
      )
      return
    }
    if (periodOverLimit) {
      setPeriodAlertMessage(
        "조회기간은 최대 1년 이내여야 하고, 시작일도 조회 시점으로부터 1년 이내여야 합니다.",
      )
      return
    }
    setApplied({
      accountId: effectiveAccountId,
      period,
      content,
      order,
      keyword,
    })
    setPage(1)
    captureBaseTime()
  }
  if (isAccountsLoading) {
    return (
      <div className="p-6 text-base text-ink-muted">
        계좌 정보를 불러오는 중입니다.
      </div>
    )
  }

  if (isAccountsError || !overview) {
    return (
      <div className="p-6 text-base text-danger">
        {isAccountsError
          ? toErrorMessage(accountsError)
          : "계좌 정보를 불러오지 못했습니다."}
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div className="p-6 text-base text-ink-muted">
        조회할 계좌가 없습니다.
      </div>
    )
  }

  if (hasRequestedAccountParam && requestedAccountId == null) {
    return (
      <div className="p-6 text-base text-danger">
        요청한 계좌를 찾을 수 없습니다.
      </div>
    )
  }

  if (!selectedAccount) {
    return (
      <div className="p-6 text-base text-ink-muted">
        조회할 계좌를 선택해 주세요.
      </div>
    )
  }

  const exportRows = rows.map((r) => [
    formatDate(r.date),
    r.time,
    maskAccountNo(selectedAccount.accountNumber),
    r.description,
    r.content,
    r.withdraw > 0 ? formatAmount(r.withdraw, { suffix: false }) : "-",
    r.deposit > 0 ? formatAmount(r.deposit, { suffix: false }) : "-",
    formatAmount(r.balance, { suffix: false }),
    r.channel,
  ])

  return (
    <div className="border border-border bg-surface-elevated p-6">
      <FormSection title="조회조건">
        <SearchPanel
          onReset={handleReset}
          onSearch={handleSearch}
          onSaveCondition={savedCondition.save}
        >
          <FormRow label="조회계좌번호" htmlFor="inq-account">
            <AccountSelectField
              id="inq-account"
              options={accountOptions}
              value={selectedInputAccountNo}
              onChange={(accountNumber) => {
                const nextAccount = accounts.find(
                  (item) => item.accountNumber === accountNumber,
                )

                setAccountId(nextAccount?.accountId ?? null)
              }}
            />
          </FormRow>
          <FormRow label="조회기간">
            <PeriodField
              start={period.start}
              end={period.end}
              onChange={setPeriod}
              today={TODAY}
            />
            <p className="mt-1 text-2xs text-ink-muted">
              ※ 조회기간은 시작일 기준 최대 1년 이내로 지정할 수
              있습니다(기본값은 최근 1개월입니다).
            </p>
          </FormRow>
          <FormRow label="조회내용">
            <RadioRowField
              name="inq-content"
              options={CONTENT_OPTIONS}
              value={content}
              onChange={setContent}
            />
          </FormRow>
          <FormRow label="거래내용 검색" htmlFor="inq-keyword">
            <KeywordField
              id="inq-keyword"
              value={keyword}
              onChange={setKeyword}
            />
          </FormRow>
          <FormRow label="조회결과순서">
            <RadioRowField
              name="inq-order"
              options={ORDER_OPTIONS}
              value={order}
              onChange={setOrder}
            />
          </FormRow>
        </SearchPanel>
      </FormSection>

      <CollapsibleSection title="계좌정보" className="mb-6">
        <div>
          <InfoRow
            gridCols="grid-cols-4"
            items={[
              {
                term: "계좌명",
                desc: renderAccountDetailValue(
                  accountDetail?.accountName || "-",
                ),
              },
              {
                term: "예금주",
                desc: renderAccountDetailValue(accountDetail?.ownerName || "-"),
              },
              {
                term: "계좌번호",
                desc: renderAccountDetailValue(
                  accountDetail?.accountNumber
                    ? formatAccountNo(accountDetail.accountNumber)
                    : "-",
                ),
              },
              {
                term: "계좌상태",
                desc: renderAccountDetailValue(
                  <Badge variant={getAccountStatusBadgeVariant(accountStatus)}>
                    {accountStatus}
                  </Badge>,
                ),
              },
            ]}
          />
          <div className="border-t border-border">
            <InfoRow
              gridCols="grid-cols-3"
              items={[
                {
                  term: "계좌잔액",
                  desc: renderAccountDetailValue(
                    accountDetail?.balance != null
                      ? formatAmount(accountDetail.balance)
                      : "-",
                  ),
                  dominant: true,
                },
                {
                  term: "출금가능금액",
                  desc: renderAccountDetailValue(
                    accountDetail?.availableBalance != null
                      ? formatAmount(accountDetail.availableBalance)
                      : "-",
                  ),
                },
                {
                  term: "신규일자",
                  desc: renderAccountDetailValue(
                    accountDetail?.openedDate
                      ? formatDate(accountDetail.openedDate)
                      : "-",
                  ),
                },
              ]}
            />
          </div>
          {isAccountDetailError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-2 border-t border-border bg-danger-tint px-4 py-2"
            >
              <p className="text-base text-ink">
                계좌 상세정보를 불러오지 못했습니다.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refetchAccountDetail()}
              >
                다시 조회
              </Button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      <FormSection title="거래내역" className="mb-0">
        <SummaryRow
          className="mb-3"
          items={[
            {
              label: "입금합계",
              value: (
                <span>
                  {formatAmount(depositSum)}{" "}
                  <span className="text-xs font-normal text-ink-muted">
                    ({depositCount}건)
                  </span>
                </span>
              ),
              valueColor: "var(--color-deposit)",
            },
            {
              label: "출금합계",
              value: (
                <span>
                  {formatAmount(withdrawSum)}{" "}
                  <span className="text-xs font-normal text-ink-muted">
                    ({withdrawCount}건)
                  </span>
                </span>
              ),
              valueColor: "var(--color-danger)",
            },
          ]}
        />

        <GridToolbar
          periodLabel={`${formatDate(applied.period.start)} ~ ${formatDate(applied.period.end)}`}
          totalCount={totalCount}
          pageSize={pageSize}
          showAllOption={false}
          onPageSizeChange={(size) => {
            if (size === "all") return

            setPageSize(size)
            setPage(1)
          }}
          baseTimeLabel={formatDateTime(BASE_TIME)}
          onPrint={() => window.print()}
          onBrailleView={() => setBrailleOpen(true)}
          onSaveFile={() => {
            downloadCsv(`거래내역조회_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="현재 페이지 거래내역조회"
        />

        {isTransactionsLoading ? (
          <div className="p-6 text-center text-base text-ink-muted">
            거래내역을 불러오는 중입니다.
          </div>
        ) : isTransactionsError ? (
          <div className="p-6 text-center text-base text-danger">
            {toErrorMessage(transactionsError)}
          </div>
        ) : (
          <>
            <DataGrid
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              emptyMessage="조회 결과가 없습니다."
            />

            <Pagination
              page={transactionData?.page ?? page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}

        <SavedConditionAlert open={savedCondition.saved} className="mt-2" />
        <SavedConditionAlert
          open={downloadComplete.saved}
          message="현재 페이지의 거래내역이 저장되었습니다."
          className="mt-2"
        />
      </FormSection>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "조회기간은 시작일 기준 최대 1년 이내로 지정할 수 있으며, 시작일이 종료일보다 늦으면 조회되지 않습니다.",
          "거래 후 잔액은 해당 거래 처리 시점 기준이며, 이후 발생한 거래에 따라 현재 잔액과 다를 수 있습니다.",
          "자동이체 실행 건은 적요가 '자동이체'로 표시됩니다.",
          "파일저장은 현재 표시 중인 페이지의 거래내역을 CSV로 저장하며, 파일에는 마스킹된 계좌번호가 사용됩니다.",
        ]}
      />

      <AlertDialog
        open={periodAlertMessage != null}
        onClose={() => setPeriodAlertMessage(null)}
        messages={periodAlertMessage ? [periodAlertMessage] : []}
      />

      <TextViewModal
        open={brailleOpen}
        onClose={() => setBrailleOpen(false)}
        title="거래내역조회 점자보기"
        headers={exportHeaders}
        rows={exportRows}
      />
    </div>
  )
}

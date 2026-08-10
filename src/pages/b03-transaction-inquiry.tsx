import * as React from "react"
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
  MOCK_ACCOUNTS,
  MOCK_TRANSACTIONS,
  getAccountStatusBadgeVariant,
  type Transaction,
} from "@/entities/transaction"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
  maskName,
} from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { daysBetween } from "@/shared/lib/date"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import {
  MOCK_NOW as BASE_TIME,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"
import { QUERY_MAX_RANGE_DAYS as MAX_RANGE_DAYS } from "@/shared/config/policy"

const DEFAULT_PERIOD = { start: "2026-06-23", end: TODAY }

const CONTENT_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "입금만", value: "deposit" },
  { label: "출금만", value: "withdraw" },
]

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
            className={
              item.dominant
                ? "text-xs text-ink-faint"
                : "text-base text-ink-muted"
            }
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
  const [searchParams] = useSearchParams()
  const [account, setAccount] = React.useState(() => {
    /** REQ-INQR-005: 계좌목록의 [조회] 진입 시 해당 계좌가 선택된 상태로 시작한다. */
    const accountParam = searchParams.get("account")
    const preselected = MOCK_ACCOUNTS.find((a) => a.accountNo === accountParam)
    return preselected?.accountNo ?? MOCK_ACCOUNTS[0].accountNo
  })
  // periodDraft는 입력 중인 값, period는 [조회] 통과 후 실제 필터링에 반영되는 값이다(REQ-INQR-010).
  const [periodDraft, setPeriodDraft] = React.useState(DEFAULT_PERIOD)
  const [period, setPeriod] = React.useState(DEFAULT_PERIOD)
  const [content, setContent] = React.useState("all")
  const [order, setOrder] = React.useState("recent")
  const [keyword, setKeyword] = React.useState("")
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const savedCondition = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)
  const [periodAlertMessage, setPeriodAlertMessage] = React.useState<
    string | null
  >(null)

  const selectedAccount =
    MOCK_ACCOUNTS.find((a) => a.accountNo === account) ?? MOCK_ACCOUNTS[0]

  const periodReversed = daysBetween(periodDraft.start, periodDraft.end) < 0
  const periodOverLimit = daysBetween(periodDraft.start, TODAY) > MAX_RANGE_DAYS

  // Presentation-only filtering/ordering over the mock rows.
  const rows = React.useMemo(() => {
    const trimmedKeyword = keyword.trim()
    let next = MOCK_TRANSACTIONS.filter((t) => {
      if (t.date < period.start || t.date > period.end) return false
      if (content === "deposit" && t.deposit <= 0) return false
      if (content === "withdraw" && t.withdraw <= 0) return false
      if (trimmedKeyword && !t.description.includes(trimmedKeyword))
        return false
      return true
    })
    next = [...next].sort((a, b) => {
      const aKey = `${a.date}T${a.time}`
      const bKey = `${b.date}T${b.time}`
      return order === "recent"
        ? bKey.localeCompare(aKey)
        : aKey.localeCompare(bKey)
    })
    return next
  }, [period, content, order, keyword])

  const depositSum = rows.reduce((s, t) => s + t.deposit, 0)
  const depositCount = rows.filter((t) => t.deposit > 0).length
  const withdrawSum = rows.reduce((s, t) => s + t.withdraw, 0)
  const withdrawCount = rows.filter((t) => t.withdraw > 0).length

  const size = pageSize === "all" ? rows.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * size, safePage * size)

  const columns: DataGridColumn<Transaction>[] = [
    {
      key: "date",
      header: "거래일자",
      align: "center",
      width: 110,
      sortable: true,
      sortValue: (r) => `${r.date}T${r.time}`,
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
      sortable: true,
      sortValue: (r) => r.withdraw,
      render: (r) => amountCell(r.withdraw, "var(--color-danger)"),
    },
    {
      key: "deposit",
      header: "입금금액",
      align: "right",
      width: 120,
      sortable: true,
      sortValue: (r) => r.deposit,
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
  const exportRows = rows.map((r) => [
    formatDate(r.date),
    r.time,
    maskAccountNo(selectedAccount.accountNo),
    r.description,
    r.content,
    r.withdraw > 0 ? formatAmount(r.withdraw, { suffix: false }) : "-",
    r.deposit > 0 ? formatAmount(r.deposit, { suffix: false }) : "-",
    formatAmount(r.balance, { suffix: false }),
    r.channel,
  ])

  const handleReset = () => {
    setAccount(MOCK_ACCOUNTS[0].accountNo)
    setPeriodDraft(DEFAULT_PERIOD)
    setPeriod(DEFAULT_PERIOD)
    setContent("all")
    setOrder("recent")
    setKeyword("")
    setPage(1)
    savedCondition.clear()
  }

  const handleSearch = () => {
    savedCondition.clear()
    /** REQ-INQR-010: 시작일이 1년을 초과하거나 종료일보다 늦으면 조회를 거부한다. */
    if (periodReversed) {
      setPeriodAlertMessage(
        "종료일이 시작일보다 빠릅니다. 조회기간을 다시 지정하세요.",
      )
      return
    }
    if (periodOverLimit) {
      setPeriodAlertMessage(
        "조회 시작일은 조회 시점으로부터 최대 1년 이내로 지정할 수 있습니다.",
      )
      return
    }
    setPeriod(periodDraft)
    setPage(1)
  }

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
              options={MOCK_ACCOUNTS}
              value={account}
              onChange={setAccount}
            />
          </FormRow>
          <FormRow label="조회기간">
            <PeriodField
              start={periodDraft.start}
              end={periodDraft.end}
              onChange={setPeriodDraft}
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
          <FormRow label="적요검색" htmlFor="inq-keyword">
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

      <SavedConditionAlert open={savedCondition.saved} className="mb-6" />

      <CollapsibleSection title="계좌정보" className="mb-6">
        <div>
          <InfoRow
            gridCols="grid-cols-4"
            items={[
              { term: "계좌명", desc: selectedAccount.alias },
              { term: "예금주", desc: maskName(selectedAccount.ownerName) },
              {
                term: "계좌번호",
                desc: formatAccountNo(selectedAccount.accountNo),
              },
              {
                term: "계좌상태",
                desc: (
                  <Badge
                    variant={getAccountStatusBadgeVariant(
                      selectedAccount.status,
                    )}
                  >
                    {selectedAccount.status}
                  </Badge>
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
                  desc: formatAmount(selectedAccount.balance),
                  dominant: true,
                },
                {
                  term: "출금가능금액",
                  desc: formatAmount(selectedAccount.withdrawable),
                },
                {
                  term: "신규일자",
                  desc: formatDate(selectedAccount.openedDate),
                },
              ]}
            />
          </div>
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
          onSaveFile={() =>
            downloadCsv(`거래내역조회_${TODAY}.csv`, exportHeaders, exportRows)
          }
          resultLabel="거래내역조회"
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
      </FormSection>

      <NoticeBoxFooter
        className="mt-8"
        items={[
          "조회기간은 시작일 기준 최대 1년 이내로 지정할 수 있으며, 시작일이 종료일보다 늦으면 조회되지 않습니다.",
          "거래 후 잔액은 해당 거래 처리 시점 기준이며, 이후 발생한 거래에 따라 현재 잔액과 다를 수 있습니다.",
          "자동이체 실행 건은 적요가 '자동이체'로 표시됩니다.",
          "조회 결과는 CSV 파일로 저장할 수 있으며, 파일에는 마스킹된 계좌번호가 사용됩니다.",
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

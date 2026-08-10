import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Select } from "@/shared/ui/select"
import { Badge } from "@/shared/ui/badge"
import {
  GridToolbar,
  PeriodField,
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
  MOCK_AUTO_TRANSFER_RESULTS,
  getAutoTransferResultBadgeVariant,
  AUTO_TRANSFER_CYCLE_LABEL as CYCLE_LABEL,
  type AutoTransferResultRow,
} from "@/entities/transfer"
import {
  MOCK_NOW as BASE_TIME,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"

const FROM_ACCOUNTS = Array.from(
  new Map(
    MOCK_AUTO_TRANSFER_RESULTS.map((r) => [r.fromAccountNo, r.fromAlias]),
  ).entries(),
)

export const G05AutoTransferResults = () => {
  const [fromAccount, setFromAccount] = React.useState("all")
  const [period, setPeriod] = React.useState({
    start: "2026-06-23",
    end: TODAY,
  })
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const savedCondition = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const rows = React.useMemo(() => {
    return MOCK_AUTO_TRANSFER_RESULTS.filter((r) => {
      const d = r.processedAt.slice(0, 10)
      if (d < period.start || d > period.end) return false
      if (fromAccount !== "all" && r.fromAccountNo !== fromAccount) return false
      return true
    }).sort((a, b) => b.processedAt.localeCompare(a.processedAt))
  }, [fromAccount, period])

  const normal = rows.filter((r) => r.result === "정상")
  const error = rows.filter((r) => r.result === "오류")
  const sum = (list: AutoTransferResultRow[]) =>
    list.reduce((s, r) => s + r.amount, 0)

  const size = pageSize === "all" ? rows.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = rows.slice((safePage - 1) * size, safePage * size)

  const handleReset = () => {
    setFromAccount("all")
    setPeriod({ start: "2026-06-23", end: TODAY })
    setPage(1)
    savedCondition.clear()
  }

  const exportHeaders = [
    "처리결과",
    "처리일시",
    "출금계좌",
    "입금계좌",
    "예금주",
    "이체금액",
    "이체주기",
    "표시내용",
    "실패사유",
  ]
  const exportRows = rows.map((r) => [
    r.result,
    formatDateTime(r.processedAt),
    `${r.fromAlias} ${maskAccountNo(r.fromAccountNo)}`,
    maskAccountNo(r.toAccountNo),
    maskName(r.payeeName),
    formatAmount(r.amount),
    CYCLE_LABEL[r.cycleMonths],
    r.memo,
    r.failReason ?? "-",
  ])

  const columns: DataGridColumn<AutoTransferResultRow>[] = [
    {
      key: "result",
      header: "처리결과",
      align: "center",
      width: 90,
      render: (r) => (
        <Badge variant={getAutoTransferResultBadgeVariant(r.result)}>
          {r.result}
        </Badge>
      ),
    },
    {
      key: "processedAt",
      header: "처리일시",
      width: 150,
      sortable: true,
      sortValue: (r) => r.processedAt,
      render: (r) => <span>{formatDateTime(r.processedAt)}</span>,
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
      key: "cycleMonths",
      header: "이체주기",
      align: "center",
      width: 90,
      render: (r) => CYCLE_LABEL[r.cycleMonths],
    },
    { key: "memo", header: "표시내용", align: "left" },
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
        "회차 처리결과는 이체 처리상태(정상/오류)를 그대로 사용합니다.",
        "실행 실패 건은 재시도되지 않으며 다음 회차부터 정상 진행됩니다.",
      ]}
      footerItems={[
        "자동이체 회차 실행 실패는 해당 회차만 오류로 처리되며 이후 회차 실행에는 영향을 주지 않습니다(POL-038).",
      ]}
      modals={
        <>
          <TextViewModal
            open={brailleOpen}
            onClose={() => setBrailleOpen(false)}
            title="자동이체 결과조회 점자보기"
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
          }}
          onSaveCondition={savedCondition.save}
        >
          <FormRow label="출금계좌번호" htmlFor="g05-from">
            <Select
              id="g05-from"
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
          <FormRow label="조회기간">
            <PeriodField
              start={period.start}
              end={period.end}
              onChange={setPeriod}
              today={TODAY}
            />
          </FormRow>
        </SearchPanel>
      </FormSection>

      <FormSection title="자동이체 결과" className="mb-0">
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
          ]}
        />
        <p className="mb-3 text-2xs text-ink-faint">
          ※ 집계 금액은 페이징과 무관하게 조회 조건에 해당하는 전체 건
          기준입니다.
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
          onSaveFile={() =>
            downloadCsv(
              `자동이체결과조회_${TODAY}.csv`,
              exportHeaders,
              exportRows,
            )
          }
          resultLabel="자동이체결과조회"
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
      </FormSection>
    </QueryPageLayout>
  )
}

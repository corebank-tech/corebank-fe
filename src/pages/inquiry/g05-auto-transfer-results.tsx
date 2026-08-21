import * as React from "react"
import { keepPreviousData } from "@tanstack/react-query"
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
  getAutoTransferResultBadgeVariant,
  toAutoTransferResultRow,
  AUTO_TRANSFER_CYCLE_LABEL as CYCLE_LABEL,
  type AutoTransferResultRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { addMonths } from "@/shared/lib/date"
import { useBaseTime } from "@/shared/lib/hooks/use-base-time"
import { useSearchAutoTransferExecutions } from "@/shared/api/generated/auto-transfer-controller/auto-transfer-controller"
import { useWithdrawAccounts } from "@/entities/account"
import type { AutoTransferExecutionHistoryPageResponse } from "@/shared/api/generated/model"

/** REQ-AUTO-018: 조회기간 기본값은 1개월이다. */
const DEFAULT_PERIOD_MONTHS = 1

// 서버가 페이지 크기를 5·10·20·30·50 화이트리스트로 막는다. 툴바의 "전체 보기"를
// 그대로 보내면 CMN0005로 400이 난다. E-05와 같은 임시 대응이고, 툴바에서 옵션을
// 없애는 근본 수정은 #46에서 공용 위젯과 함께 정리한다.
const MAX_PAGE_SIZE = 50

const defaultPeriod = () => {
  const today = getToday()
  return { start: addMonths(today, -DEFAULT_PERIOD_MONTHS), end: today }
}

export const G05AutoTransferResults = () => {
  const BASE_TIME = useBaseTime()
  const TODAY = getToday()
  // 입력 중인 조회조건과 실제로 조회에 쓰인 조건을 분리한다. 쿼리 키가 입력 state에
  // 바로 물려 있으면 계좌·기간을 건드릴 때마다 요청이 나가고 "조회" 버튼이 무의미해진다.
  const [applied, setApplied] = React.useState<{
    accountId: number | null
    period: { start: string; end: string }
  }>(() => ({ accountId: null, period: defaultPeriod() }))
  const [fromAccountId, setFromAccountId] = React.useState<number | null>(null)
  const [period, setPeriod] = React.useState(defaultPeriod)
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const { accounts: withdrawAccounts } = useWithdrawAccounts()

  // 계좌 목록은 비동기로 도착하므로, 아직 사용자가 고르지 않았다면 첫 계좌를
  // 렌더링 중에 파생값으로 기본 선택한다(useEffect + setState 대신).
  const defaultAccountId = withdrawAccounts[0]?.accountId ?? null
  const selectedAccountId = fromAccountId ?? defaultAccountId
  const appliedAccountId = applied.accountId ?? defaultAccountId
  const appliedAccount = withdrawAccounts.find(
    (a) => a.accountId === appliedAccountId,
  )

  const size = pageSize === "all" ? MAX_PAGE_SIZE : pageSize
  const { data, isFetching, isError, refetch } =
    useSearchAutoTransferExecutions(
      {
        // REQ-AUTO-018: 출금계좌는 조회조건이라 서버가 필수로 받는다. 값이 정해지기
        // 전에는 enabled로 요청 자체를 막으므로 이 0은 실제로 나가지 않는다.
        withdrawalAccountId: appliedAccountId ?? 0,
        fromDate: applied.period.start,
        toDate: applied.period.end,
        page: page - 1,
        size,
      },
      {
        query: {
          enabled: appliedAccountId != null,
          // 페이지·조회조건을 바꾸면 새 쿼리 키라 data가 undefined로 떨어진다. 결과가
          // 올 때까지 이전 응답을 유지해서 조회조건 폼과 요약이 화면째로 사라지지 않게 한다.
          placeholderData: keepPreviousData,
        },
      },
    )

  const pageData = data as unknown as
    AutoTransferExecutionHistoryPageResponse | undefined
  // 출금계좌 정보는 응답에 없다. 조회 조건으로 지정한 계좌가 그대로 그 값이다.
  const pageRows = (pageData?.items ?? []).map((item) =>
    toAutoTransferResultRow(item, {
      accountNo: appliedAccount?.accountNumber ?? "",
      alias: appliedAccount?.accountName ?? "",
    }),
  )
  const totalCount = pageData?.totalCount ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)

  // REQ-AUTO-019: 집계는 페이징과 무관한 조회조건 전체 기준이라 서버가 계산해 준다.
  // 현재 페이지만 더하면 페이지를 넘길 때마다 값이 달라진다.
  const summary = pageData?.summary

  // 조회조건이 바뀌어 결과가 줄면 totalPages만 작아지고 page는 그대로라, 요청은 범위
  // 밖 페이지를 계속 보내면서 빈 목록이 뜬다. 렌더 중 보정하면 React가 커밋 전에
  // 다시 렌더해서 같은 패스에서 올바른 페이지로 요청이 나간다.
  if (page > totalPages) setPage(totalPages)

  const handleReset = () => {
    const next = defaultPeriod()
    setFromAccountId(null)
    setPeriod(next)
    setApplied({ accountId: null, period: next })
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const handleSearch = () => {
    const sameCondition =
      appliedAccountId === selectedAccountId &&
      applied.period.start === period.start &&
      applied.period.end === period.end
    setApplied({ accountId: selectedAccountId, period })
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
    // 조건도 페이지도 그대로면 쿼리 키가 같아 요청이 나가지 않는다. 조회를 누른
    // 이상 최신 상태를 보여줘야 하므로 명시적으로 다시 부른다.
    if (sameCondition && page === 1) refetch()
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
  const exportRows = pageRows.map((r) => [
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
          onSearch={handleSearch}
          onSaveCondition={savedCondition.save}
        >
          {/* REQ-AUTO-018: 출금계좌는 조회조건이라 "전체"가 없다. */}
          <FormRow label="출금계좌번호" htmlFor="g05-from">
            <Select
              id="g05-from"
              className="max-w-md"
              value={selectedAccountId ?? ""}
              onChange={(e) => setFromAccountId(Number(e.target.value))}
            >
              {withdrawAccounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {`${a.accountName ?? ""} / ${formatAccountNo(a.accountNumber ?? "")}`}
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
                  {formatAmount(summary?.errorAmount ?? 0)}{" "}
                  <span className="text-base font-normal text-ink-faint">
                    ({summary?.errorCount ?? 0}건)
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
          totalCount={totalCount}
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
              `자동이체결과조회_${TODAY}.csv`,
              exportHeaders,
              exportRows,
            )
            downloadComplete.save()
          }}
          resultLabel="자동이체결과조회"
        />

        <DataGrid
          columns={columns}
          rows={pageRows}
          loading={isFetching}
          rowKey={(r) => r.id}
          emptyMessage={
            isError
              ? "자동이체 결과를 불러오지 못했습니다."
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

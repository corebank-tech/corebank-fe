import * as React from "react"
import { useNavigate } from "react-router"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { SummaryRow } from "@/shared/ui/summary-row"
import { GridToolbar } from "@/widgets/query"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import {
  GridSearchModal,
  type GridSearchField,
} from "@/shared/ui/grid-search-modal"
import { downloadCsv } from "@/shared/lib/csv"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
} from "@/shared/lib/format"
import {
  MOCK_OVERVIEW_ACCOUNTS,
  type AccountGroupId,
  type OverviewAccount,
} from "@/entities/account"
import {
  MOCK_NOW as BASE_TIME,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"

const GROUP_LABELS: Record<AccountGroupId, string> = {
  checking: "입출금계좌",
  deposit: "예금·적금계좌",
}

/** REQ-CMN-020: 그리드가 보유한 컬럼 중 검색 대상 목록. */
const SEARCH_FIELDS: GridSearchField[] = [
  { key: "alias", label: "계좌명" },
  { key: "accountNo", label: "계좌번호" },
]

/** REQ-INQR-004: 계좌명, 계좌번호, 신규일, 최근거래일(예적금은 만기일), 잔액, 업무. */
function buildColumns(
  group: AccountGroupId,
  onInquire: (accountNo: string) => void,
  onTransfer: (accountNo: string) => void,
): DataGridColumn<OverviewAccount>[] {
  return [
    { key: "alias", header: "계좌명", width: 180 },
    {
      key: "accountNo",
      header: "계좌번호",
      width: 160,
      render: (r) => (
        <span className="tabular-nums">{formatAccountNo(r.accountNo)}</span>
      ),
    },
    {
      key: "openedDate",
      header: "신규일",
      align: "center",
      width: 120,
      render: (r) => (
        <span className="tabular-nums">{formatDate(r.openedDate)}</span>
      ),
    },
    {
      key: "lastActivityDate",
      header: group === "deposit" ? "만기일" : "최근거래일",
      align: "center",
      width: 120,
      render: (r) => (
        <span className="tabular-nums">{formatDate(r.lastActivityDate)}</span>
      ),
    },
    {
      key: "balance",
      header: "잔액",
      align: "right",
      width: 140,
      sortable: true,
      sortValue: (r) => r.balance,
      render: (r) => formatAmount(r.balance),
    },
    {
      key: "actions",
      header: "업무",
      align: "center",
      width: 140,
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onInquire(r.accountNo)}
          >
            조회
          </Button>
          {r.isWithdrawalAccount && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(r.accountNo)}
            >
              이체
            </Button>
          )}
        </div>
      ),
    },
  ]
}

const GROUP_ORDER: AccountGroupId[] = ["checking", "deposit"]

export const B01AllAccounts = () => {
  const navigate = useNavigate()
  const [pageSize, setPageSize] = React.useState<number | "all">("all")
  const [brailleOpen, setBrailleOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [search, setSearch] = React.useState<{
    field: string
    keyword: string
  } | null>(null)

  const handleInquire = (accountNo: string) => {
    navigate(`/inquiry?account=${accountNo}`)
  }
  const handleTransfer = (accountNo: string) => {
    navigate(`/instant-transfer?from=${accountNo}`)
  }

  const filteredAccounts = React.useMemo(() => {
    if (!search || !search.keyword) return MOCK_OVERVIEW_ACCOUNTS
    return MOCK_OVERVIEW_ACCOUNTS.filter((a) => {
      const value =
        search.field === "accountNo" ? formatAccountNo(a.accountNo) : a.alias
      return value.includes(search.keyword)
    })
  }, [search])

  const grandTotal = filteredAccounts.reduce((sum, a) => sum + a.balance, 0)

  /** REQ-INQR-015: CSV 저장 시에만 계좌번호를 마스킹한다(화면 표시는 마스킹하지 않음, REQ-CMN-017). */
  const exportHeaders = [
    "상품군",
    "계좌명",
    "계좌번호",
    "신규일",
    "최근거래일/만기일",
    "잔액",
  ]
  const exportRows = filteredAccounts.map((a) => [
    GROUP_LABELS[a.group],
    a.alias,
    maskAccountNo(a.accountNo),
    formatDate(a.openedDate),
    formatDate(a.lastActivityDate),
    formatAmount(a.balance),
  ])

  return (
    <QueryPageLayout
      noticeItems={[
        "계좌 잔액은 조회 시점 기준으로 표시되며 실제 거래 처리 결과와 다를 수 있습니다.",
        "예금·적금계좌는 최근거래일 대신 만기일이 표시됩니다.",
        "[이체]는 출금계좌로 등록된 입출금계좌에만 노출됩니다.",
      ]}
      footerItems={[
        "계좌 잔액은 조회 시점 기준으로 표시되며, 그룹별 총잔액과 총자산도 같은 시점의 잔액 합계로 집계됩니다(REQ-INQR-002·003).",
        "계좌명은 별명이 등록된 경우 별명을 우선 표시합니다(REQ-ACCT-013).",
        "[이체]는 출금계좌로 등록된 입출금계좌에만 노출됩니다(REQ-INQR-005).",
        "계좌목록은 CSV 파일로 저장할 수 있으며, 파일에는 마스킹된 계좌번호가 사용됩니다(REQ-INQR-015).",
      ]}
      modals={
        <>
          <TextViewModal
            open={brailleOpen}
            onClose={() => setBrailleOpen(false)}
            title="전체계좌조회 점자보기"
            headers={exportHeaders}
            rows={exportRows}
          />

          <GridSearchModal
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            fields={SEARCH_FIELDS}
            onApply={(field, keyword) =>
              setSearch(keyword ? { field, keyword } : null)
            }
          />
        </>
      }
    >
      <GridToolbar
        totalCount={filteredAccounts.length}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        baseTimeLabel={formatDateTime(BASE_TIME)}
        onPrint={() => window.print()}
        onBrailleView={() => setBrailleOpen(true)}
        onSaveFile={() =>
          downloadCsv(`전체계좌조회_${TODAY}.csv`, exportHeaders, exportRows)
        }
        onSearch={() => setSearchOpen(true)}
      />

      {GROUP_ORDER.map((group) => {
        const rows = filteredAccounts.filter((a) => a.group === group)
        const groupTotal = rows.reduce((sum, a) => sum + a.balance, 0)
        return (
          <FormSection key={group} title={GROUP_LABELS[group]} className="mb-0">
            <DataGrid
              columns={buildColumns(group, handleInquire, handleTransfer)}
              rows={rows}
              rowKey={(r) => r.id}
              emptyMessage="보유한 계좌가 없습니다."
            />
            <SummaryRow
              className="mt-3"
              items={[
                {
                  label: `${GROUP_LABELS[group]} 총잔액`,
                  value: formatAmount(groupTotal),
                },
              ]}
            />
          </FormSection>
        )
      })}

      <div>
        <SummaryRow
          items={[
            {
              label: <span className="font-normal text-ink-muted">총자산</span>,
              value: (
                <span className="text-page font-bold">
                  {formatAmount(grandTotal)}
                </span>
              ),
              valueColor: "var(--color-primary)",
            },
          ]}
        />
        <p className="mt-1.5 text-right text-2xs text-ink-faint">
          대출 상품을 제공하지 않는 Phase 1 특성상 총자산은 수신 계좌 잔액
          합계로 산출됩니다.
        </p>
      </div>
    </QueryPageLayout>
  )
}

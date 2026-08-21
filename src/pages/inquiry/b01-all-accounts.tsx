import * as React from "react"
import { useNavigate } from "react-router"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { SummaryRow } from "@/shared/ui/summary-row"
import { GridToolbar, SavedConditionAlert } from "@/widgets/query"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
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
import { useAccountOverviewQuery } from "@/entities/account"
import { getToday } from "@/shared/config/clock"

type AccountGroupCode = "DEMAND_DEPOSIT" | "DEPOSIT_SAVINGS"

type AccountRow = {
  accountId: number
  groupCode: AccountGroupCode
  accountName: string
  accountNumber: string
  balance: number
  openedDate: string
  lastTransactionAt: string | null
  maturityDate: string | null
  transferEnabled: boolean
}

const GROUP_LABELS: Record<AccountGroupCode, string> = {
  DEMAND_DEPOSIT: "입출금계좌",
  DEPOSIT_SAVINGS: "예금·적금계좌",
}

/** REQ-CMN-020: 그리드가 보유한 컬럼 중 검색 대상 목록. */
const SEARCH_FIELDS: GridSearchField[] = [
  { key: "accountName", label: "계좌명" },
  { key: "accountNumber", label: "계좌번호" },
]

/** REQ-INQR-004: 계좌명, 계좌번호, 신규일, 최근거래일(예적금은 만기일), 잔액, 업무. */
const buildColumns = (
  group: AccountGroupCode,
  onInquire: (accountId: number) => void,
  onTransfer: (accountNumber: string) => void,
): DataGridColumn<AccountRow>[] => {
  return [
    {
      key: "accountName",
      header: "계좌명",
      width: 180,
      render: (r) => r.accountName,
    },
    {
      key: "accountNumber",
      header: "계좌번호",
      width: 160,
      render: (r) => <span>{formatAccountNo(r.accountNumber)}</span>,
    },
    {
      key: "openedDate",
      header: "신규일",
      align: "center",
      width: 120,
      render: (r) => <span>{formatDate(r.openedDate)}</span>,
    },
    {
      key: "lastActivityDate",
      header: group === "DEPOSIT_SAVINGS" ? "만기일" : "최근거래일",
      align: "center",
      width: 120,
      render: (r) => {
        const date =
          group === "DEPOSIT_SAVINGS" ? r.maturityDate : r.lastTransactionAt

        return <span>{date ? formatDate(date) : "-"}</span>
      },
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
            onClick={() => onInquire(r.accountId)}
          >
            조회
          </Button>

          {r.transferEnabled && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTransfer(r.accountNumber)}
            >
              이체
            </Button>
          )}
        </div>
      ),
    },
  ]
}

const GROUP_ORDER: AccountGroupCode[] = ["DEMAND_DEPOSIT", "DEPOSIT_SAVINGS"]

export const B01AllAccounts = () => {
  const TODAY = getToday()
  const navigate = useNavigate()

  const { data: overview, isLoading, isError } = useAccountOverviewQuery()
  const [pageSize, setPageSize] = React.useState<number | "all">("all")
  const [brailleOpen, setBrailleOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [search, setSearch] = React.useState<{
    field: string
    keyword: string
  } | null>(null)
  const downloadComplete = useSavedConditionAlert()

  const allAccounts = React.useMemo<AccountRow[]>(() => {
    if (!overview) return []

    return (overview.items ?? []).flatMap((group) => {
      const groupCode = group.groupCode

      if (groupCode !== "DEMAND_DEPOSIT" && groupCode !== "DEPOSIT_SAVINGS") {
        return []
      }

      return (group.accounts ?? []).flatMap((account) => {
        if (account.accountId == null) return []

        return [
          {
            accountId: account.accountId,
            groupCode,
            accountName: account.accountName ?? "",
            accountNumber: account.accountNumber ?? "",
            balance: account.balance ?? 0,
            openedDate: account.openedDate ?? "",
            lastTransactionAt: account.lastTransactionAt ?? null,
            maturityDate: account.maturityDate ?? null,
            transferEnabled: account.transferEnabled ?? false,
          },
        ]
      })
    })
  }, [overview])

  const handleInquire = (accountId: number) => {
    navigate(`/inquiry?accountId=${accountId}`)
  }

  const handleTransfer = (accountNumber: string) => {
    navigate(`/instant-transfer?from=${accountNumber}`)
  }

  const filteredAccounts = React.useMemo(() => {
    if (!search || !search.keyword) return allAccounts

    return allAccounts.filter((account) => {
      const value =
        search.field === "accountNumber"
          ? formatAccountNo(account.accountNumber)
          : account.accountName

      return value.includes(search.keyword)
    })
  }, [allAccounts, search])

  const grandTotal =
    search == null
      ? (overview?.totalAssets ?? 0)
      : filteredAccounts.reduce((sum, account) => sum + account.balance, 0)

  /** REQ-INQR-015: CSV 저장 시에만 계좌번호를 마스킹한다(화면 표시는 마스킹하지 않음, REQ-CMN-017). */
  const exportHeaders = [
    "상품군",
    "계좌명",
    "계좌번호",
    "신규일",
    "최근거래일/만기일",
    "잔액",
  ]
  const exportRows = filteredAccounts.map((account) => {
    const activityDate =
      account.groupCode === "DEPOSIT_SAVINGS"
        ? account.maturityDate
        : account.lastTransactionAt

    return [
      GROUP_LABELS[account.groupCode],
      account.accountName,
      maskAccountNo(account.accountNumber),
      formatDate(account.openedDate),
      activityDate ? formatDate(activityDate) : "-",
      formatAmount(account.balance),
    ]
  })
  if (isLoading) {
    return (
      <div className="p-6 text-base text-ink-muted">
        계좌 정보를 불러오는 중입니다.
      </div>
    )
  }

  if (isError || !overview) {
    return (
      <div className="p-6 text-base text-danger">
        계좌 정보를 불러오지 못했습니다.
      </div>
    )
  }
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
            onApply={(field, keyword) => {
              setSearch(keyword ? { field, keyword } : null)
              downloadComplete.clear()
            }}
          />
        </>
      }
    >
      <GridToolbar
        totalCount={filteredAccounts.length}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        baseTimeLabel={overview.asOf ? formatDateTime(overview.asOf) : "-"}
        onPrint={() => window.print()}
        onBrailleView={() => setBrailleOpen(true)}
        onSaveFile={() => {
          downloadCsv(`전체계좌조회_${TODAY}.csv`, exportHeaders, exportRows)
          downloadComplete.save()
        }}
        resultLabel="전체계좌조회"
        onSearch={() => setSearchOpen(true)}
      />

      {GROUP_ORDER.map((group) => {
        const apiGroup = overview.items?.find(
          (item) => item.groupCode === group,
        )

        const rows = filteredAccounts.filter(
          (account) => account.groupCode === group,
        )

        const groupLabel = apiGroup?.groupName ?? GROUP_LABELS[group]

        const groupTotal =
          search == null
            ? (apiGroup?.groupTotalBalance ?? 0)
            : rows.reduce((sum, account) => sum + account.balance, 0)

        return (
          <FormSection key={group} title={groupLabel} className="mb-0">
            <DataGrid
              columns={buildColumns(group, handleInquire, handleTransfer)}
              rows={rows}
              rowKey={(r) => String(r.accountId)}
              emptyMessage="보유한 계좌가 없습니다."
            />

            <SummaryRow
              className="mt-3"
              items={[
                {
                  label: `${groupLabel} 총잔액`,
                  value: formatAmount(groupTotal),
                },
              ]}
            />
          </FormSection>
        )
      })}

      <SavedConditionAlert
        open={downloadComplete.saved}
        message="파일이 저장되었습니다."
        className="mb-3"
      />

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

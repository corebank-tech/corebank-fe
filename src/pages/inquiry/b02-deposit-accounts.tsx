import * as React from "react"
import { toErrorMessage } from "@/shared/api/api-error"
import { useNavigate } from "react-router"
import { ChevronDown } from "lucide-react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { SummaryRow } from "@/shared/ui/summary-row"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
} from "@/shared/lib/format"
import { useAccountOverviewQuery } from "@/entities/account"
import { cn } from "@/shared/lib/utils"
import { useDisclosure } from "@/shared/lib/hooks/use-disclosure"

type DepositAccountRow = {
  accountId: number
  accountName: string
  accountNumber: string
  balance: number
  openedDate: string
  maturityDate: string | null
  status: "ACTIVE" | "SUSPENDED"
}

/** REQ-INQR-001·004: 예금/적금 계좌만 대상으로 한 전체계좌조회(B-01)의 부분 화면. */
export const B02DepositAccounts = () => {
  const navigate = useNavigate()
  const { open, toggle } = useDisclosure(true)
  const {
    data: overview,
    isLoading,
    isError,
    error,
  } = useAccountOverviewQuery()

  const depositGroup = overview?.items?.find(
    (group) => group.groupCode === "DEPOSIT_SAVINGS",
  )

  const rows = React.useMemo<DepositAccountRow[]>(() => {
    return (depositGroup?.accounts ?? []).flatMap((account) => {
      if (
        account.accountType !== "TIME_DEPOSIT" &&
        account.accountType !== "INSTALLMENT_SAVINGS"
      ) {
        return []
      }

      if (account.accountId == null) {
        return []
      }

      // BE는 CLOSED 계좌를 overview에서 제외하지만,
      // 화면 모델은 ACTIVE/SUSPENDED만 허용하도록 방어적으로 좁힌다.
      if (account.status !== "ACTIVE" && account.status !== "SUSPENDED") {
        return []
      }

      return [
        {
          accountId: account.accountId,
          accountName: account.accountName ?? "",
          accountNumber: account.accountNumber ?? "",
          balance: account.balance ?? 0,
          openedDate: account.openedDate ?? "",
          maturityDate: account.maturityDate ?? null,
          status: account.status,
        },
      ]
    })
  }, [depositGroup])

  const groupTotal = rows.reduce((sum, account) => sum + account.balance, 0)
  const columns: DataGridColumn<DepositAccountRow>[] = [
    {
      key: "accountName",
      header: "계좌명",
      width: 180,
      render: (r) => (
        <span className="font-bold text-ink">{r.accountName}</span>
      ),
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
      render: (r) => (
        <span className="text-ink-muted">{formatDate(r.openedDate)}</span>
      ),
    },
    {
      key: "maturityDate",
      header: "만기일",
      align: "center",
      width: 120,
      render: (r) => (
        <span className="text-ink-muted">
          {r.maturityDate ? formatDate(r.maturityDate) : "-"}
        </span>
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
      width: 100,
      render: (r) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/inquiry?accountId=${r.accountId}`)}
        >
          조회
        </Button>
      ),
    },
  ]

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
        {isError ? toErrorMessage(error) : "계좌 정보를 불러오지 못했습니다."}
      </div>
    )
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "예금·적금계좌만 표시됩니다. 입출금계좌는 전체계좌조회에서 확인할 수 있습니다.",
        "그룹을 접어도 총잔액 행은 계속 표시됩니다.",
        "계좌명은 별명이 있는 경우 별명을 우선 표시합니다.",
      ]}
      footerItems={[
        "계좌 잔액은 조회 시점 기준으로 표시되며 실제 처리 결과와 다를 수 있습니다(REQ-INQR-002).",
        "계좌명은 별명이 등록된 경우 별명을 우선 표시합니다(REQ-ACCT-013).",
        "[조회]는 해당 계좌의 거래내역조회로 이동합니다(REQ-INQR-005).",
        "상품군 그룹은 접기·펼치기가 가능하며 기본 상태는 펼침입니다(REQ-INQR-006).",
      ]}
    >
      <FormSection
        title="예금·적금계좌"
        className="mb-0"
        action={
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            className="inline-flex items-center gap-1 text-base font-bold text-ink-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {open ? "그룹 접기" : "그룹 펼치기"}
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden="true"
            />
          </button>
        }
      >
        {open && (
          <>
            <p className="mb-2 text-right text-2xs text-ink-muted">
              기준일시 : {overview.asOf ? formatDateTime(overview.asOf) : "-"}
            </p>
            <DataGrid
              columns={columns}
              rows={rows}
              rowKey={(r) => String(r.accountId)}
              rowClassName={(r) =>
                r.status === "SUSPENDED" ? "bg-surface opacity-60" : ""
              }
              emptyMessage="보유한 예금·적금 계좌가 없습니다."
            />
          </>
        )}

        <SummaryRow
          className="mt-3"
          items={[
            {
              label: (
                <span className="font-normal text-ink-muted">
                  예금·적금계좌 총잔액
                </span>
              ),
              value: (
                <span className="text-h2 font-bold">
                  {formatAmount(groupTotal)}
                </span>
              ),
              valueColor: "var(--color-primary)",
            },
          ]}
        />
        <p className="mt-1.5 text-2xs text-ink-faint">
          그룹 내 전체 계좌의 잔액 합계이며, 그룹을 접어도 이 행은
          유지됩니다(REQ-INQR-006).
        </p>
      </FormSection>
    </QueryPageLayout>
  )
}

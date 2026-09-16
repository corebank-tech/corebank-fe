import * as React from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { Alert } from "@/shared/ui/alert"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/shared/api/api-error"
import {
  getAccountOverviewQueryKey,
  toOrderAccounts,
  useAccountOverviewQuery,
  useResetAccountDisplayOrderMutation,
  useSaveAccountDisplayOrderMutation,
  type OrderAccount,
} from "@/entities/account"

/** REQ-ACCT-014: 계좌 표시순서 변경. [확인] 저장, [초기화] 시 개설일 오름차순 복원. */
export const B07AccountOrder = () => {
  const queryClient = useQueryClient()

  const accountOverviewQuery = useAccountOverviewQuery()
  const saveOrderMutation = useSaveAccountDisplayOrderMutation()
  const resetOrderMutation = useResetAccountDisplayOrderMutation()

  const serverOrder = React.useMemo(
    () =>
      toOrderAccounts(
        (accountOverviewQuery.data?.items ?? []).flatMap(
          (group) => group.accounts ?? [],
        ),
      ),
    [accountOverviewQuery.data],
  )

  const [draftOrder, setDraftOrder] = React.useState<OrderAccount[] | null>(
    null,
  )

  const order = draftOrder ?? serverOrder
  const isDirty = draftOrder !== null

  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const [actionError, setActionError] = React.useState<string | null>(null)

  const isMutating = saveOrderMutation.isPending || resetOrderMutation.isPending

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction

    if (target < 0 || target >= order.length) return

    setDraftOrder((prev) => {
      const next = [...(prev ?? serverOrder)]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })

    setSuccessMessage(null)
    setActionError(null)
  }

  const handleSave = async () => {
    setSuccessMessage(null)
    setActionError(null)

    try {
      await saveOrderMutation.mutateAsync({
        data: {
          accountIds: order.map((account) => account.accountId),
        },
      })

      await queryClient.invalidateQueries({
        queryKey: getAccountOverviewQueryKey(),
      })

      setDraftOrder(null)

      setSuccessMessage("계좌 표시순서가 저장되었습니다.")
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "계좌 표시순서 저장 중 오류가 발생했습니다.",
      )
    }
  }

  const handleReset = async () => {
    setSuccessMessage(null)
    setActionError(null)

    try {
      await resetOrderMutation.mutateAsync()

      await queryClient.invalidateQueries({
        queryKey: getAccountOverviewQueryKey(),
      })

      setDraftOrder(null)

      setSuccessMessage("계좌 표시순서가 초기화되었습니다.")
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "계좌 표시순서 초기화 중 오류가 발생했습니다.",
      )
    }
  }

  const columns: DataGridColumn<OrderAccount>[] = [
    {
      key: "seq",
      header: "순서",
      align: "center",
      width: 70,
      render: (_r, i) => <span>{i + 1}</span>,
    },
    { key: "accountName", header: "계좌명", width: 200 },
    {
      key: "accountNo",
      header: "계좌번호",
      width: 180,
      render: (r) => <span>{formatAccountNo(r.accountNo)}</span>,
    },
    {
      key: "openedDate",
      header: "신규일",
      align: "center",
      width: 120,
      render: (r) => <span>{formatDate(r.openedDate)}</span>,
    },
    {
      key: "balance",
      header: "잔액",
      align: "right",
      width: 140,
      render: (r) => formatAmount(r.balance),
    },
    {
      key: "actions",
      header: "업무",
      align: "center",
      width: 100,
      render: (_r, i) => (
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            aria-label="위로 이동"
            disabled={isMutating || i === 0}
            onClick={() => move(i, -1)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="아래로 이동"
            disabled={isMutating || i === order.length - 1}
            onClick={() => move(i, 1)}
          >
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <QueryPageLayout
      noticeItems={[
        "행의 [위로 이동]/[아래로 이동] 버튼으로 계좌 표시순서를 바꿀 수 있습니다.",
        "[확인]을 눌러야 변경한 순서가 저장됩니다.",
        "[초기화]를 누르면 기본 순서(개설일 오름차순)로 되돌아갑니다.",
      ]}
      footerItems={[
        "[확인]을 눌러야 변경한 표시순서가 저장되며, 저장 전에는 계좌조회 화면에 반영되지 않습니다(REQ-ACCT-014).",
        "[초기화]를 누르면 기본 순서인 개설일 오름차순으로 되돌아갑니다(REQ-ACCT-014).",
        "저장된 표시순서는 전체계좌조회 등 계좌 목록 화면의 계좌 나열 순서에 그대로 반영됩니다.",
      ]}
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      {actionError && <Alert variant="danger">{actionError}</Alert>}

      <FormSection title="계좌순서 변경" className="mb-0">
        <DataGrid
          columns={columns}
          rows={order}
          rowKey={(r) => String(r.accountId)}
          emptyMessage="보유한 계좌가 없습니다."
        />

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={() => void handleReset()}
            disabled={isMutating || order.length === 0}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={() => void handleSave()}
            disabled={isMutating || !isDirty || order.length === 0}
          >
            확인
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}

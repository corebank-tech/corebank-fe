import * as React from "react"
import { ArrowUp, ArrowDown } from "lucide-react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { Alert } from "@/shared/ui/alert"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"
import {
  MOCK_ORDER_ACCOUNTS,
  sortByOpenedDateAsc,
  type OrderAccount,
} from "@/entities/account"

/** REQ-ACCT-014: 계좌 표시순서 변경. [확인] 저장, [초기화] 시 개설일 오름차순 복원. */
export const B07AccountOrder = () => {
  const [order, setOrder] = React.useState(MOCK_ORDER_ACCOUNTS)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= order.length) return
    setOrder((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setSuccessMessage(null)
  }

  const handleSave = () => {
    setSuccessMessage("계좌 표시순서가 저장되었습니다.")
  }

  const handleReset = () => {
    setOrder(sortByOpenedDateAsc(MOCK_ORDER_ACCOUNTS))
    setSuccessMessage(null)
  }

  const columns: DataGridColumn<OrderAccount>[] = [
    {
      key: "seq",
      header: "순서",
      align: "center",
      width: 70,
      render: (_r, i) => <span className="font-tabular">{i + 1}</span>,
    },
    { key: "alias", header: "계좌명", width: 200 },
    {
      key: "accountNo",
      header: "계좌번호",
      width: 180,
      render: (r) => (
        <span className="font-tabular">{formatAccountNo(r.accountNo)}</span>
      ),
    },
    {
      key: "openedDate",
      header: "신규일",
      align: "center",
      width: 120,
      render: (r) => (
        <span className="font-tabular">{formatDate(r.openedDate)}</span>
      ),
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
            disabled={i === 0}
            onClick={() => move(i, -1)}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            aria-label="아래로 이동"
            disabled={i === order.length - 1}
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

      <FormSection title="계좌순서 변경" className="mb-0">
        <DataGrid
          columns={columns}
          rows={order}
          rowKey={(r) => r.id}
          emptyMessage="보유한 계좌가 없습니다."
        />

        <div className="mt-6 flex justify-center gap-2">
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={handleReset}
          >
            초기화
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={handleSave}
          >
            확인
          </Button>
        </div>
      </FormSection>
    </QueryPageLayout>
  )
}

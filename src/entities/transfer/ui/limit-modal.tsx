import * as React from "react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"
import { formatAmount } from "@/shared/lib/format"
import {
  TRANSFER_LIMIT_PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX,
} from "@/shared/config/policy"

type LimitModalProps = {
  open: boolean
  onClose: () => void
  /** 1일 이체한도 (KRW). */
  perDay: number
  /** 1회 이체한도 (KRW). */
  perTransfer: number
  /** 당일 이체잔여한도 (KRW). */
  dailyRemaining: number
  /** Opens the limit-change flow. */
  onChangeLimit: () => void
  title?: React.ReactNode
}

/**
 * D-05 이체한도 조회. sm modal with a three-row label/value table (daily limit,
 * per-transfer limit, remaining daily limit) and a limit-change action.
 */
export const LimitModal = ({
  open,
  onClose,
  perDay,
  perTransfer,
  dailyRemaining,
  onChangeLimit,
  title = "이체한도 조회",
}: LimitModalProps) => {
  const rows: { label: string; value: number }[] = [
    { label: "1일 이체한도", value: perDay },
    { label: "1회 이체한도", value: perTransfer },
    { label: "당일 이체잔여한도", value: dailyRemaining },
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="min-w-35"
          onClick={onChangeLimit}
        >
          이체한도 변경
        </Button>
      }
    >
      <table className="w-full border-collapse border-t-2 border-t-navy text-base">
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th
                scope="row"
                className="w-[45%] border-r border-b border-border bg-surface px-3 py-3 text-left font-bold whitespace-nowrap text-ink"
              >
                {row.label}
              </th>
              <td className="border-b border-border bg-surface-elevated px-3 py-3 text-right text-ink">
                {formatAmount(row.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-base leading-relaxed text-ink-muted">
        1회 최대 {formatAmount(TRANSFER_LIMIT_PER_TRANSFER_MAX)}, 1일 최대{" "}
        {formatAmount(TRANSFER_LIMIT_PER_DAY_MAX)}까지 변경할 수 있습니다. 변경
        후에는 다음 이체부터 적용됩니다.
      </p>
    </Modal>
  )
}

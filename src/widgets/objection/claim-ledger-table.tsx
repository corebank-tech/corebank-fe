import {
  CLAIM_VERIFICATION_LABEL,
  type ClaimCheck,
  type ClaimVerification,
} from "@/entities/payment-stop"
import { cn } from "@/shared/lib/utils"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"

const STATUS_TONE: Record<ClaimVerification, BadgeVariant> = {
  // 주장별 확인이 아니라 성공색을 쓰지 않는다
  CITED: "neutral",
  CONTRADICTED: "danger",
  UNVERIFIED: "neutral",
}

type Props = {
  checks: ClaimCheck[]
  /** 지금 강조한 거래 번호 */
  focusedTransaction: string | null
  /** 거래 번호를 누르면 원장 타임라인의 그 거래로 이동한다 */
  onSelectTransaction: (transactionNumber: string) => void
}

/**
 * 주장 대 원장 대조표(계획 PA-11). 주장마다 근거 제시, 모순, 미확인을 보이고 근거 거래를 누르면
 * 원장 타임라인의 그 거래로 이동한다. 상태를 가르는 규칙은 `verifyClaims` 주석에 있다.
 */
export const ClaimLedgerTable = ({
  checks,
  focusedTransaction,
  onSelectTransaction,
}: Props) => {
  const columns: DataGridColumn<ClaimCheck>[] = [
    {
      key: "claim",
      header: "주장",
      className: "whitespace-normal",
      render: (row) => (
        <span>
          <span className="font-bold text-ink">{row.claim.text}</span>
          {row.claim.quote && (
            <span className="mt-0.5 block text-xs text-ink-muted">
              {row.claim.quote}
            </span>
          )}
        </span>
      ),
    },
    {
      key: "source",
      header: "출처",
      align: "center",
      width: 64,
      render: (row) => (row.claim.source === "DOCUMENT" ? "서류" : "소명"),
    },
    {
      key: "status",
      header: "대조 결과",
      align: "center",
      width: 90,
      render: (row) => (
        <Badge variant={STATUS_TONE[row.status]}>
          {CLAIM_VERIFICATION_LABEL[row.status]}
        </Badge>
      ),
    },
    {
      key: "fact",
      header: "원장 기록",
      className: "whitespace-normal",
      render: (row) =>
        row.fact ? (
          <span className="text-danger">{row.fact}</span>
        ) : row.status === "CITED" ? (
          <span className="text-ink-muted">
            판정안 전체의 근거 거래입니다. 이 주장만의 근거는 아닙니다.
          </span>
        ) : (
          <span className="text-ink-faint">원장 근거 없음</span>
        ),
    },
    {
      key: "transactions",
      header: "근거 거래",
      width: 220,
      className: "whitespace-normal",
      render: (row) =>
        row.transactionNumbers.length === 0 ? (
          "-"
        ) : (
          <span className="flex flex-wrap gap-1">
            {row.transactionNumbers.map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => onSelectTransaction(number)}
                aria-label={`원장에서 거래 ${number} 보기`}
                className={cn(
                  "rounded-sm border px-1 font-mono text-2xs hover:border-primary hover:text-primary",
                  number === focusedTransaction
                    ? "border-primary bg-primary-tint text-primary"
                    : "border-border bg-surface-elevated text-ink",
                )}
              >
                {number.slice(-6)}
              </button>
            ))}
          </span>
        ),
    },
  ]

  return (
    <DataGrid
      columns={columns}
      rows={checks}
      rowKey={(row) => `${row.status}-${row.claim.text}`}
      emptyMessage="AI 분석이 끝나면 주장 대조가 표시됩니다."
    />
  )
}

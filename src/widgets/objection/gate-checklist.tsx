import { Lock, LockOpen } from "lucide-react"
import {
  DECISION_LABEL,
  DECISION_RESULTS,
  GATE_BRANCH_LABEL,
  GATE_RULE_LABEL,
  RULE_BASIS_LABEL,
  closedDecisionReason,
  labelOf,
  type GateRuleCheck,
  type ObjectionDetail,
} from "@/entities/payment-stop"
import { cn } from "@/shared/lib/utils"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"

type Props = {
  objection: Pick<
    ObjectionDetail,
    | "gate"
    | "clause"
    | "litigationPending"
    | "decision"
    | "objectionStatus"
    | "externalChecks"
  >
}

/**
 * 규칙이 성립했을 때의 색. 같은 "해당"이라도 사기 패턴은 해제를 막고 관계 인정은
 * 해제 근거가 되므로 색으로 방향을 가른다. 처음 보는 규칙은 중립색이다.
 */
const MATCHED_TONE: Record<string, BadgeVariant> = {
  FRAUD_PATTERN: "danger",
  RELATIONSHIP: "success",
  PARTIAL_REQUIREMENT: "success",
  SIMPLIFIED_EXCLUSION: "warning",
}

const columns: DataGridColumn<GateRuleCheck>[] = [
  {
    key: "rule",
    header: "점검 항목",
    width: 140,
    render: (row) => (
      <span className="font-bold text-ink">
        {labelOf(GATE_RULE_LABEL, row.rule)}
      </span>
    ),
  },
  {
    key: "description",
    header: "기준",
    // 기준과 점검 내용은 문장이라 줄을 바꾼다. 한 줄로 두면 표가 화면 밖으로 밀린다.
    className: "whitespace-normal",
    render: (row) => <span className="text-ink-muted">{row.description}</span>,
  },
  {
    key: "basis",
    header: "근거",
    align: "center",
    width: 150,
    render: (row) => labelOf(RULE_BASIS_LABEL, row.basis),
  },
  {
    key: "matched",
    header: "결과",
    align: "center",
    width: 90,
    render: (row) =>
      row.matched ? (
        <Badge variant={MATCHED_TONE[row.rule] ?? "primary"}>해당</Badge>
      ) : (
        <Badge variant="neutral">해당 없음</Badge>
      ),
  },
  {
    key: "detail",
    header: "점검 내용",
    className: "whitespace-normal",
    render: (row) => row.detail,
  },
  {
    key: "transactionNumbers",
    header: "사용 거래",
    align: "center",
    width: 90,
    render: (row) =>
      row.transactionNumbers.length > 0 ? (
        // 거래 번호가 길어 칸에 다 넣지 않는다. 마우스를 올리면 전체를 본다.
        <span title={row.transactionNumbers.join("\n")}>
          {row.transactionNumbers.length}건
        </span>
      ) : (
        "-"
      ),
  },
]

/**
 * 해제 요건 점검 체크리스트(계획 D21 ⑥). 해제 판정이 왜 열리거나 잠겼는지를 보인다.
 *
 * 화면은 서버 계산을 그대로 그린다. 서버가 원장으로 다시 계산한 결과이고, AI 판정안은
 * 이 계산에 쓰이지 않는다(D9, D10). 수치 기준은 내부 기준이라는 것을 함께 밝힌다(D33).
 */
export const GateChecklist = ({ objection }: Props) => {
  const { gate } = objection
  const isDecided = objection.decision != null

  return (
    <div className="flex flex-col gap-3">
      <p className="flex flex-wrap items-center gap-2 text-base text-ink">
        <span className="font-bold">점검 결과</span>
        <Badge variant="primary">
          {labelOf(GATE_BRANCH_LABEL, gate.branch)}
        </Badge>
        {gate.simplifiedExcluded && (
          <Badge variant="warning">간소화 대상 제외, 일반 심사</Badge>
        )}
        <span className="ml-auto text-2xs text-ink-faint">
          규칙 버전 {gate.rulesVersion || "-"}
        </span>
      </p>

      <DataGrid
        columns={columns}
        rows={gate.rules}
        rowKey={(row) => row.rule}
        emptyMessage="점검한 규칙이 없습니다."
      />

      <ul className="flex flex-col gap-1 text-2xs text-ink-muted">
        <li>
          판단 근거 아님: 다툼 거래 전부와 다툼 거래 중 가장 이른 시각 이후의
          거래는 정상 근거로 쓰지 않습니다.
        </li>
        <li>
          점검 수치는 법령이나 당국이 정한 값이 아니라 은행 내부 기준입니다.
        </li>
        <li>점검 결과는 이 화면을 연 시점의 원장으로 다시 계산한 값입니다.</li>
      </ul>

      <div
        className="grid grid-cols-3 gap-2"
        role="list"
        aria-label="판정별 해제 요건"
      >
        {DECISION_RESULTS.map((result) => {
          const reason = closedDecisionReason(objection, result)
          const isOpen = reason == null
          return (
            <div
              key={result}
              role="listitem"
              className={cn(
                "border px-3 py-2",
                isOpen
                  ? "border-success bg-surface-elevated"
                  : "border-border bg-surface",
              )}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 text-base font-bold",
                  isOpen ? "text-success" : "text-ink-faint",
                )}
              >
                {isOpen ? (
                  <LockOpen className="h-4 w-4" aria-hidden />
                ) : (
                  <Lock className="h-4 w-4" aria-hidden />
                )}
                {DECISION_LABEL[result]}
              </p>
              <p className="text-xs leading-snug text-ink-muted">
                {isOpen ? (isDecided ? "요건 충족" : "선택 가능") : reason}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

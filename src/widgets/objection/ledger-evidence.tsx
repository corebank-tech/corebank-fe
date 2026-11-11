import * as React from "react"
import {
  isDraftStale,
  useAgentRuns,
  useObjectionLedger,
  useReviewDraft,
  verifyClaims,
  type GateRuleCheck,
} from "@/entities/payment-stop"
import { ClaimLedgerTable } from "@/widgets/objection/claim-ledger-table"
import { LedgerTimelineChart } from "@/widgets/objection/ledger-timeline-chart"
import { Panel, PanelHeader } from "@/shared/ui/panel"

type Props = {
  objectionId: number
  rules: GateRuleCheck[]
}

/**
 * 주장 대 원장 대조표와 원장 타임라인(계획 PA-11). 대조표의 근거 거래를 누르면 타임라인의 그
 * 거래로 스크롤하고 강조한다. 타임라인의 거래를 눌러도 같은 거래가 강조된다.
 */
export const LedgerEvidence = ({ objectionId, rules }: Props) => {
  const { latestRun } = useAgentRuns(objectionId)
  const { draft } = useReviewDraft(objectionId, latestRun)
  const { entries, isPending, isError } = useObjectionLedger(objectionId)
  const [focused, setFocused] = React.useState<string | null>(null)

  const checks = draft ? verifyClaims(draft) : []

  const focus = (transactionNumber: string) => {
    setFocused(transactionNumber)
    document
      .getElementById(`ledger-tx-${transactionNumber}`)
      ?.scrollIntoView?.({ behavior: "smooth", block: "center" })
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel aria-label="주장 대 원장 대조표">
        <PanelHeader
          title="주장 대 원장 대조표"
          action={
            <span className="text-xs text-ink-muted">
              {draft
                ? `AI 판정안 기준, 실행 ${draft.runId}번${isDraftStale(draft, latestRun) ? " (이전 실행 결과)" : ""}`
                : "AI 판정안 기준"}
            </span>
          }
        />
        <div className="border-t border-border px-4 py-3">
          <ClaimLedgerTable
            checks={checks}
            focusedTransaction={focused}
            onSelectTransaction={focus}
          />
          <p className="mt-2 text-2xs text-ink-faint">
            모순은 AI가 원장과 어긋난다고 낸 주장, 근거 제시는 원문 인용이 있고
            판정안에 근거 거래가 있는 주장, 미확인은 원장 근거가 없는
            주장입니다. 근거 제시도 원장으로 확인했다는 뜻은 아닙니다. 해제
            근거가 아니라 심사 참고입니다.
          </p>
        </div>
      </Panel>
      <Panel aria-label="원장 타임라인">
        <PanelHeader title="원장 타임라인" />
        <div className="border-t border-border px-4 py-3">
          {isPending ? (
            <p className="py-6 text-center text-base text-ink-faint">
              원장을 불러오는 중
            </p>
          ) : isError ? (
            <p className="py-6 text-center text-base text-ink-faint">
              원장을 불러오지 못했습니다.
            </p>
          ) : (
            <LedgerTimelineChart
              entries={entries ?? []}
              rules={rules}
              focusedTransaction={focused}
              onSelectTransaction={setFocused}
            />
          )}
        </div>
      </Panel>
    </div>
  )
}

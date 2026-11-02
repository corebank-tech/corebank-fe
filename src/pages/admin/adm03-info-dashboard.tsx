import type * as React from "react"
import {
  useDepositBalanceMetric,
  useMonthlySubscriptionsMetric,
  type InfoMetric,
} from "@/entities/info-mart"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount } from "@/shared/lib/format"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Panel, PanelHeader } from "@/shared/ui/panel"

/**
 * ADM-03 정보계 대시보드(#146) — 숫자 3개와 각각의 기준시점. 차트는 없다(REQ-ADM-030).
 *
 * 두 API 의 기준시점은 따로 정해질 수 있어 지표마다 따로 적는다. 한 API 가 실패해도
 * 다른 API 의 숫자는 그대로 보이도록 상태도 지표별로 그린다.
 */

const NOT_LOADED_MESSAGE = "적재된 기준시점이 없어 값을 표시하지 않습니다."

/** 「120건(기준 2026-10-28 마감)」(REQ-ADM-031). 기준시점은 날짜뿐이라 시각을 붙이지 않는다. */
const withAsOf = (value: string, asOf: string) => `${value}(기준 ${asOf} 마감)`

const formatCount = (count: number) => `${count.toLocaleString("ko-KR")}건`

/** `2026-10` → `2026년 10월`. */
const formatMonth = (month: string) => {
  const [year, mon] = month.split("-")
  return `${year}년 ${Number(mon)}월`
}

type MetricQuery<T> = {
  metric: InfoMetric<T> | undefined
  isPending: boolean
  isError: boolean
  error: unknown
}

/** 지표 한 칸의 네 갈래 — 불러오는 중 · 실패 · 기준시점 없음 · 값. */
const metricValue = <T,>(
  query: MetricQuery<T>,
  render: (value: T, asOf: string) => React.ReactNode,
): React.ReactNode => {
  if (query.isError) {
    return (
      <span className="text-danger">
        {toErrorMessage(query.error) ?? "조회하지 못했습니다."}
      </span>
    )
  }
  if (query.isPending || !query.metric) return "불러오는 중…"
  if (query.metric.kind === "notLoaded") return NOT_LOADED_MESSAGE
  return render(query.metric.value, query.metric.asOf)
}

export const Adm03InfoDashboard = () => {
  const balance = useDepositBalanceMetric()
  const subscriptions = useMonthlySubscriptionsMetric()

  // 달은 서버가 고른 asOf 의 달이다. 오늘의 달과 다를 수 있어 라벨에 밝힌다.
  const monthLabel =
    !subscriptions.isError && subscriptions.metric?.kind === "loaded"
      ? formatMonth(subscriptions.metric.value.month)
      : "당월"

  return (
    <div className="flex flex-col gap-6">
      <Panel>
        <PanelHeader title="정보계 지표" />
        <LabelValueRow
          label="총 예수금 잔액"
          labelWidth={200}
          value={metricValue(balance, (value, asOf) =>
            withAsOf(formatAmount(value), asOf),
          )}
        />
        <LabelValueRow
          label={`${monthLabel} 신규 가입`}
          labelWidth={200}
          value={metricValue(subscriptions, (value, asOf) =>
            withAsOf(formatCount(value.subscribedCount), asOf),
          )}
        />
        <LabelValueRow
          label={`${monthLabel} 해지`}
          labelWidth={200}
          value={metricValue(subscriptions, (value, asOf) =>
            withAsOf(formatCount(value.closedCount), asOf),
          )}
        />
      </Panel>

      <NoticeBoxFooter
        items={[
          "기준시점은 정보계 적재가 빠짐없이 끝난 마지막 영업일입니다. 중간에 적재되지 않은 날이 있으면 그 전 영업일에 머뭅니다.",
          "가입·해지 건수는 기준시점이 속한 달의 건수입니다.",
          "정보계 집계 값이라 계정계의 실시간 잔액과 다를 수 있습니다.",
        ]}
      />
    </div>
  )
}

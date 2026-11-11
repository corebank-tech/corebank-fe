import { FlaskConical, ShieldCheck } from "lucide-react"
import { Alert } from "@/shared/ui/alert"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { FormSection } from "@/shared/ui/form-section"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { cn } from "@/shared/lib/utils"
import metrics from "@/pages/admin/adm05-objection-evaluation-metrics.json"
import large from "@/pages/admin/adm05-objection-evaluation-large-metrics.json"

/**
 * ADM-05 이의제기 AI 심사 지원 평가(계획 PA-18).
 *
 * 서버 API 없이 평가 결과의 집계 수치만 옮긴 정적 파일 두 개로 그린다. 시나리오 본문과 프롬프트는 옮기지 않는다.
 * - 핵심 수치와 구조 불변식: 큰 표본 100건(`adm05-objection-evaluation-large-metrics.json`, 원본
 *   `corebank-objection-agent` `docs/results/261111-large/metrics.json`). 정답은 실행 전에 정했고 팀원이 따로 검토했다.
 * - 모순 탐지 비교와 모델 비교: 11/5 개발 세트 24건(`adm05-objection-evaluation-metrics.json`, 원본
 *   `docs/results/261105/metrics.json`). Sonnet, Haiku, 키워드 규칙 분석기 비교는 이 세트에만 있다.
 */

type Ratio = { k: number; n: number; ci95: number[] }
type ModelMetrics = (typeof metrics.models)[number]

const percent = (ratio: Ratio) =>
  ratio.n === 0 ? "-" : `${Math.round((ratio.k / ratio.n) * 100)}%`

/** 원본이 소수 셋째 자리까지 준 구간이라 0.1% 단위로 적는다. 정수로 반올림하면 원본 문서와 갈린다. */
const ciPercent = (value: number) => `${Math.round(value * 1000) / 10}`

const ciText = (ratio: Ratio) =>
  ratio.n === 0
    ? ""
    : `95% CI ${ciPercent(ratio.ci95[0])}~${ciPercent(ratio.ci95[1])}%`

const ratioText = (ratio: Ratio) => `${ratio.k}/${ratio.n}`

const usd = (value: number, digits = 4) =>
  value === 0 ? "$0" : `$${value.toFixed(digits)}`

const EVALUATION_LABEL = `합성 시나리오 ${metrics.scenarioCount}건 평가(11/5)`
const LARGE_LABEL = `합성 시나리오 ${large.scenarioCount}건 평가(11/11)`

const opus = metrics.models.find((model) => model.id === "claude-opus")
const keyword = metrics.models.find((model) => model.id === "scripted")

const Kpi = ({
  label,
  value,
  detail,
  tone = "ink",
}: {
  label: string
  value: string
  detail: string
  tone?: "ink" | "success" | "primary"
}) => (
  <Panel className="px-4 py-3" aria-label={label}>
    <p className="text-xs font-bold text-ink-muted">{label}</p>
    <p
      className={cn(
        "text-h2 font-bold tabular-nums",
        tone === "success"
          ? "text-success"
          : tone === "primary"
            ? "text-primary"
            : "text-ink",
      )}
    >
      {value}
    </p>
    <p className="text-2xs text-ink-muted">{detail}</p>
  </Panel>
)

/** 두 방식의 건수 비교 막대. 같은 분모 위에 그린다. */
const CompareBars = ({
  title,
  rows,
}: {
  title: string
  rows: {
    label: string
    value: number
    total: number
    tone: "danger" | "success" | "neutral" | "primary"
  }[]
}) => {
  const width = 520
  const barHeight = 26
  const labelWidth = 150
  const valueWidth = 70
  const height = rows.length * (barHeight + 14) + 6
  const barSpace = width - labelWidth - valueWidth
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-w-[640px]"
      role="img"
      aria-label={title}
    >
      {rows.map((row, index) => {
        const y = 4 + index * (barHeight + 14)
        const filled = row.total === 0 ? 0 : (row.value / row.total) * barSpace
        return (
          <g key={row.label}>
            <text
              x={0}
              y={y + barHeight / 2 + 5}
              className="fill-ink text-[13px] font-bold"
            >
              {row.label}
            </text>
            <rect
              x={labelWidth}
              y={y}
              width={barSpace}
              height={barHeight}
              className="fill-surface"
            />
            <rect
              x={labelWidth}
              y={y}
              width={Math.max(filled, row.value > 0 ? 2 : 0)}
              height={barHeight}
              className={cn(
                row.tone === "danger" && "fill-danger",
                row.tone === "success" && "fill-success",
                row.tone === "primary" && "fill-primary",
                row.tone === "neutral" && "fill-ink-faint",
              )}
            />
            <text
              x={labelWidth + barSpace + 8}
              y={y + barHeight / 2 + 5}
              className="fill-ink text-[13px] tabular-nums"
            >
              {row.value}/{row.total}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

const modelColumns: DataGridColumn<ModelMetrics>[] = [
  {
    key: "label",
    header: "분석 방식",
    render: (row) => (
      <span className="font-bold text-ink">
        {row.label}
        <span className="ml-1 text-2xs font-normal text-ink-muted">
          {row.repetitions > 1 ? `건당 ${row.repetitions}회` : "1회"}
        </span>
      </span>
    ),
  },
  {
    key: "accuracy",
    header: "판정안 정확도",
    align: "right",
    width: 170,
    render: (row) => (
      <span className="tabular-nums">
        {percent(row.accuracy)} ({ratioText(row.accuracy)})
        <span className="block text-2xs text-ink-muted">
          {ciText(row.accuracy)}
        </span>
      </span>
    ),
  },
  {
    key: "contradiction",
    header: "규칙 통과 모순 탐지",
    align: "right",
    width: 140,
    render: (row) =>
      `${percent(row.contradictionRecallGatePasses)} (${ratioText(row.contradictionRecallGatePasses)})`,
  },
  {
    key: "falseAccept",
    header: "잘못된 수용 후보",
    align: "right",
    width: 130,
    render: (row) => `${ratioText(row.falseAccept)}`,
  },
  {
    key: "fraudMissed",
    header: "사기 건 놓침",
    align: "right",
    width: 110,
    render: (row) => `${ratioText(row.fraudMissed)}`,
  },
  {
    key: "cost",
    header: "건당 비용",
    align: "right",
    width: 100,
    render: (row) => usd(row.costUsdMean),
  },
  {
    key: "costPerCorrect",
    header: "정답 1건당 비용",
    align: "right",
    width: 120,
    render: (row) => usd(row.costPerCorrectUsd),
  },
  {
    key: "seconds",
    header: "분석 시간",
    align: "right",
    width: 120,
    render: (row) => (
      <span className="tabular-nums">
        {row.secondsMedian}초
        <span className="block text-2xs text-ink-muted">
          p90 {row.secondsP90}초
        </span>
      </span>
    ),
  },
]

export const Adm05ObjectionEvaluation = () => {
  const { structural } = large
  return (
    <div className="flex flex-col gap-6">
      <Alert variant="warning" title={LARGE_LABEL}>
        실제 사건이 아니라 합성 시나리오로 잰 값입니다. 정답은 실행 전에 정했고
        팀원 {large.labelReview.reviewers}명이 따로 검토해{" "}
        {large.labelReview.agreed}건 모두 같았습니다. {large.model}로 같은 건을{" "}
        {large.repetitions}회 돌렸고 같은 건 반복은 독립 표본이 아닙니다.
      </Alert>

      <FormSection title="핵심 수치" className="mb-0">
        <div className="grid grid-cols-3 gap-3">
          <Kpi
            label="판정 정확도"
            value={`${Math.round((large.accuracy.k / large.accuracy.n) * 1000) / 10}%`}
            detail={`${ratioText(large.accuracy)}, ${ciText(large.accuracy)}, 보정 규칙 적용 전 ${percent(large.modelOnlyAccuracy)}`}
            tone="primary"
          />
          <Kpi
            label="해제 시도에 해제 의견"
            value={`${large.falseRelease.k}건`}
            detail={`정답이 해제가 아닌 ${large.falseRelease.n}회 중, 사기 패턴 놓침 ${ratioText(large.fraudMissed)}`}
            tone="success"
          />
          <Kpi
            label="규칙 통과 모순 탐지"
            value={ratioText(large.contradictionRecallGatePasses)}
            detail={`모순 없는 건에 모순을 단 실행 ${ratioText(large.contradictionFalseAlarm)}`}
            tone="success"
          />
          <Kpi
            label="공격 문장에 판정 변경"
            value={`${large.injectionFlipped.k}건`}
            detail={`소명 속 지시문 공격 ${large.injectionFlipped.n}회, 근거 날조 ${ratioText(large.unseenEvidenceRuns)}`}
          />
          <Kpi
            label="분석 시간"
            value={`${Math.round(large.secondsMedian)}초`}
            detail={`중앙값, p90 ${Math.round(large.secondsP90)}초`}
          />
          <Kpi
            label="건당 비용"
            value={usd(large.costUsdMean, 3)}
            detail={`${large.model}, 실패 ${large.failedRuns}/${large.runs}회`}
          />
        </div>
      </FormSection>

      <FormSection title="구조 불변식" className="mb-0">
        <Panel aria-label="사기 계좌 해제 비교">
          <PanelHeader
            title={
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
                사기 계좌 해제 {structural.fraudReleasableByGate}/
                {structural.fraudCases} 대 서류 기준{" "}
                {structural.fraudReleasableByDocumentsOnly}/
                {structural.fraudCases}
              </span>
            }
            action={
              <span className="text-xs text-ink-muted">AI 판단과 무관</span>
            }
          />
          <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
            <CompareBars
              title="사기 계좌 중 해제가 열린 건수"
              rows={[
                {
                  label: "해제 요건 점검",
                  value: structural.fraudReleasableByGate,
                  total: structural.fraudCases,
                  tone: "success",
                },
                {
                  label: "서류만 보고 수용",
                  value: structural.fraudReleasableByDocumentsOnly,
                  total: structural.fraudCases,
                  tone: "danger",
                },
              ]}
            />
            <p className="text-xs text-ink-muted">
              사기 패턴이 성립하면 서버 규칙이 수용과 일부 지급정지를 닫습니다.
              서류만 보고 수용하는 방식이면 사기 계좌 {structural.fraudCases}
              건이 모두 해제됩니다. 규칙은 수용을 열지만 소명이 원장과 어긋나는
              건이 {structural.gateOpensAcceptButStatementContradicts}건 있고,
              이것은 규칙만으로 볼 수 없어 AI가 찾습니다.
            </p>
          </div>
        </Panel>
      </FormSection>

      {opus && keyword && (
        <FormSection title="모순 탐지 비교 (11/5, 24건)" className="mb-0">
          <Panel aria-label="모순 탐지 비교">
            <div className="px-4 py-3">
              <CompareBars
                title="규칙이 수용을 여는 모순 건 탐지"
                rows={[
                  {
                    label: "AI (Opus 5.5)",
                    value: opus.contradictionRecallGatePasses.k,
                    total: opus.contradictionRecallGatePasses.n,
                    tone: "primary",
                  },
                  {
                    label: "키워드 규칙 분석기",
                    value: keyword.contradictionRecallGatePasses.k,
                    total: keyword.contradictionRecallGatePasses.n,
                    tone: "neutral",
                  },
                ]}
              />
            </div>
          </Panel>
        </FormSection>
      )}

      <FormSection title="모델 비교 (11/5, 24건)" className="mb-0">
        <p className="mb-2 flex items-center gap-1.5 text-xs text-ink-muted">
          <FlaskConical className="h-3.5 w-3.5" aria-hidden />
          {EVALUATION_LABEL}. 비용은 토큰 사용량과 공개 단가로 셈했습니다.
        </p>
        <DataGrid
          columns={modelColumns}
          rows={metrics.models}
          rowKey={(row) => row.id}
          emptyMessage="평가 결과가 없습니다."
        />
      </FormSection>

      <NoticeBoxFooter
        items={[
          "수치는 합성 시나리오 평가 결과를 옮긴 정적 값이며 실제 사건 정확도가 아닙니다.",
          "판정 정확도는 AI 판정안 뒤에 보정 규칙(소명과 원장이 어긋나거나 해제 요건 점검이 근거를 인정하지 않으면 판단 보류)을 적용한 값입니다. 최종 판정은 담당자가 합니다.",
          "규칙 기준값(송금인 3명, 60분 안 80% 출금, 관계 거래 3회)은 은행 내부 기준을 가정한 값입니다.",
          "담당자 처리시간 단축은 사람 교차 평가로 따로 잽니다.",
        ]}
      />
    </div>
  )
}

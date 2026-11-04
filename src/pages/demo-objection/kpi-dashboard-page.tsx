import { useState, type ReactNode } from "react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/ui/badge"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { TriangleAlert } from "lucide-react"
import { DemoShell } from "@/pages/demo-objection/demo-shell"
import { FormSection } from "@/shared/ui/form-section"

/**
 * 성과 대시보드 — 평가(PA-17) 결과를 보여 줄 화면의 틀.
 * 지금 수치는 전부 가상이다. 평가가 끝나면 이 파일의 상수만 실측값으로 바꾼다.
 */

const INVARIANTS = [
  "서류만으로 수용",
  "인젝션으로 바뀐 판정",
  "승인 없는 해제",
  "다툼 거래를 근거로 인정",
  "이력 계좌 간소화",
  "기한 경보 누락",
]

const TIME_BY_TYPE = [
  { type: "통장묶기 피해자", without: 14, with: 6 },
  { type: "판매자 주장", without: 24, with: 9 },
  { type: "대포통장", without: 17, with: 5 },
  { type: "관계 정상", without: 12, with: 5 },
]

const STAFFING = [
  { inflow: 20, without: 3, with: 2 },
  { inflow: 40, without: 6, with: 3 },
  { inflow: 60, without: 9, with: 4 },
  { inflow: 80, without: 12, with: 6 },
]

const LABELS = ["수용", "일부 지급정지", "불수용", "판단 불가"]
/** 행: 정답 갈래, 열: Agent 판정안 갈래 */
const CONFUSION = [
  [34, 2, 0, 4],
  [1, 27, 0, 2],
  [0, 0, 38, 2],
  [2, 1, 3, 44],
]

const NEUTRAL = "var(--color-ink-faint)"
const BLUE = "var(--demo-series-1)"

export const KpiDashboardPage = () => (
  <DemoShell title="심사 성과">
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 border border-warning bg-warning-tint px-4 py-2.5 text-base font-bold text-warning">
        <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
        예시 데이터. 평가 후 실측값으로 교체
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Tile
          label="설계 불변식 위반"
          value="0 / 6종"
          sub="평가 시나리오 160건 전부에서 0건이어야 통과"
          tone="success"
        >
          <div className="mt-2 flex flex-wrap gap-1">
            {INVARIANTS.map((v) => (
              <Badge key={v} variant="success">
                ✓ {v}
              </Badge>
            ))}
          </div>
        </Tile>
        <Tile label="담당자 건당 처리시간" value="18분 → 7분" sub="−61%" />
        <Tile
          label="5영업일 기한 준수에 필요한 인원"
          value="6명 → 3명"
          sub="하루 유입 40건 가정"
        />
        <Tile
          label="위조 서류 사건 수용"
          value="12 → 0건"
          sub="위조 서류 20건 기준"
          tone="success"
        />
      </div>

      <div className="grid grid-cols-12 gap-3">
        <Panel className="col-span-7">
          <PanelHeader
            title="유형별 건당 처리시간 (분)"
            action={<SeriesLegend />}
          />
          <div className="px-4 pb-4">
            <TimeBars />
          </div>
        </Panel>
        <Panel className="col-span-5">
          <PanelHeader
            title="하루 유입량별 필요 인원 (명)"
            action={<SeriesLegend />}
          />
          <div className="px-4 pb-4">
            <StaffingLines />
          </div>
        </Panel>

        <Panel className="col-span-5">
          <PanelHeader
            title="AI 판정안 정확도"
            action={
              <span className="text-2xs text-ink-faint">
                AI 판정안 단독 정확도 89.4%
              </span>
            }
          />
          <div className="px-4 pb-4">
            <ConfusionHeatmap />
          </div>
        </Panel>
        <Panel className="col-span-7">
          <PanelHeader title="정상 고객 비용과 운영 비용" />
          <div className="grid grid-cols-3 gap-3 px-4 pb-4">
            <Tile
              small
              label="정상 사건 판단 불가 비율"
              value="18%"
              sub="95% 신뢰구간 11~27%"
            />
            <Tile
              small
              label="정상 사건 불수용 비율"
              value="4%"
              sub="95% 신뢰구간 1~10%"
            />
            <Tile
              small
              label="판정까지 평균 대기"
              value="3.1영업일"
              sub="통보 기한 5영업일"
            />
            <Tile small label="LLM 비용" value="$0.05 / 건" sub="예산 $30" />
            <Tile
              small
              label="AI 판정안과 요건 점검 불일치"
              value="9건"
              sub="불일치 건은 화면에 경고로 표시"
            />
            <Tile
              small
              label="현재 평균 처리 기간"
              value="16.1~18.6일"
              sub="2026년 7월, 주말 포함, 보도"
              real
            />
          </div>
        </Panel>
      </div>

      <FormSection title="같은 위조 계약서, 두 가지 심사 방식" className="mb-0">
        <div className="grid grid-cols-2 gap-4">
          <CompareColumn
            title="서류 대조 방식"
            sub="서류 내용과 입금 내역을 맞춰 본다"
            rows={[
              ["계약 금액 100만 원", "입금액 100만 원과 일치"],
              ["거래일 10/30", "입금일 10/30과 일치"],
              ["매수인", "송금인과 일치"],
            ]}
            verdict="수용, 위조 서류 통과"
            bad
          />
          <CompareColumn
            title="근거 기반 해제 요건 점검"
            sub="은행 거래 기록과 외부 조회만 근거로 쓴다"
            rows={[
              ["계약 금액, 거래일", "다툼 입금 자체, 판단 제외"],
              ["6개월 전부터 거래", "과거 거래 0건, 불일치"],
              ["사업자로 판매", "미등록 번호, 불일치"],
            ]}
            verdict="수용 불가, 위조 서류 차단"
          />
        </div>
      </FormSection>
    </div>
  </DemoShell>
)

const CompareColumn = ({
  title,
  sub,
  rows,
  verdict,
  bad,
}: {
  title: string
  sub: string
  rows: [string, string][]
  verdict: string
  bad?: boolean
}) => (
  <Panel>
    <div className="border-b border-border px-4 py-3">
      <p className="text-lg font-bold text-ink">{title}</p>
      <p className="text-xs text-ink-faint">{sub}</p>
    </div>
    <table className="w-full text-base">
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-border">
            <th className="w-[200px] bg-surface px-4 py-2.5 text-left font-bold text-ink">
              {k}
            </th>
            <td className="px-4 py-2.5 text-ink-muted">{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <p
      className={cn(
        "px-4 py-3 text-lg font-bold text-white",
        bad ? "bg-danger" : "bg-success",
      )}
    >
      {verdict}
    </p>
  </Panel>
)

const Tile = ({
  label,
  value,
  sub,
  tone,
  small,
  real,
  children,
}: {
  label: string
  value: string
  sub: string
  tone?: "success"
  small?: boolean
  real?: boolean
  children?: ReactNode
}) => (
  <div
    className={cn(
      "border border-border bg-surface-elevated",
      small ? "p-3" : "p-4",
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold text-ink-muted">{label}</p>
      <Badge variant={real ? "primary" : "warning"}>
        {real ? "실제 자료" : "예시"}
      </Badge>
    </div>
    <p
      className={cn(
        "mt-1 font-bold",
        small ? "text-h2" : "text-page",
        tone === "success" ? "text-success" : "text-ink",
      )}
    >
      {value}
    </p>
    <p className="text-2xs text-ink-faint">{sub}</p>
    {children}
  </div>
)

const SeriesLegend = () => (
  <div className="flex items-center gap-3 text-xs text-ink-muted">
    <span className="flex items-center gap-1.5">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ background: NEUTRAL }}
      />
      AI 없이
    </span>
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: BLUE }} />
      AI 판정안 참고
    </span>
  </div>
)

/** 가로 막대 — 한 축, 막대 두께 ≤ 24px, 끝값 직접 라벨 */
const TimeBars = () => {
  const [hover, setHover] = useState<string>()
  const W = 640
  const LABEL_W = 110
  const max = 30
  const x = (v: number) => (v / max) * (W - LABEL_W - 60)
  const rowH = 58
  const H = TIME_BY_TYPE.length * rowH + 24
  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="유형별 건당 처리시간"
      >
        {[0, 10, 20, 30].map((t) => (
          <g key={t}>
            <line
              x1={LABEL_W + x(t)}
              y1={0}
              x2={LABEL_W + x(t)}
              y2={H - 20}
              stroke="var(--color-border)"
            />
            <text
              x={LABEL_W + x(t)}
              y={H - 4}
              textAnchor="middle"
              className="fill-ink-faint text-[10px] tabular-nums"
            >
              {t}분
            </text>
          </g>
        ))}
        {TIME_BY_TYPE.map((d, i) => {
          const y = i * rowH + 8
          return (
            <g
              key={d.type}
              onMouseEnter={() => setHover(d.type)}
              onMouseLeave={() => setHover(undefined)}
            >
              <rect
                x={0}
                y={y - 4}
                width={W}
                height={rowH - 4}
                fill={
                  hover === d.type ? "var(--color-surface-2)" : "transparent"
                }
              />
              <text x={0} y={y + 24} className="fill-ink text-[12px] font-bold">
                {d.type}
              </text>
              <rect
                x={LABEL_W}
                y={y}
                width={x(d.without)}
                height={20}
                rx="4"
                fill={NEUTRAL}
              />
              <text
                x={LABEL_W + x(d.without) + 6}
                y={y + 14}
                className="fill-ink-muted text-[11px] tabular-nums"
              >
                {d.without}분
              </text>
              <rect
                x={LABEL_W}
                y={y + 22}
                width={x(d.with)}
                height={20}
                rx="4"
                fill={BLUE}
              />
              <text
                x={LABEL_W + x(d.with) + 6}
                y={y + 36}
                className="fill-ink text-[11px] font-bold tabular-nums"
              >
                {d.with}분 (−{Math.round((1 - d.with / d.without) * 100)}%)
              </text>
            </g>
          )
        })}
      </svg>
      <TableView
        head={["유형", "AI 없이(분)", "판정안 참고(분)"]}
        rows={TIME_BY_TYPE.map((d) => [d.type, d.without, d.with])}
      />
    </>
  )
}

/** 선 — 2px, 끝점 라벨 */
const StaffingLines = () => {
  const W = 440
  const H = 230
  const L = 30
  const B = H - 24
  const x = (v: number) => L + ((v - 20) / 60) * (W - L - 70)
  const y = (v: number) => B - (v / 12) * (B - 12)
  const path = (k: "without" | "with") =>
    STAFFING.map(
      (d, i) => `${i === 0 ? "M" : "L"} ${x(d.inflow)} ${y(d[k])}`,
    ).join(" ")
  const lastD = STAFFING[STAFFING.length - 1]
  return (
    <>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="하루 유입량별 필요 인원"
      >
        {[0, 4, 8, 12].map((t) => (
          <g key={t}>
            <line
              x1={L}
              y1={y(t)}
              x2={W - 70}
              y2={y(t)}
              stroke="var(--color-border)"
            />
            <text
              x={L - 6}
              y={y(t) + 3}
              textAnchor="end"
              className="fill-ink-faint text-[10px] tabular-nums"
            >
              {t}
            </text>
          </g>
        ))}
        {STAFFING.map((d) => (
          <text
            key={d.inflow}
            x={x(d.inflow)}
            y={H - 6}
            textAnchor="middle"
            className="fill-ink-faint text-[10px] tabular-nums"
          >
            {d.inflow}건
          </text>
        ))}
        {(["without", "with"] as const).map((k) => (
          <g key={k}>
            <path
              d={path(k)}
              fill="none"
              stroke={k === "with" ? BLUE : NEUTRAL}
              strokeWidth="2"
              strokeLinejoin="round"
            />
            {STAFFING.map((d) => (
              <circle
                key={d.inflow}
                cx={x(d.inflow)}
                cy={y(d[k])}
                r="4"
                fill={k === "with" ? BLUE : NEUTRAL}
                stroke="var(--color-surface-elevated)"
                strokeWidth="2"
              >
                <title>{`유입 ${d.inflow}건, ${k === "with" ? "판정안 참고" : "AI 없이"} ${d[k]}명`}</title>
              </circle>
            ))}
            <text
              x={x(lastD.inflow) + 8}
              y={y(lastD[k]) + 4}
              className={cn(
                "text-[11px] tabular-nums",
                k === "with" ? "fill-ink font-bold" : "fill-ink-muted",
              )}
            >
              {lastD[k]}명
            </text>
          </g>
        ))}
      </svg>
      <TableView
        head={["하루 유입", "AI 없이(명)", "판정안 참고(명)"]}
        rows={STAFFING.map((d) => [`${d.inflow}건`, d.without, d.with])}
      />
    </>
  )
}

/** 순차 단색(파랑) 히트맵. 칸 안 숫자는 칸 밝기에 따라 흰색/검정 */
const RAMP = [
  "#e7f0fd",
  "#cde2fb",
  "#9ec5f4",
  "#6da7ec",
  "#3987e5",
  "#256abf",
  "#184f95",
  "#0d366b",
]
const ConfusionHeatmap = () => {
  const max = Math.max(...CONFUSION.flat())
  const cell = (v: number) =>
    RAMP[Math.min(RAMP.length - 1, Math.floor((v / max) * (RAMP.length - 1)))]
  const dark = (v: number) => v / max > 0.45
  return (
    <>
      <div className="grid grid-cols-[84px_repeat(4,1fr)] gap-0.5 text-[11px]">
        <span className="text-[10px] text-ink-faint">정답 ↓ / 판정안 →</span>
        {LABELS.map((l) => (
          <span key={l} className="text-center font-bold text-ink-muted">
            {l}
          </span>
        ))}
        {CONFUSION.map((row, r) => (
          <div key={LABELS[r]} className="contents">
            <span className="flex items-center font-bold text-ink-muted">
              {LABELS[r]}
            </span>
            {row.map((v, c) => (
              <span
                key={c}
                title={`정답 ${LABELS[r]}, 판정안 ${LABELS[c]}: ${v}건`}
                className={cn(
                  "flex h-11 items-center justify-center rounded-sm font-bold tabular-nums",
                  r === c && "ring-2 ring-ink ring-offset-1",
                )}
                style={{
                  background: cell(v),
                  color: dark(v) ? "#ffffff" : "#17202e",
                }}
              >
                {v}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-2xs text-ink-faint">테두리 칸이 정답</p>
    </>
  )
}

const TableView = ({
  head,
  rows,
}: {
  head: string[]
  rows: (string | number)[][]
}) => (
  <details className="mt-2 text-xs">
    <summary className="cursor-pointer text-ink-faint">표로 보기</summary>
    <table className="mt-1 w-full text-left">
      <thead>
        <tr className="border-b border-border text-ink-muted">
          {head.map((h) => (
            <th key={h} className="py-1 font-bold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={String(r[0])} className="border-b border-border text-ink">
            {r.map((v, i) => (
              <td key={i} className="py-1 tabular-nums">
                {v}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </details>
)

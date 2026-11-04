import { useState, type ReactNode } from "react"
import { SERIES } from "@/pages/demo-objection/chart-colors"
import {
  won,
  type EvidenceChartSpec,
  type LedgerTx,
  type Scenario,
} from "@/pages/demo-objection/model"

/**
 * 판정을 가르는 사실 하나만 보여 주는 그래프. 시나리오마다 종류가 다르다.
 * - 주장과 기록: 고객이 주장한 거래 기간과 실제 거래를 위아래로 맞댄다.
 * - 반복 거래: 생계 거래가 매달 반복되는지, 판단에서 뺀 입금은 무엇인지.
 * - 잔액 변화: 들어온 돈이 얼마 만에 빠져나갔는지.
 * 색은 검증된 범주 3색만 쓰고, 행 이름과 직접 라벨로 뜻을 붙인다(색만으로 구분하지 않음).
 */

const W = 1100
const LW = 220
const RIGHT = W - 24

const ts = (iso: string) => new Date(iso).getTime()

const short = (n: number) =>
  n >= 10_000 ? `${(n / 10_000).toLocaleString("ko-KR")}만` : `${n}원`

const monthTicks = (from: number, to: number) => {
  const d = new Date(from)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  const out: { t: number; label: string }[] = []
  while (d.getTime() <= to) {
    if (d.getTime() >= from)
      out.push({ t: d.getTime(), label: `${d.getMonth() + 1}월` })
    d.setMonth(d.getMonth() + 1)
  }
  return out
}

const minuteTicks = (from: number, to: number, step: number) => {
  const out: { t: number; label: string }[] = []
  for (let t = from; t <= to; t += step * 60_000) {
    const d = new Date(t)
    out.push({
      t,
      label: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
    })
  }
  return out
}

/* ---------- 공통 틀 ---------- */

type Hover = (tx?: LedgerTx) => void

const Mark = ({
  tx,
  onHover,
  children,
}: {
  tx: LedgerTx
  onHover: Hover
  children: ReactNode
}) => (
  <g
    onMouseEnter={() => onHover(tx)}
    onMouseLeave={() => onHover(undefined)}
    className="cursor-default"
  >
    {children}
  </g>
)

const RowLabel = ({
  y,
  title,
  sub,
}: {
  y: number
  title: string
  sub: string
}) => (
  <>
    <text x={0} y={y - 4} className="fill-ink text-[15px] font-bold">
      {title}
    </text>
    <text x={0} y={y + 16} className="fill-ink-muted text-[13px]">
      {sub}
    </text>
  </>
)

const Grid = ({
  ticks,
  x,
  top,
  bottom,
}: {
  ticks: { t: number; label: string }[]
  x: (t: number) => number
  top: number
  bottom: number
}) => (
  <>
    {ticks.map((tk) => (
      <g key={tk.t}>
        <line
          x1={x(tk.t)}
          y1={top}
          x2={x(tk.t)}
          y2={bottom}
          stroke="var(--color-border)"
          strokeDasharray="3 4"
        />
        <text
          x={x(tk.t)}
          y={bottom + 18}
          textAnchor="middle"
          className="fill-ink-faint text-[13px] tabular-nums"
        >
          {tk.label}
        </text>
      </g>
    ))}
  </>
)

export const EvidenceChart = ({ scenario }: { scenario: Scenario }) => {
  const [hover, setHover] = useState<LedgerTx>()
  const spec = scenario.chart
  return (
    <div className="demo-pop relative">
      <p className="mb-2 text-lg font-bold text-ink">{spec.takeaway}</p>
      {spec.kind === "CLAIM_VS_RECORD" && (
        <ClaimVsRecord scenario={scenario} spec={spec} onHover={setHover} />
      )}
      {spec.kind === "RECURRING" && (
        <Recurring scenario={scenario} spec={spec} onHover={setHover} />
      )}
      {spec.kind === "BALANCE" && (
        <Balance scenario={scenario} spec={spec} onHover={setHover} />
      )}
      {hover && (
        <div className="text-sm pointer-events-none absolute top-0 right-0 border border-border bg-surface-elevated px-3 py-2 shadow-pop">
          <p className="font-bold text-ink">
            {hover.dir === "IN" ? "입금" : "출금"} {won(hover.amount)}
          </p>
          <p className="text-ink-muted">
            {hover.at.replace("T", " ")}&nbsp;&nbsp;{hover.counterparty}
            {hover.note ? `, ${hover.note}` : ""}
          </p>
          {(hover.kind === "DISPUTED" || hover.afterDispute) && (
            <p className="text-ink-faint">판단 제외</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- 주장과 기록 ---------- */

const ClaimVsRecord = ({
  scenario,
  spec,
  onHover,
}: {
  scenario: Scenario
  spec: Extract<EvidenceChartSpec, { kind: "CLAIM_VS_RECORD" }>
  onHover: Hover
}) => {
  const from = ts(scenario.ledgerWindow.from)
  const to = ts(scenario.ledgerWindow.to)
  const x = (t: number) => LW + ((t - from) / (to - from)) * (RIGHT - LW)
  const H = 236
  const Y1 = 44
  const Y2 = 112
  const Y3 = 176
  const withCp = scenario.ledger.filter(
    (t) => t.counterparty === spec.counterparty,
  )
  const others = scenario.ledger.filter(
    (t) => t.counterparty !== spec.counterparty,
  )
  const cFrom = x(Math.max(from, ts(spec.claimFrom)))
  const cTo = x(ts(spec.claimTo))
  const emptyMid = (cFrom + cTo) / 2

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <title>{spec.takeaway}</title>
      <Grid ticks={monthTicks(from, to)} x={x} top={14} bottom={H - 30} />

      {/* 고객 주장 */}
      <RowLabel y={Y1} title="고객 주장" sub={spec.claimLabel} />
      <rect
        x={cFrom}
        y={Y1 - 15}
        width={cTo - cFrom}
        height={30}
        rx={4}
        fill={SERIES.blue}
        fillOpacity={0.14}
        stroke={SERIES.blue}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <text
        x={(cFrom + cTo) / 2}
        y={Y1 + 5}
        textAnchor="middle"
        className="fill-ink text-[15px] font-bold"
      >
        주장 기간 {spec.claimLabel}
      </text>

      {/* 실제 기록 */}
      <RowLabel
        y={Y2}
        title="이 계좌 기록"
        sub={`${spec.counterparty}와의 거래, 다른 은행은 범위 밖`}
      />
      <line
        x1={LW}
        y1={Y2}
        x2={RIGHT}
        y2={Y2}
        stroke="var(--color-border-strong)"
      />
      <rect
        x={emptyMid - 62}
        y={Y2 - 16}
        width={124}
        height={32}
        fill="var(--color-surface-elevated)"
      />
      <text
        x={emptyMid}
        y={Y2 + 7}
        textAnchor="middle"
        className="fill-ink text-[18px] font-bold"
      >
        거래 0건
      </text>
      {withCp.map((tx) => {
        const cx = x(ts(tx.at))
        return (
          <Mark key={tx.id} tx={tx} onHover={onHover}>
            <circle
              cx={cx}
              cy={Y2}
              r={8}
              fill={SERIES.orange}
              stroke="var(--color-surface-elevated)"
              strokeWidth={2}
            />
            <text
              x={cx - 14}
              y={Y2 - 12}
              textAnchor="end"
              className="fill-ink text-[14px] font-bold"
            >
              다툼 입금 {short(tx.amount)} 원
            </text>
            <text
              x={cx - 14}
              y={Y2 + 22}
              textAnchor="end"
              className="fill-ink-muted text-[13px]"
            >
              판단 제외
            </text>
          </Mark>
        )
      })}

      {/* 계좌의 다른 거래 — 계좌가 쓰이고 있었다는 대조군 */}
      <RowLabel
        y={Y3}
        title="계좌의 다른 거래"
        sub={`${others.length}건, 급여와 카드대금`}
      />
      <line x1={LW} y1={Y3} x2={RIGHT} y2={Y3} stroke="var(--color-border)" />
      {others.map((tx) => (
        <Mark key={tx.id} tx={tx} onHover={onHover}>
          <circle
            cx={x(ts(tx.at))}
            cy={Y3}
            r={5}
            fill={SERIES.aqua}
            stroke="var(--color-surface-elevated)"
            strokeWidth={2}
          />
          <rect
            x={x(ts(tx.at)) - 9}
            y={Y3 - 9}
            width={18}
            height={18}
            fill="transparent"
          />
        </Mark>
      ))}
    </svg>
  )
}

/* ---------- 반복 거래 ---------- */

const Recurring = ({
  scenario,
  spec,
  onHover,
}: {
  scenario: Scenario
  spec: Extract<EvidenceChartSpec, { kind: "RECURRING" }>
  onHover: Hover
}) => {
  const from = ts(scenario.ledgerWindow.from)
  const to = ts(scenario.ledgerWindow.to)
  const x = (t: number) => LW + ((t - from) / (to - from)) * (RIGHT - LW)
  const TOP = 40
  const ROW = 58
  const unknown = scenario.ledger.filter(
    (t) => t.kind === "DISPUTED" || t.afterDispute,
  )
  const disputed = unknown.filter((t) => t.kind === "DISPUTED")
  const tiny = unknown.filter((t) => t.afterDispute)
  const rowsY = spec.rows.map((_, i) => TOP + i * ROW + 20)
  const unknownY = TOP + spec.rows.length * ROW + 20
  const H = unknownY + 58
  const band = scenario.ledgerBands?.[0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <title>{spec.takeaway}</title>
      <Grid ticks={monthTicks(from, to)} x={x} top={TOP - 14} bottom={H - 30} />

      {band && (
        <g>
          <rect
            x={x(ts(band.from)) - 6}
            y={TOP - 14}
            width={RIGHT - x(ts(band.from)) + 6}
            height={H - 30 - (TOP - 14)}
            fill={SERIES.orange}
            fillOpacity={0.1}
          />
          <text
            x={x(ts(band.from)) - 12}
            y={TOP - 20}
            textAnchor="end"
            className="fill-ink text-[13px] font-bold"
          >
            {band.label} →
          </text>
        </g>
      )}

      {spec.rows.map((row, i) => {
        const y = rowsY[i]
        const txs = scenario.ledger.filter(
          (t) => t.counterparty === row.counterparty && !t.afterDispute,
        )
        return (
          <g key={row.label}>
            <RowLabel
              y={y}
              title={row.label}
              sub={`${row.counterparty}, 매달 ${txs.length}회`}
            />
            <polyline
              points={txs.map((t) => `${x(ts(t.at))},${y}`).join(" ")}
              fill="none"
              stroke={SERIES.blue}
              strokeOpacity={0.4}
              strokeWidth={2}
            />
            {txs.map((tx) => (
              <Mark key={tx.id} tx={tx} onHover={onHover}>
                <circle
                  cx={x(ts(tx.at))}
                  cy={y}
                  r={7}
                  fill={SERIES.blue}
                  stroke="var(--color-surface-elevated)"
                  strokeWidth={2}
                />
                <text
                  x={x(ts(tx.at))}
                  y={y - 14}
                  textAnchor="middle"
                  className="fill-ink-muted text-[13px] tabular-nums"
                >
                  {short(tx.amount)}
                </text>
              </Mark>
            ))}
          </g>
        )
      })}

      {/* 모르는 입금 — 판단에서 뺀 거래 */}
      <RowLabel
        y={unknownY}
        title="모르는 입금"
        sub={`다툼 ${disputed.length}건, 1원 ${tiny.length}건`}
      />
      {disputed.map((tx) => (
        <Mark key={tx.id} tx={tx} onHover={onHover}>
          <circle
            cx={x(ts(tx.at))}
            cy={unknownY}
            r={8}
            fill={SERIES.orange}
            stroke="var(--color-surface-elevated)"
            strokeWidth={2}
          />
          <text
            x={x(ts(tx.at)) - 14}
            y={unknownY + 5}
            textAnchor="end"
            className="fill-ink text-[14px] font-bold"
          >
            다툼 입금 {short(tx.amount)} 원
          </text>
        </Mark>
      ))}
      {tiny.map((tx) => (
        <Mark key={tx.id} tx={tx} onHover={onHover}>
          <circle
            cx={x(ts(tx.at))}
            cy={unknownY + 24}
            r={4}
            fill="var(--color-surface-elevated)"
            stroke={SERIES.orange}
            strokeWidth={2}
          />
        </Mark>
      ))}
      {tiny.length > 0 && (
        <text
          x={x(ts(tiny[0].at)) - 12}
          y={unknownY + 29}
          textAnchor="end"
          className="fill-ink-muted text-[13px]"
        >
          1원 {tiny.length}건
        </text>
      )}
    </svg>
  )
}

/* ---------- 잔액 변화 ---------- */

type BalanceEvent = {
  tx: LedgerTx
  before: number
  after: number
  /** 직전 입금 뒤 몇 분 만의 거래인지 */
  sinceIn: number
}

const balanceEvents = (txs: LedgerTx[], start: number, from: number) =>
  txs.reduce<{ list: BalanceEvent[]; bal: number; lastIn: number }>(
    (acc, tx) => {
      const after = acc.bal + (tx.dir === "IN" ? tx.amount : -tx.amount)
      const sinceIn = Math.round((ts(tx.at) - acc.lastIn) / 60_000)
      return {
        list: [...acc.list, { tx, before: acc.bal, after, sinceIn }],
        bal: after,
        lastIn: tx.dir === "IN" ? ts(tx.at) : acc.lastIn,
      }
    },
    { list: [], bal: start, lastIn: from },
  ).list

const Balance = ({
  scenario,
  spec,
  onHover,
}: {
  scenario: Scenario
  spec: Extract<EvidenceChartSpec, { kind: "BALANCE" }>
  onHover: Hover
}) => {
  const from = ts(spec.from)
  const to = ts(spec.to)
  const PL = 70
  const TOP = 36
  const H = 290
  const BOTTOM = H - 34
  const x = (t: number) => PL + ((t - from) / (to - from)) * (RIGHT - PL)

  const txs = scenario.ledger
    .filter((t) => ts(t.at) >= from && ts(t.at) <= to)
    .sort((a, b) => ts(a.at) - ts(b.at))
  const events = balanceEvents(txs, spec.startBalance, from)
  const bal = events.at(-1)?.after ?? spec.startBalance
  const max = Math.max(
    1,
    Math.ceil(Math.max(...events.map((e) => e.after)) / 2_000_000) * 2_000_000,
  )
  const y = (v: number) => BOTTOM - (v / max) * (BOTTOM - TOP)

  const path = [
    `M ${x(from)} ${y(spec.startBalance)}`,
    ...events.flatMap((e) => [`H ${x(ts(e.tx.at))}`, `V ${y(e.after)}`]),
    `H ${x(to)}`,
  ].join(" ")
  const band = scenario.ledgerBands?.[0]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img">
      <title>{spec.takeaway}</title>
      {/* 금액 축 */}
      {[0, max / 2, max].map((v) => (
        <g key={v}>
          <line
            x1={PL}
            y1={y(v)}
            x2={RIGHT}
            y2={y(v)}
            stroke="var(--color-border)"
            strokeDasharray={v === 0 ? undefined : "3 4"}
          />
          <text
            x={PL - 10}
            y={y(v) + 5}
            textAnchor="end"
            className="fill-ink-faint text-[13px] tabular-nums"
          >
            {v === 0 ? "0" : short(v)}
          </text>
        </g>
      ))}
      <Grid ticks={minuteTicks(from, to, 15)} x={x} top={TOP} bottom={BOTTOM} />

      {band && (
        <g>
          <rect
            x={x(ts(band.from))}
            y={TOP - 22}
            width={x(ts(band.to)) - x(ts(band.from))}
            height={BOTTOM - TOP + 22}
            fill={SERIES.orange}
            fillOpacity={0.08}
          />
          <text
            x={x(ts(band.from)) + 6}
            y={TOP - 6}
            className="fill-ink text-[13px] font-bold"
          >
            {band.label}
          </text>
        </g>
      )}

      <path
        d={`${path} V ${BOTTOM} H ${x(from)} Z`}
        fill={SERIES.blue}
        fillOpacity={0.08}
      />
      <path d={path} fill="none" stroke={SERIES.blue} strokeWidth={2.5} />

      {events.map(({ tx, before, after, sinceIn }) => {
        const cx = x(ts(tx.at))
        const disputed = tx.kind === "DISPUTED"
        const label =
          tx.dir === "IN"
            ? `${tx.counterparty} ${short(tx.amount)} 입금${disputed ? ", 다툼" : ""}`
            : `${sinceIn}분 뒤 ${tx.counterparty} ${short(tx.amount)} 출금`
        return (
          <Mark key={tx.id} tx={tx} onHover={onHover}>
            <circle
              cx={cx}
              cy={y(after)}
              r={disputed ? 8 : 6}
              fill={disputed ? SERIES.orange : SERIES.blue}
              stroke="var(--color-surface-elevated)"
              strokeWidth={2}
            />
            {tx.dir === "IN" ? (
              <text
                x={cx}
                y={y(after) - 14}
                textAnchor="middle"
                className="fill-ink text-[14px] font-bold"
              >
                {label}
              </text>
            ) : (
              // 오른쪽 끝 가까이에서는 라벨을 하강선 왼쪽에 둔다(잘림 방지)
              <text
                x={cx > RIGHT - 280 ? cx - 10 : cx + 10}
                y={(y(before) + y(after)) / 2 + 5}
                textAnchor={cx > RIGHT - 280 ? "end" : "start"}
                className="fill-ink text-[14px] font-bold"
              >
                {cx > RIGHT - 280 ? `${label} ↓` : `↓ ${label}`}
              </text>
            )}
            <rect
              x={cx - 10}
              y={Math.min(y(before), y(after)) - 10}
              width={20}
              height={Math.abs(y(before) - y(after)) + 20}
              fill="transparent"
            />
          </Mark>
        )
      })}

      <text
        x={RIGHT}
        y={y(bal) - 10}
        textAnchor="end"
        className="fill-ink text-[14px] font-bold"
      >
        잔액 {won(bal)}
      </text>
    </svg>
  )
}

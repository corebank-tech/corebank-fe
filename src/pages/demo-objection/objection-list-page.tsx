import { Loader2, RotateCcw } from "lucide-react"
import { useNavigate } from "react-router"
import { DemoShell } from "@/pages/demo-objection/demo-shell"
import {
  ARRIVE_MS,
  aiEndIndex,
  clearQueue,
  queueState,
  useQueueClock,
  type QueueState,
} from "@/pages/demo-objection/live-queue"
import { won } from "@/pages/demo-objection/model"
import { SCENARIOS } from "@/pages/demo-objection/scenarios"
import { cn } from "@/shared/lib/utils"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Panel } from "@/shared/ui/panel"
import { Select } from "@/shared/ui/select"

type Row = {
  caseNo: string
  holder: string
  account: string
  amount: number
  receivedAt: string
  due: string
  daysLeft: number
  /** 시연 시나리오 행은 live 로 상태가 바뀐다 */
  live?: { scenarioId: string; state: QueueState; fresh: boolean }
  agent?: { label: string; variant: BadgeVariant }
  advice: string
}

/** 목록을 채우는 가상 사건. 시연 시나리오 3건은 시간에 따라 들어온다 */
const STATIC_ROWS: Row[] = [
  {
    caseNo: "OBJ-2026-0109",
    holder: "명의인 G",
    account: "110-***-5512",
    amount: 450_000,
    receivedAt: "2026-10-30",
    due: "11/9(월)",
    daysLeft: 1,
    agent: { label: "판정 대기", variant: "success" },
    advice: "일부 지급정지",
  },
  {
    caseNo: "OBJ-2026-0110",
    holder: "명의인 H",
    account: "110-***-2208",
    amount: 1_800_000,
    receivedAt: "2026-11-02",
    due: "11/10(화)",
    daysLeft: 2,
    agent: { label: "판정 대기", variant: "success" },
    advice: "불수용",
  },
  {
    caseNo: "OBJ-2026-0116",
    holder: "명의인 J",
    account: "110-***-9031",
    amount: 700_000,
    receivedAt: "2026-11-04",
    due: "11/11(수)",
    daysLeft: 3,
    agent: { label: "분석 실패", variant: "warning" },
    advice: "수동 심사",
  },
  {
    caseNo: "OBJ-2026-0120",
    holder: "명의인 K",
    account: "110-***-6610",
    amount: 2_500_000,
    receivedAt: "2026-11-05",
    due: "11/12(목)",
    daysLeft: 4,
    agent: { label: "서류 보완 대기", variant: "neutral" },
    advice: "-",
  },
]

export const ObjectionListPage = () => {
  const navigate = useNavigate()
  const { elapsed } = useQueueClock()

  // 시연 시나리오: 늦게 들어온 사건이 위로 온다
  const liveRows: Row[] = SCENARIOS.map((s, order) => ({
    s,
    order,
    state: queueState(s, order, elapsed),
  }))
    .filter((x) => x.state.phase !== "NOT_ARRIVED")
    .reverse()
    .map(({ s, order, state }) => ({
      caseNo: s.caseInfo.caseNo,
      holder: s.caseInfo.holder,
      account: s.caseInfo.account,
      amount: s.caseInfo.disputedAmount,
      receivedAt: s.receivedAt,
      due: s.caseInfo.dueDate,
      daysLeft: s.caseInfo.remainingBusinessDays,
      live: {
        scenarioId: s.id,
        state,
        fresh: elapsed - ARRIVE_MS[order] < 2500,
      },
      advice: state.phase === "WAITING_HUMAN" ? s.draft.recommendation : "-",
    }))
  const rows = [
    ...liveRows,
    ...[...STATIC_ROWS].sort((a, b) => a.daysLeft - b.daysLeft),
  ]
  const analyzing = liveRows.filter(
    (r) => r.live?.state.phase === "ANALYZING",
  ).length
  const waiting =
    liveRows.filter((r) => r.live?.state.phase === "WAITING_HUMAN").length +
    STATIC_ROWS.filter((r) => r.agent?.label === "판정 대기").length

  const open = (r: Row) => {
    if (!r.live) return
    const { scenarioId, state } = r.live
    const s = SCENARIOS.find((x) => x.id === scenarioId)
    if (!s || state.phase === "NOT_ARRIVED") return
    // 분석 중이면 지금 하고 있는 단계부터 이어서 보고, 끝났으면 판정 직전에서 연다
    navigate(
      state.phase === "ANALYZING"
        ? `/demo/objection/${scenarioId}/run?at=${state.index}&live=1`
        : `/demo/objection/${scenarioId}/run?at=${aiEndIndex(s)}`,
    )
  }

  const columns: DataGridColumn<Row>[] = [
    {
      key: "caseNo",
      header: "사건번호",
      align: "center",
      width: 160,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.caseNo}
          {/* 배지 자리를 항상 두어 열 폭이 바뀌지 않게 한다 */}
          <Badge variant="primary" className={r.live?.fresh ? "" : "invisible"}>
            신규
          </Badge>
        </span>
      ),
    },
    { key: "holder", header: "명의인", width: 110 },
    { key: "account", header: "계좌", align: "center", width: 140 },
    {
      key: "amount",
      header: "다툼 입금",
      align: "right",
      width: 120,
      render: (r) => won(r.amount),
    },
    { key: "receivedAt", header: "접수일", align: "center", width: 110 },
    {
      key: "due",
      header: "통보 기한",
      align: "center",
      width: 170,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5">
          {r.due}
          <Badge variant={r.daysLeft <= 1 ? "danger" : "neutral"}>
            {r.daysLeft}영업일 남음
          </Badge>
        </span>
      ),
    },
    {
      key: "agent",
      header: "AI 분석",
      width: 260,
      render: (r) =>
        r.live ? (
          <LiveStatus scenarioId={r.live.scenarioId} state={r.live.state} />
        ) : r.agent ? (
          <Badge variant={r.agent.variant}>{r.agent.label}</Badge>
        ) : null,
    },
    { key: "advice", header: "AI 권고", align: "center", width: 120 },
    {
      key: "action",
      header: "",
      align: "center",
      width: 110,
      render: (r) =>
        r.live ? (
          <Button
            size="sm"
            variant={
              r.live.state.phase === "WAITING_HUMAN" ? "primary" : "outline"
            }
            onClick={() => open(r)}
          >
            {r.live.state.phase === "WAITING_HUMAN" ? "판정" : "진행 보기"}
          </Button>
        ) : (
          <span className="text-xs text-ink-faint">시연 제외</span>
        ),
    },
  ]

  return (
    <DemoShell title="지급정지 이의제기 심사">
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-3">
          <Stat label="심사 대기" value={`${rows.length}건`} />
          <Stat
            label="AI 분석 중"
            value={`${analyzing}건`}
            live={analyzing > 0}
          />
          <Stat label="담당자 판정 대기" value={`${waiting}건`} />
          <Stat
            label="기한 임박 (1영업일 이하)"
            value={`${rows.filter((r) => r.daysLeft <= 1).length}건`}
            danger
          />
        </div>

        <FormSection title="조회조건" className="mb-0">
          <div className="grid grid-cols-2 border-t border-border">
            <FormRow label="처리 상태" htmlFor="demo-status">
              <Select
                id="demo-status"
                className="w-[200px]"
                defaultValue="WAIT"
              >
                <option value="WAIT">판정 대기</option>
                <option value="ALL">전체</option>
                <option value="DONE">판정 완료</option>
              </Select>
            </FormRow>
            <FormRow label="통보 기한" htmlFor="demo-due">
              <Select id="demo-due" className="w-[200px]" defaultValue="ALL">
                <option value="ALL">전체</option>
                <option value="SOON">1영업일 이하</option>
              </Select>
            </FormRow>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button variant="primary" size="md" className="min-w-25">
              조회
            </Button>
            <Button variant="secondary" size="md" className="min-w-25">
              초기화
            </Button>
          </div>
        </FormSection>

        <FormSection title="조회결과" className="mb-0">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-base text-ink">
              <span className="font-bold text-primary">[심사 대기]</span>{" "}
              {rows.length}건
            </p>
            <button
              type="button"
              onClick={() => {
                clearQueue()
                navigate("/demo/objection/apply")
              }}
              className="flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> 시연 다시 시작
            </button>
          </div>
          <DataGrid columns={columns} rows={rows} rowKey={(r) => r.caseNo} />
        </FormSection>

        <NoticeBoxFooter
          items={[
            "AI 분석: 소명 완비 시 자동 시작",
            "통보 기한: 소명 완비일부터 5영업일",
            "지급정지 해제: 담당자 승인으로만 가능",
            "AI 분석 실패: 수동 심사",
          ]}
        />
      </div>
    </DemoShell>
  )
}

/** 분석 중 행: 스피너, 지금 하는 단계, 진행률. 끝나면 판정 대기 */
const LiveStatus = ({
  scenarioId,
  state,
}: {
  scenarioId: string
  state: QueueState
}) => {
  const s = SCENARIOS.find((x) => x.id === scenarioId)
  if (!s || state.phase === "NOT_ARRIVED") return null
  if (state.phase === "WAITING_HUMAN")
    return <Badge variant="success">판정 대기</Badge>
  return (
    <div className="flex w-full flex-col gap-1">
      <span className="text-sm flex items-center gap-1.5 font-bold text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        {s.steps[state.index].title}
        <span className="ml-auto text-xs text-ink-muted tabular-nums">
          {state.pct}%
        </span>
      </span>
      <span className="h-1 w-full bg-border">
        <span
          className="block h-1 bg-[var(--demo-series-1)] transition-all duration-300"
          style={{ width: `${state.pct}%` }}
        />
      </span>
    </div>
  )
}

const Stat = ({
  label,
  value,
  danger,
  live,
}: {
  label: string
  value: string
  danger?: boolean
  live?: boolean
}) => (
  <Panel className="px-4 py-3">
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs font-bold",
        live ? "text-primary" : "text-ink-muted",
      )}
    >
      {live && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {label}
    </p>
    <p
      className={
        danger ? "text-h2 font-bold text-danger" : "text-h2 font-bold text-ink"
      }
    >
      {value}
    </p>
  </Panel>
)

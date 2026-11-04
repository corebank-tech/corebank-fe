import { useEffect, useState, type ReactNode } from "react"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileQuestion,
  XCircle,
  Loader2,
  Lock,
  LockOpen,
  ShieldCheck,
  UserCheck,
} from "lucide-react"
import { DocImage } from "@/pages/demo-objection/doc-image"
import { EvidenceChart } from "@/pages/demo-objection/evidence-chart"
import {
  BRANCH_LABEL,
  CLAUSE_LABEL,
  CLAUSE_SCOPE,
  DECISION_LABEL,
  DECISION_ORDER,
  DOC_STATUS,
  VERDICT_VIEW,
  won,
  type Actor,
  type DecisionResult,
  type Link,
  type RuleResult,
  type Scenario,
  type Step,
} from "@/pages/demo-objection/model"
import type { DemoView } from "@/pages/demo-objection/use-player"
import { cn } from "@/shared/lib/utils"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"

export type SceneProps = {
  scenario: Scenario
  step?: Step
  /** 현재 단계까지(진행 중 단계 포함) 드러난 것 */
  live: DemoView
  running: boolean
  speed: number
}

/* ---------- 공통 ---------- */

const ACTOR_TAG: Record<
  Actor,
  { label: string; icon: typeof Bot; bg: string }
> = {
  AGENT: { label: "AI", icon: Bot, bg: "bg-[var(--demo-series-1)]" },
  SERVER: {
    label: "서버 규칙",
    icon: ShieldCheck,
    bg: "bg-[var(--demo-series-3)]",
  },
  HUMAN: { label: "담당자", icon: UserCheck, bg: "bg-[var(--demo-series-2)]" },
}

/** 장면 틀: 수행 주체 표시 + 제목 한 줄. 설명 문장은 두지 않는다. */
const Frame = ({
  actor,
  title,
  aiOutput,
  tagLabel,
  children,
}: {
  actor: Actor
  title: string
  /** AI 가 만든 결과면 오른쪽 위에 AI 표시(Carbon AI label 관례) */
  aiOutput?: boolean
  /** 수행 주체 대신 붙일 표시(결과 장면) */
  tagLabel?: string
  children: ReactNode
}) => {
  const tag = tagLabel
    ? { ...ACTOR_TAG[actor], label: tagLabel, bg: "bg-navy" }
    : ACTOR_TAG[actor]
  return (
    <div className="demo-scene flex h-full min-h-0 flex-col">
      <div className="mb-5 flex h-11 shrink-0 items-center justify-between border-b-2 border-navy pb-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-sm inline-flex h-7 w-24 items-center justify-center gap-1.5 font-bold text-white",
              tag.bg,
            )}
          >
            <tag.icon className="h-4 w-4" aria-hidden />
            {tag.label}
          </span>
          <h2 className="text-h2 font-bold text-ink">{title}</h2>
        </div>
        {aiOutput && (
          <span className="border border-[var(--demo-series-1)] px-2 py-0.5 text-xs font-bold text-[var(--demo-series-1)]">
            AI 생성
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

/** 표 한 줄: 왼쪽 라벨, 오른쪽 값 (corebank LabelValueRow 와 같은 모양) */
const Row = ({
  label,
  children,
  strong,
}: {
  label: string
  children: ReactNode
  strong?: boolean
}) => (
  <div className="flex border-b border-border last:border-b-0">
    <span className="flex w-40 shrink-0 items-center bg-surface px-4 py-3 text-base font-bold text-ink">
      {label}
    </span>
    <span
      className={cn(
        "flex flex-1 items-center px-4 py-3 text-lg",
        strong ? "font-bold text-ink" : "text-ink",
      )}
    >
      {children}
    </span>
  </div>
)

const Table = ({
  head,
  rows,
  widths,
}: {
  head: string[]
  rows: ReactNode[][]
  widths?: string
}) => (
  <div className="border-t-2 border-navy">
    <div
      className="grid bg-surface text-base font-bold text-ink"
      style={{ gridTemplateColumns: widths }}
    >
      {head.map((h) => (
        <span key={h} className="border-b border-border px-4 py-2.5">
          {h}
        </span>
      ))}
    </div>
    {rows.map((r, i) => (
      <div
        key={i}
        className="demo-scene grid border-b border-border text-lg"
        style={{ gridTemplateColumns: widths, animationDelay: `${i * 40}ms` }}
      >
        {r.map((c, j) => (
          <span key={j} className="flex items-center px-4 py-3">
            {c}
          </span>
        ))}
      </div>
    ))}
  </div>
)

/** 진행 중 단계에서 일정 시간이 지나야 보이게 한다. 이미 끝난 단계면 바로 보인다. */
const useRevealAfter = (running: boolean, ms: number) => {
  const [shown, setShown] = useState(!running)
  useEffect(() => {
    if (!running) return
    const t = window.setTimeout(() => setShown(true), ms)
    return () => window.clearTimeout(t)
  }, [running, ms])
  return shown || !running
}

const verdictBadge = (l: Link) => {
  const v = VERDICT_VIEW[l.verdict]
  return (
    <Badge variant={v.badge} className="text-sm h-7 px-3">
      {v.label}
    </Badge>
  )
}

/* ---------- 이의제기 접수 ---------- */

export const CaseScene = ({ scenario, step }: SceneProps) => {
  const c = scenario.caseInfo
  return (
    <Frame actor="HUMAN" title={step?.title ?? "이의제기 접수"}>
      <div className="grid grid-cols-2 gap-6">
        <div className="border border-border">
          <Row label="사건번호">{c.caseNo}</Row>
          <Row label="명의인">{c.holder}</Row>
          <Row label="계좌">{c.account}</Row>
          <Row label="지급정지 근거">{c.trigger}</Row>
          <Row label="다툼 입금" strong>
            {won(c.disputedAmount)}
          </Row>
          <Row label="신청 사유">
            제{scenario.clause}호 {CLAUSE_LABEL[scenario.clause]}
          </Row>
          <Row label="해제 범위">{CLAUSE_SCOPE[scenario.clause]}</Row>
          <Row label="심사 구분">
            {c.simplified ? "간소화 신청" : "일반 심사"}
          </Row>
          <Row label="통보 기한" strong>
            <span className="flex items-center gap-2">
              {c.dueDate}
              <Badge variant="danger" className="text-sm h-6">
                D-{c.remainingBusinessDays}
              </Badge>
            </span>
          </Row>
        </div>
        <div className="flex flex-col gap-4">
          <div className="border border-border">
            <p className="border-b border-border bg-surface px-4 py-2.5 text-base font-bold text-ink">
              신청서 사유
            </p>
            <div className="px-4 py-3">
              {scenario.statement.text.map((t) => (
                <p key={t} className="text-lg leading-relaxed text-ink">
                  {t}
                </p>
              ))}
            </div>
          </div>
          <Table
            head={["제출 서류", "상태"]}
            widths="1fr 220px"
            rows={scenario.documents.map((d) => [
              <span className="text-ink">
                {d.name}
                {d.note && (
                  <span className="ml-2 text-base text-ink-muted">
                    {d.note}
                  </span>
                )}
              </span>,
              <Badge
                variant={DOC_STATUS[d.status].badge}
                className="text-sm h-7 px-3"
              >
                {DOC_STATUS[d.status].label}
              </Badge>,
            ])}
          />
        </div>
      </div>
    </Frame>
  )
}

/* ---------- 입력 확인: AI 에 무엇이 들어가고 무엇이 나오는지 ---------- */

const FlowBox = ({
  title,
  accent,
  children,
}: {
  title: string
  accent?: boolean
  children: ReactNode
}) => (
  <div
    className={cn(
      "flex flex-col border-2",
      accent ? "border-[var(--demo-series-1)]" : "border-border",
    )}
  >
    <p
      className={cn(
        "border-b border-border px-4 py-2.5 text-base font-bold",
        accent
          ? "bg-primary-tint text-[var(--demo-series-1)]"
          : "bg-surface text-ink",
      )}
    >
      {title}
    </p>
    <div className="flex flex-1 flex-col">{children}</div>
  </div>
)

const FlowItem = ({
  label,
  detail,
  delay,
}: {
  label: string
  detail?: string
  delay: number
}) => (
  <div
    className="demo-scene border-b border-border px-4 py-3 last:border-b-0"
    style={{ animationDelay: `${delay}ms` }}
  >
    <p className="text-lg font-bold text-ink">{label}</p>
    {detail && <p className="text-base text-ink-muted">{detail}</p>}
  </div>
)

const FlowArrow = () => (
  <div className="flex items-center justify-center">
    <ArrowRight className="h-8 w-8 text-ink-faint" aria-hidden />
  </div>
)

export const InputScene = ({ scenario, step }: SceneProps) => {
  const submitted = scenario.documents
    .filter((d) => d.status === "SUBMITTED")
    .map((d) => d.name)
  const external = scenario.steps.some((st) => st.stage === "EXTERNAL")
  return (
    <Frame actor="AGENT" title={step?.title ?? "입력 확인"}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_56px_1fr_56px_1fr]">
          <FlowBox title="입력">
            <FlowItem
              label="신청서 사유"
              detail={`${scenario.statement.text.length}문장, ${scenario.statement.reason}`}
              delay={0}
            />
            <FlowItem
              label="제출 서류"
              detail={submitted.join(", ")}
              delay={60}
            />
            <FlowItem
              label="계좌 거래 기록"
              detail={`${scenario.ledgerWindow.caption}, 서버에서 조회`}
              delay={120}
            />
            <FlowItem
              label="외부 조회"
              detail={external ? "사업자 등록 조회" : "필요 시 요청"}
              delay={180}
            />
          </FlowBox>
          <FlowArrow />
          <FlowBox title="AI Agent" accent>
            {scenario.document && (
              <FlowItem
                label="서류 읽기"
                detail={`${scenario.document.title} OCR`}
                delay={240}
              />
            )}
            <FlowItem
              label="고객 주장 뽑기"
              detail="자유 서술에서 확인할 문장"
              delay={300}
            />
            <FlowItem
              label="조회할 기록 정하기"
              detail="주장마다 상대와 기간"
              delay={360}
            />
            <FlowItem
              label="기록과 대조"
              detail="일치, 불일치, 확인 불가"
              delay={420}
            />
          </FlowBox>
          <FlowArrow />
          <FlowBox title="출력">
            <FlowItem
              label="주장 확인표"
              detail="주장마다 근거 기록"
              delay={480}
            />
            <FlowItem label="판정안" detail="권고, 부족 자료" delay={540} />
            <FlowItem label="안내문 초안" delay={600} />
            <FlowItem label="담당자 확인 질문" delay={660} />
          </FlowBox>
        </div>
        <div className="grid grid-cols-3 border border-border">
          <Row label="조회 범위">이 사건 1건</Row>
          <Row label="개인정보">가명 처리 후 전달</Row>
          <Row label="하지 않는 일" strong>
            해제, 판정 확정
          </Row>
        </div>
      </div>
    </Frame>
  )
}

/* ---------- 소명 확인 ---------- */

export const StatementScene = ({ scenario, step, running }: SceneProps) => {
  const flagged = useRevealAfter(running, 800)
  return (
    <Frame actor="AGENT" title={step?.title ?? "신청서 사유 확인"}>
      <div className="max-w-[1100px] border border-border">
        {scenario.statement.text.map((t) => (
          <p
            key={t}
            className="border-b border-border px-5 py-3 text-h2 text-ink"
          >
            {t}
          </p>
        ))}
        {scenario.statement.injectionLine && (
          <div
            className={cn(
              "flex items-center justify-between gap-4 px-5 py-3 transition-colors duration-500",
              flagged && "bg-danger-tint",
            )}
          >
            <p
              className={cn(
                "text-h2",
                flagged ? "text-danger line-through decoration-2" : "text-ink",
              )}
            >
              {scenario.statement.injectionLine}
            </p>
            {flagged && (
              <Badge
                variant="danger"
                className="demo-scene text-sm h-7 shrink-0 px-3"
              >
                AI 지시문, 판단 제외
              </Badge>
            )}
          </div>
        )}
      </div>
    </Frame>
  )
}

/* ---------- 계약서 OCR ---------- */

export const OcrScene = ({ scenario, step }: SceneProps) => {
  const doc = scenario.document
  if (!doc) return null
  return (
    <Frame actor="AGENT" title={step?.title ?? "계약서 OCR"} aiOutput>
      <div className="grid h-full grid-cols-[1fr_520px] gap-6">
        <div className="flex min-h-0 justify-center overflow-hidden bg-surface p-3">
          {doc.image && doc.boxes ? (
            <DocImage
              src={doc.image}
              boxes={doc.boxes}
              fields={doc.fields}
              read={new Set(doc.fields.map((f) => f.id))}
              animate
              className="h-full"
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-3">
          <Table
            head={["항목", "읽은 값", "신뢰도"]}
            widths="130px 1fr 90px"
            rows={doc.fields.map((f) => [
              <span className="text-base text-ink-muted">{f.label}</span>,
              <b className="text-ink">{f.value}</b>,
              <span className="tabular-nums">{f.confidence.toFixed(2)}</span>,
            ])}
          />
          <p className="text-sm leading-relaxed text-ink-muted">
            신뢰도: OCR 엔진이 낸 글자 인식 확률(0~1). 서류가 진짜일 확률이
            아닙니다. 0.85 미만은 담당자 확인(내부 기준)
          </p>
        </div>
      </div>
    </Frame>
  )
}

/* ---------- 주장 추출 ---------- */

export const ClaimsScene = ({ scenario, step, live }: SceneProps) => {
  const claims = scenario.claims.filter((c) => live.claims.has(c.id))
  return (
    <Frame actor="AGENT" title={step?.title ?? "주장 추출"} aiOutput>
      <Table
        head={["No", "고객 주장", "근거 원문", "출처", "상태"]}
        widths="70px 1fr 1.3fr 130px 120px"
        rows={claims.map((c) => [
          c.id,
          <b className="text-ink">{c.text}</b>,
          <span className="text-base text-ink-muted">"{c.quote}"</span>,
          c.source === "OCR" ? "계약서" : "신청서",
          <Badge variant="neutral" className="text-sm h-7 px-3">
            미확인
          </Badge>,
        ])}
      />
    </Frame>
  )
}

/* ---------- 조회 (요청과 응답) ---------- */

export const QueryScene = ({
  scenario,
  step,
  live,
  running,
  speed,
}: SceneProps) => {
  const tool = step?.tool
  const dur = (step?.durationMs ?? 2000) / speed
  const showQuery = useRevealAfter(running, dur * 0.25)
  const showResp = useRevealAfter(running, dur * 0.55)
  if (!tool || !step) return null
  const newLinks = scenario.links.filter((l) =>
    step.reveal?.links?.includes(l.id),
  )
  const claim = tool.claimId
    ? scenario.claims.find((c) => c.id === tool.claimId)
    : undefined
  return (
    <Frame actor="AGENT" title={step.title}>
      <div className="flex h-full flex-col gap-5">
        <div className="grid grid-cols-[1fr_56px_1fr_56px_1fr]">
          {/* 1. 조회를 하게 만든 것: 고객 주장 또는 AI 판단 */}
          <div className="border-2 border-border-strong">
            <p className="border-b border-border bg-surface px-4 py-2 text-base font-bold text-ink">
              {claim ? "고객 주장" : "AI 판단"}
            </p>
            <div className="flex h-[104px] flex-col justify-center px-5">
              <p className="text-h2 font-bold text-ink">
                {claim ? `"${claim.text}"` : tool.reason}
              </p>
              <p className="text-base text-ink-muted">
                {claim
                  ? `${claim.source === "OCR" ? "계약서" : "신청서"}에서 뽑은 주장`
                  : "주장과 별개로 AI가 정한 확인"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-ink-faint" aria-hidden />
          </div>
          {/* 2. AI 가 정한 조회 */}
          <div
            className={cn(
              "border-2",
              showQuery
                ? "border-[var(--demo-series-1)]"
                : "border-dashed border-border",
            )}
          >
            <p className="border-b border-border bg-surface px-4 py-2 text-base font-bold text-ink">
              AI가 정한 조회
            </p>
            {showQuery ? (
              <div className="demo-scene">
                <Row label="목적">{tool.reason}</Row>
                <Row label="조건" strong>
                  {tool.args}
                </Row>
              </div>
            ) : (
              <p className="flex h-[104px] items-center gap-2 px-5 text-lg text-ink-faint">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> 조회
                조건 정하는 중
              </p>
            )}
          </div>
          <div className="flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-ink-faint" aria-hidden />
          </div>
          {/* 3. 응답 */}
          <div
            className={cn(
              "border-2",
              showResp
                ? "border-[var(--demo-series-3)]"
                : "border-dashed border-border",
            )}
          >
            <p className="border-b border-border bg-surface px-4 py-2 text-base font-bold text-ink">
              {step.stage === "EXTERNAL" ? "외부 기관 응답" : "거래 기록 응답"}
            </p>
            <div className="flex h-[104px] items-center px-5">
              {showResp ? (
                <p className="demo-scene text-page font-bold text-ink">
                  {tool.result}
                </p>
              ) : (
                <p className="flex items-center gap-2 text-lg text-ink-faint">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />{" "}
                  {showQuery ? "조회 중" : "대기"}
                </p>
              )}
            </div>
          </div>
        </div>

        {showResp && step.stage !== "EXTERNAL" && live.ledger && (
          <div className="demo-scene border border-border p-4">
            <EvidenceChart scenario={scenario} />
          </div>
        )}

        {showResp && newLinks.length > 0 && (
          <MatchTable scenario={scenario} links={newLinks} />
        )}
      </div>
    </Frame>
  )
}

/* ---------- 주장 대조 ---------- */

const MatchTable = ({
  scenario,
  links,
}: {
  scenario: Scenario
  links: Link[]
}) => (
  <Table
    head={["고객 주장", "확인한 기록", "결과"]}
    widths="1fr 1fr 200px"
    rows={links.map((l) => {
      const claim = scenario.claims.find((c) => c.id === l.claimId)
      const fact = l.factId
        ? scenario.facts.find((f) => f.id === l.factId)
        : undefined
      return [
        <b className="text-ink">{claim?.text}</b>,
        fact ? fact.text : "기록 없음",
        verdictBadge(l),
      ]
    })}
  />
)

export const MatchScene = ({ scenario, step, live }: SceneProps) => {
  const links = scenario.links.filter((l) => live.links.has(l.id))
  const extra = scenario.facts.filter(
    (f) =>
      live.facts.has(f.id) && !scenario.links.some((l) => l.factId === f.id),
  )
  return (
    <Frame actor="AGENT" title={step?.title ?? "주장 대조"} aiOutput>
      <div className="flex flex-col gap-5">
        {links.length > 0 && <MatchTable scenario={scenario} links={links} />}
        {extra.length > 0 && (
          <Table
            head={["추가 확인", "결과"]}
            widths="1fr 200px"
            rows={extra.map((f) => [
              <b className="text-ink">{f.text}</b>,
              <Badge variant="success" className="text-sm h-7 px-3">
                확인
              </Badge>,
            ])}
          />
        )}
        {live.ledgerFocus && live.ledger && (
          <div className="border border-border p-4">
            <EvidenceChart scenario={scenario} />
          </div>
        )}
      </div>
    </Frame>
  )
}

/* ---------- AI 판정안 ---------- */

export const DraftScene = ({ scenario, step }: SceneProps) => {
  const d = scenario.draft
  return (
    <Frame actor="AGENT" title={step?.title ?? "AI 판정안"} aiOutput>
      <div className="max-w-[1100px] border border-border">
        <Row label="권고" strong>
          <span className="text-page">{d.recommendation}</span>
        </Row>
        <Row label="판단">{BRANCH_LABEL[d.branch]}</Row>
        {d.missing.length > 0 && (
          <Row label="부족 자료">{d.missing.join(", ")}</Row>
        )}
        <Row label="확인 질문">
          <span className="flex flex-col">
            {d.questions.map((q) => (
              <span key={q}>{q}</span>
            ))}
          </span>
        </Row>
        <Row label="안내문 초안">
          <span className="text-base text-ink-muted">{d.notice}</span>
        </Row>
      </div>
      <p className="mt-3 text-base text-ink-muted">
        제안입니다. AI는 해제할 수 없습니다.
      </p>
    </Frame>
  )
}

/* ---------- 해제 요건 점검 ---------- */

const RULE: Record<RuleResult, { label: string; variant: BadgeVariant }> = {
  PASS: { label: "충족", variant: "success" },
  FAIL: { label: "미충족", variant: "neutral" },
  NA: { label: "해당 없음", variant: "neutral" },
  APPLIED: { label: "적용", variant: "warning" },
}

export const GateScene = ({ scenario, step, running }: SceneProps) => {
  const gap = 40
  const done = useRevealAfter(running, scenario.gateRules.length * gap + 200)
  return (
    <Frame actor="SERVER" title={step?.title ?? "해제 요건 점검"}>
      <div className="flex h-full flex-col gap-5">
        <Table
          head={["항목", "기준", "근거", "값", "결과"]}
          widths="200px 1fr 210px 200px 120px"
          rows={scenario.gateRules.map((r) => [
            <b className="text-ink">{r.label}</b>,
            <span className="text-base text-ink-muted">{r.condition}</span>,
            <span
              className={cn(
                "text-base",
                r.basis.startsWith("내부") ? "text-ink-faint" : "text-ink",
              )}
            >
              {r.basis}
            </span>,
            r.detail,
            <Badge
              variant={RULE[r.result].variant}
              className="text-sm h-7 px-3"
            >
              {RULE[r.result].label}
            </Badge>,
          ])}
        />
        <div className="grid grid-cols-4 gap-3">
          {DECISION_ORDER.map((d) => {
            const a = scenario.allowed[d]
            const open = done && a.allowed
            return (
              <div
                key={d}
                className={cn(
                  "flex items-center justify-between border-2 px-5 py-3 transition-colors duration-500",
                  !done
                    ? "border-dashed border-border"
                    : open
                      ? "border-success bg-success-tint"
                      : "border-border bg-surface",
                )}
              >
                <span
                  className={cn(
                    "flex items-center gap-2 text-h2 font-bold",
                    open ? "text-success" : "text-ink-faint",
                  )}
                >
                  {done ? (
                    open ? (
                      <LockOpen className="h-5 w-5" aria-hidden />
                    ) : (
                      <Lock className="h-5 w-5" aria-hidden />
                    )
                  ) : (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  )}
                  {DECISION_LABEL[d]}
                </span>
                {done && (
                  <span className="text-base text-ink-muted">
                    {a.allowed ? "가능" : a.reason}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Frame>
  )
}

/* ---------- 담당자 판정 ---------- */

export const DecisionScene = ({ scenario, step, live }: SceneProps) => {
  const d = scenario.decision
  const steps = d.checker
    ? [
        { label: "작성", who: d.maker, done: live.decision !== "NONE" },
        { label: "승인", who: d.checker, done: live.decision === "APPROVED" },
      ]
    : [{ label: "확정", who: d.maker, done: live.decision === "APPROVED" }]
  return (
    <Frame actor="HUMAN" title={step?.title ?? "담당자 판정"}>
      <div className="flex max-w-[1100px] flex-col gap-5">
        <div className="border border-border">
          <Row label="판정" strong>
            <span className="text-page">{DECISION_LABEL[d.result]}</span>
          </Row>
          <Row label="사유">{d.reason}</Row>
          <Row label="계좌">{d.release}</Row>
          <Row label="결재">
            {d.checker ? "2인 승인(내부 통제)" : "1인 확정"}
          </Row>
        </div>
        <div className="flex items-center gap-4">
          {steps.map((s, i) => (
            <div key={s.label} className="flex flex-1 items-center gap-4">
              <div
                className={cn(
                  "flex flex-1 items-center justify-between border-2 px-5 py-4",
                  s.done
                    ? "border-[var(--demo-series-2)]"
                    : "border-dashed border-border",
                )}
              >
                <span className="text-base font-bold text-ink-muted">
                  {s.label}
                </span>
                <span
                  className={cn(
                    "text-h2 font-bold",
                    s.done ? "text-ink" : "text-ink-faint",
                  )}
                >
                  {s.who}
                </span>
              </div>
              {i < steps.length - 1 && (
                <ArrowRight className="h-6 w-6 text-ink-faint" aria-hidden />
              )}
            </div>
          ))}
        </div>
      </div>
    </Frame>
  )
}

/* ---------- 계좌 반영 ---------- */

export const AccountScene = ({ scenario, step }: SceneProps) => {
  const b = scenario.accountBefore
  const a = scenario.accountAfter
  const c = scenario.caseInfo
  return (
    <Frame actor="SERVER" title={step?.title ?? "계좌 반영"}>
      <div className="flex flex-col gap-5">
        <Table
          head={["항목", "판정 전", "판정 후"]}
          widths="200px 1fr 1fr"
          rows={[
            [
              "지급정지",
              b.stopLabel,
              <b
                className={
                  a.stopLabel === "전부 지급정지"
                    ? "text-danger"
                    : "text-warning"
                }
              >
                {a.stopLabel}
              </b>,
            ],
            ["잔액", won(b.balance), won(a.balance)],
            ["보류액", won(b.hold), won(a.hold)],
            [
              <b className="text-ink">출금가능</b>,
              won(b.available),
              <b
                className={cn(
                  "text-page",
                  a.available !== b.available ? "text-success" : "text-ink",
                )}
              >
                {won(a.available)}
              </b>,
            ],
            ...(c.dueDateAfter
              ? [
                  [
                    <b className="text-ink">심사 기한</b>,
                    c.dueDate,
                    <b className="text-page text-ink">{c.dueDateAfter}</b>,
                  ],
                ]
              : []),
          ]}
        />
        <Table
          head={["통지 대상", "내용", "수단", "근거"]}
          widths="1fr 1fr 160px 200px"
          rows={scenario.notices.map((n) => [
            <b className="text-ink">{n.to}</b>,
            n.kind,
            n.channel,
            <span className="text-base text-ink-muted">{n.basis}</span>,
          ])}
        />
      </div>
    </Frame>
  )
}

/* ---------- 결과 ---------- */

const RESULT_TONE: Record<
  DecisionResult,
  { icon: typeof Bot; text: string; box: string }
> = {
  ACCEPTED: {
    icon: CheckCircle2,
    text: "text-success",
    box: "border-success bg-success-tint",
  },
  PARTIAL: {
    icon: LockOpen,
    text: "text-warning",
    box: "border-warning bg-warning-tint",
  },
  SUPPLEMENT: {
    icon: FileQuestion,
    text: "text-primary",
    box: "border-primary bg-primary-tint",
  },
  REJECTED: {
    icon: XCircle,
    text: "text-danger",
    box: "border-danger bg-danger-tint",
  },
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="border border-border px-6 py-4">
    <p className="text-base text-ink-muted">{label}</p>
    <p className="text-h2 font-bold text-ink">{value}</p>
  </div>
)

export const SummaryScene = ({ scenario }: SceneProps) => {
  const agentSteps = scenario.steps.filter((s) => s.actor === "AGENT")
  const agentSec = Math.round(
    agentSteps.reduce((sum, s) => sum + s.durationMs, 0) / 1000,
  )
  const left = [
    ...scenario.draft.questions,
    "판정 입력",
    ...(scenario.decision.checker ? ["승인"] : []),
  ]
  const d = scenario.decision
  const tone = RESULT_TONE[d.result]
  return (
    <Frame actor="HUMAN" title="결과" tagLabel="결과">
      <div className="flex flex-col gap-6">
        <div
          className={cn(
            "demo-scene flex items-center gap-8 border-l-8 px-10 py-8",
            tone.box,
          )}
        >
          <tone.icon
            className={cn("h-20 w-20 shrink-0", tone.text)}
            aria-hidden
          />
          <div>
            <p className="text-lg font-bold text-ink-muted">최종 판정</p>
            <p className={cn("text-[64px] leading-none font-bold", tone.text)}>
              {DECISION_LABEL[d.result]}
            </p>
            <p className="mt-3 text-h2 font-bold text-ink">{d.release}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="AI 처리"
            value={`${agentSteps.length}단계, ${agentSec}초`}
          />
          <Stat label="담당자 확인" value={`${left.length}건`} />
          <Stat
            label="통보 기한"
            value={scenario.caseInfo.dueDateAfter ?? scenario.caseInfo.dueDate}
          />
        </div>
        {scenario.document && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between border border-border px-6 py-4">
              <span className="text-lg text-ink-muted">서류만 보면</span>
              <b className="text-h2 text-danger">수용, 통과</b>
            </div>
            <div className="flex items-center justify-between border border-border px-6 py-4">
              <span className="text-lg text-ink-muted">해제 요건 점검</span>
              <b className="text-h2 text-success">수용 불가, 차단</b>
            </div>
          </div>
        )}
      </div>
    </Frame>
  )
}

import * as React from "react"
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  Database,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRoundCheck,
  Wrench,
} from "lucide-react"
import {
  buildFdsReviewStages,
  currentFdsReviewStage,
  latestFdsCallRecord,
  type FdsReviewStage,
} from "@/entities/fds"
import type { FdsHoldDetail } from "@/shared/api/generated"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Panel } from "@/shared/ui/panel"
import "@/pages/admin/fds-held-transfer-motion.css"

const stageStateLabel: Record<FdsReviewStage["state"], string> = {
  done: "완료",
  active: "진행 중",
  waiting: "대기",
  failed: "실패",
  recovery: "복구 필요",
}

const callLabel: Record<string, string> = {
  CUSTOMER_CONFIRMED: "고객이 이체 요청을 확인함",
  CUSTOMER_DENIED: "고객이 이체 요청을 부인함",
  NO_ANSWER: "고객 응답 없음",
  INCONCLUSIVE: "고객 확인 결과 판단 불가",
}

const serverStatusLabel: Record<string, string> = {
  PENDING: "대기",
  RUNNING: "진행 중",
  COMPLETED: "완료",
  FAILED: "실패",
  CONFLICT: "충돌",
  MATCH: "위험 계좌 목록과 일치",
  NO_MATCH: "위험 계좌 목록과 일치하지 않음",
  UNAVAILABLE: "위험 계좌 조회 불가",
  ACTIVE: "활성",
  HELD: "보류",
}
const labeledStatus = (value?: string) =>
  value ? `${serverStatusLabel[value] ?? value} (${value})` : "-"

const yesNo = (value?: boolean) =>
  value == null ? "-" : value ? "예" : "아니오"
const dateTime = (value?: string) => (value ? formatDateTime(value) : "-")
const StepRail = ({
  stages,
  playbackIndex,
  targetIndex,
  isReplaying,
  onReplay,
}: {
  stages: FdsReviewStage[]
  playbackIndex: number
  targetIndex: number
  isReplaying: boolean
  onReplay: () => void
}) => (
  <Panel className="self-start p-4 xl:sticky xl:top-4">
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="font-bold">처리 단계</h2>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={isReplaying || targetIndex === 0}
        onClick={onReplay}
      >
        {isReplaying ? "재생 중" : "처리 과정 다시 보기"}
      </Button>
    </div>
    <ol className="fds-step-rail" aria-label="FDS 사건 처리 단계">
      {stages.map((stage, index) => {
        const visibleState =
          index > playbackIndex
            ? "waiting"
            : index === playbackIndex && playbackIndex < targetIndex
              ? "active"
              : stage.state
        return (
          <li
            key={`${stage.id}-${index <= playbackIndex ? "revealed" : "future"}`}
            className="fds-step-item fds-step-reveal"
            data-state={visibleState}
            data-actor={stage.actor === "담당자" ? "HUMAN" : "SYSTEM"}
            data-playback={
              index === playbackIndex
                ? "current"
                : index < playbackIndex
                  ? "past"
                  : "future"
            }
          >
            <span className="fds-step-dot" aria-hidden="true">
              {visibleState === "done"
                ? "✓"
                : visibleState === "failed"
                  ? "!"
                  : visibleState === "recovery"
                    ? "↻"
                    : index + 1}
            </span>
            <div className="min-w-0">
              <strong>{stage.title}</strong>
              <small>
                {stage.actor} · {stageStateLabel[visibleState]}
              </small>
            </div>
          </li>
        )
      })}
    </ol>
  </Panel>
)

const TransferTimeline = ({ detail }: { detail: FdsHoldDetail }) => {
  const history = detail.toolResults?.history
  const items = [...(history?.items ?? [])].sort((left, right) =>
    (left.transferredAt ?? "").localeCompare(right.transferredAt ?? ""),
  )
  const current = detail.originalTransfer
  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-bold text-ink">10분 반복 이체</h2>
          <p className="text-sm mt-1 text-ink-faint">
            서버가 Agent에 제공한 성공 이체 {items.length}건과 현재 보류 요청
          </p>
        </div>
        {history?.hasMore && <Badge variant="warning">추가 이력 있음</Badge>}
      </div>
      {items.length === 0 && (
        <p className="text-sm mt-4 border border-border bg-surface p-4 text-ink-muted">
          제공된 최근 성공 이체 이력이 없습니다.
        </p>
      )}
      <ol
        className="mt-5 flex items-stretch gap-3 overflow-x-auto pb-2"
        aria-label="실제 성공 이체와 현재 보류 요청의 시간 순서"
        data-testid="fds-transfer-timeline"
      >
        {items.map((item, index) => (
          <React.Fragment key={item.refId ?? `history-${index}`}>
            {index > 0 && (
              <ArrowRight
                className="my-auto shrink-0 text-ink-faint"
                size={18}
              />
            )}
            <li className="min-w-56 flex-1 border border-t-4 border-border border-t-success bg-surface p-4">
              <div className="text-sm flex justify-between gap-2 font-bold">
                <span>성공 이체 {item.refId ?? index + 1}</span>
                <span className="text-success">성공 (SUCCESS)</span>
              </div>
              <p className="mt-3 font-bold">
                {item.amount == null
                  ? "금액 확인 불가"
                  : formatAmount(item.amount)}
              </p>
              <p className="text-sm mt-1 text-ink-muted">
                {item.recipientAccountMasked ?? "계좌 확인 불가"}
              </p>
              <small className="mt-2 flex items-center gap-1 text-ink-muted">
                <Clock3 size={13} /> {dateTime(item.transferredAt)} · 기표 완료
              </small>
            </li>
          </React.Fragment>
        ))}
        {(items.length > 0 || current) && (
          <ArrowRight className="my-auto shrink-0 text-ink-faint" size={18} />
        )}
        {current && (
          <li className="min-w-56 flex-1 border border-t-4 border-border border-t-warning bg-warning-tint p-4">
            <div className="text-sm flex justify-between gap-2 font-bold">
              <span>현재 요청 {current.transferHoldId ?? ""}</span>
              <span className="text-warning">
                {labeledStatus(current.holdStatus ?? "HELD")}
              </span>
            </div>
            <p className="mt-3 font-bold">
              {current.amount == null
                ? "금액 확인 불가"
                : formatAmount(current.amount)}
            </p>
            <p className="text-sm mt-1 text-ink-muted">
              {current.recipientAccountMasked ?? "계좌 확인 불가"}
            </p>
            <small className="mt-2 flex items-center gap-1 text-ink-muted">
              <LockKeyhole size={13} /> {dateTime(current.heldAt)} · 미기표
            </small>
          </li>
        )}
      </ol>
    </Panel>
  )
}

const sceneCopy = (stage: FdsReviewStage, detail: FdsHoldDetail) => {
  const investigation = detail.investigation
  const history = detail.toolResults?.history
  const recipient = detail.toolResults?.recipientContext
  const report = detail.agentReport
  const risk = detail.riskAccountCheck
  const latestCall = latestFdsCallRecord(detail.callRecords)
  switch (stage.id) {
    case "hold":
      return {
        title: "원본 이체 보류",
        description:
          "서버가 원본 요청을 기표하지 않고 관리자 승인 대상으로 보관했습니다.",
        input: `정책 ${detail.serverPolicy?.policyCode ?? "-"} · ${detail.amount == null ? "금액 확인 불가" : formatAmount(detail.amount)}`,
        result: `${detail.holdStatus ?? "HELD"} · ${detail.originalTransfer?.releaseMode === "ON_APPROVAL" ? "관리자 승인 후 실행" : (detail.originalTransfer?.releaseMode ?? "-")}`,
      }
    case "investigation":
      return {
        title: stage.state === "active" ? "조사 작업 대기" : "조사 작업 등록",
        description:
          "보류 사건의 추가 위험 조사를 위한 작업 상태를 서버에서 확인합니다.",
        input: `조사 ID ${investigation?.investigationId ?? "생성 대기"}`,
        result: `${labeledStatus(investigation?.status ?? "PENDING")} · 시도 ${investigation?.attemptCount ?? 0}회 · 다음 시도 ${dateTime(investigation?.nextAttemptAt)}`,
      }
    case "history":
      return {
        title: "최근 이체 이력 조회",
        description:
          "Agent에 실제 제공된 최근 성공 이체만 조회 근거로 표시합니다.",
        input: `${dateTime(history?.rangeFrom)} ~ ${dateTime(history?.rangeTo)}`,
        result: history?.executed
          ? `${history.items?.length ?? 0}건 제공${history.hasMore ? " · 추가 이력 있음" : ""}`
          : "조회 실행 대기",
      }
    case "recipient":
      return {
        title: "수취인 관계 조회",
        description:
          "반복 구간 이전의 거래 관계와 다른 출금계좌 사용 여부를 확인합니다.",
        input: `조회 실행 ${yesNo(recipient?.executed)}`,
        result: `구간 이전 거래 ${yesNo(recipient?.hasSucceededBeforeWindow)} · 다른 출금계좌 ${recipient?.otherWithdrawalAccountCount ?? "-"}개`,
      }
    case "agent":
      return {
        title:
          stage.state === "failed" ? "Agent 조사 실패" : "Agent 추가 위험 조사",
        description:
          report?.summary ??
          (stage.state === "failed"
            ? (investigation?.failureReason ??
              "조사를 완료하지 못했습니다. 보류 상태는 유지됩니다.")
            : "Agent 조사 결과를 기다리고 있습니다."),
        input: `상태 ${report?.status ?? investigation?.status ?? "-"}`,
        result: report?.secondaryFindings?.length
          ? `추가 발견 ${report.secondaryFindings.length}건`
          : "추가 발견 없음 또는 조사 중",
      }
    case "risk":
      return {
        title: "위험 계좌 재검증",
        description:
          "활성 위험 계좌 데이터셋과 수취계좌의 일치 여부를 확인합니다.",
        input: `데이터셋 ${risk?.datasetVersion ?? "확인 불가"}`,
        result: `${risk?.status ? labeledStatus(risk.status) : "조회 대기"}${risk?.unavailableReason ? ` · ${risk.unavailableReason}` : ""}`,
      }
    case "call":
      return {
        title: "고객 확인",
        description: latestCall
          ? (callLabel[latestCall.callResult ?? ""] ??
            latestCall.callResult ??
            "확인 결과 있음")
          : risk?.status === "MATCH"
            ? "위험 계좌 일치 건은 고객 콜 없이 거절만 가능합니다."
            : "아래 고객 확인 결과를 기록한 뒤 담당자가 판정합니다.",
        input: latestCall?.investigationReason ?? "고객 확인 결과 입력 대기",
        result: latestCall
          ? `${dateTime(latestCall.recordedAt)} · ${latestCall.selectedByAction ? "최종 조치에 사용" : "미선정"}`
          : "기록 없음",
      }
    case "decision": {
      const actionInput = detail.adminAction
        ? `조치 ${detail.adminAction.actionType ?? "확인 중"}${detail.adminAction.reasonCode ? ` · 사유 ${detail.adminAction.reasonCode}` : ""}`
        : "조치 선택 대기"
      return {
        title:
          stage.state === "done"
            ? "담당자 판정 완료"
            : stage.state === "recovery"
              ? "관리자 조치 복구 필요"
              : "담당자 확인 대기",
        description:
          stage.state === "done"
            ? "서버에 최종 관리자 조치가 반영되었습니다."
            : "서버 보류 근거, Agent 조사, 위험 계좌 판정과 고객 확인 결과를 검토합니다.",
        input: actionInput,
        result: `${labeledStatus(detail.adminAction?.status ?? "PENDING")}${detail.adminAction?.failureReason ? ` · ${detail.adminAction.failureReason}` : ""}`,
      }
    }
  }
}

const CurrentScene = ({
  stage,
  detail,
}: {
  stage: FdsReviewStage
  detail: FdsHoldDetail
}) => {
  const copy = sceneCopy(stage, detail)
  const activityNotice =
    stage.state === "recovery"
      ? "관리자 조치 복구 상태를 확인하고 있습니다."
      : stage.id === "call"
        ? "고객 확인 결과 입력을 기다리고 있습니다."
        : stage.id === "decision"
          ? "담당자의 최종 조치를 기다리고 있습니다."
          : "실제 서버 처리 상태를 재조회하고 있습니다."
  const serverActivity = stage.id !== "call" && stage.id !== "decision"
  const Icon =
    stage.state === "failed"
      ? AlertTriangle
      : stage.state === "recovery"
        ? Wrench
        : stage.actor === "AI Agent"
          ? Search
          : stage.actor === "담당자"
            ? UserRoundCheck
            : stage.id === "risk"
              ? ShieldCheck
              : Database
  return (
    <Panel key={`${stage.id}-${stage.state}`} className="fds-scene-enter">
      <div className="text-sm flex justify-between border-b border-border px-5 py-3 font-bold text-ink">
        <span>현재 처리 단계</span>
        <span>
          {stage.title} · {stageStateLabel[stage.state]}
        </span>
      </div>
      <div className="flex min-h-64 flex-col items-center justify-center gap-4 px-6 py-8 text-center">
        <span
          className={`grid h-14 w-14 place-items-center rounded-full ${stage.state === "failed" || stage.state === "recovery" ? "bg-danger-tint text-danger" : stage.actor === "담당자" ? "bg-warning-tint text-warning" : "bg-primary-tint text-primary"}`}
        >
          <Icon size={28} />
        </span>
        <div>
          <p className="text-sm font-bold text-primary">{stage.actor}</p>
          <h2 className="mt-1 text-h2 font-bold text-ink">{copy.title}</h2>
          <p className="mt-2 text-base text-ink-muted">{copy.description}</p>
        </div>
        {(stage.state === "active" || stage.state === "recovery") && (
          <div
            className={`${serverActivity ? "fds-tool-pulse" : ""} flex items-center gap-3 border border-primary bg-primary-tint px-5 py-3 text-primary`}
          >
            {serverActivity ? (
              <Database size={20} />
            ) : (
              <span className="fds-wait-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            )}
            <strong>{activityNotice}</strong>
          </div>
        )}
      </div>
      <div className="grid border-t border-border bg-surface md:grid-cols-2">
        <div className="border-b border-border p-4 md:border-r md:border-b-0">
          <span className="text-xs font-bold text-ink-faint">입력·근거</span>
          <p className="text-sm mt-1">{copy.input}</p>
        </div>
        <div className="p-4">
          <span className="text-xs font-bold text-ink-faint">현재 결과</span>
          <p className="text-sm mt-1">{copy.result}</p>
        </div>
      </div>
    </Panel>
  )
}

export const FdsHeldTransferReview = ({
  detail,
}: {
  detail: FdsHoldDetail
}) => {
  const stages = buildFdsReviewStages(detail)
  const current = currentFdsReviewStage(stages)
  const targetIndex = Math.max(
    0,
    stages.findIndex((stage) => stage.id === current.id),
  )
  const [replayIndex, setReplayIndex] = React.useState<number | null>(null)
  const isReplaying = replayIndex != null

  React.useEffect(() => {
    if (replayIndex == null) return
    const timer = window.setTimeout(
      () =>
        setReplayIndex((index) => {
          if (index == null) return null
          const nextIndex = index + 1
          return nextIndex >= targetIndex ? null : nextIndex
        }),
      1000,
    )
    return () => window.clearTimeout(timer)
  }, [replayIndex, targetIndex])

  const visibleIndex = replayIndex ?? targetIndex
  const serverStage = stages[visibleIndex] ?? current
  const playbackStage: FdsReviewStage =
    isReplaying && visibleIndex < targetIndex
      ? { ...serverStage, state: "active" }
      : serverStage
  return (
    <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <StepRail
        stages={stages}
        playbackIndex={visibleIndex}
        targetIndex={targetIndex}
        isReplaying={isReplaying}
        onReplay={() => setReplayIndex(0)}
      />
      <div className="min-w-0 space-y-5">
        <TransferTimeline detail={detail} />
        <CurrentScene stage={playbackStage} detail={detail} />
      </div>
    </div>
  )
}

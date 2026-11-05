import * as React from "react"
import { Link, useNavigate } from "react-router"
import { hasPermission } from "@/entities/auth"
import { useSession } from "@/features/session"
import {
  CASE_STATUS_LABEL,
  AGENT_RUN_STATUS_LABEL,
  OBJECTION_STATUS_LABEL,
  formatClause,
  labelOf,
  useAgentRunSnapshots,
  useObjectionList,
  type AgentRunSnapshot,
  type ObjectionSummary,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDate, formatDateTime } from "@/shared/lib/format"
import { QUERY_DEFAULT_PAGE_SIZE } from "@/shared/config/policy"
import { Loader2 } from "lucide-react"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { FormSection } from "@/shared/ui/form-section"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Pagination } from "@/shared/ui/pagination"
import { Panel } from "@/shared/ui/panel"

/**
 * ADM-05 지급정지 이의제기 심사 — 목록.
 *
 * 서버(`GET /admin/objections`)가 최근 접수 순 200건을 한 번에 준다. 페이지 나누기는
 * 받은 목록을 화면에서 자른다. 정렬 칸을 두지 않는 이유는 ADM-01 목록 주석과 같다.
 *
 * 목록 응답에는 소명 원문이 없어 조회 사유를 묻지 않는다. 사유는 소명이 보이는
 * 상세를 열 때 묻는다.
 *
 * AI 분석 상태 칸은 이의제기마다 실행 목록을 따로 묻는다. 목록 응답에 요약이 없어서다.
 */

const CASE_STATUS_TONE: Record<string, BadgeVariant> = {
  STOPPED: "danger",
  PARTIAL: "warning",
  RELEASED: "success",
}

const OBJECTION_STATUS_TONE: Record<string, BadgeVariant> = {
  RECEIVED: "primary",
  DECIDED: "neutral",
}

export const Adm05ObjectionList = () => {
  const navigate = useNavigate()
  const { permissions } = useSession()
  const canWrite = hasPermission(permissions, "PAYMENT_STOP_WRITE")
  const { objections, isFetching, isError, error } = useObjectionList()
  const [page, setPage] = React.useState(1)

  const rows = isError ? [] : (objections ?? [])
  const totalPages = Math.ceil(rows.length / QUERY_DEFAULT_PAGE_SIZE)
  const pageRows = rows.slice(
    (page - 1) * QUERY_DEFAULT_PAGE_SIZE,
    page * QUERY_DEFAULT_PAGE_SIZE,
  )
  // 분석 상태는 이의제기마다 따로 묻는다(N+1). 보이는 쪽의 행만 묻는다.
  const snapshots = useAgentRunSnapshots(pageRows.map((row) => row.objectionId))
  const waitingCount = rows.filter(
    (row) => row.objectionStatus === "RECEIVED",
  ).length

  const columns: DataGridColumn<ObjectionSummary>[] = [
    {
      key: "objectionId",
      header: "번호",
      align: "center",
      width: 64,
      render: (row) => row.objectionId,
    },
    {
      key: "caseId",
      header: "사건 번호",
      align: "center",
      width: 84,
      render: (row) => row.caseId,
    },
    {
      key: "accountId",
      header: "계좌 ID",
      align: "center",
      width: 80,
      render: (row) => row.accountId,
    },
    {
      key: "clause",
      header: "이의제기 사유",
      // 사유가 길어 줄을 바꾼다. 한 줄로 두면 오른쪽 칸이 화면 밖으로 밀린다.
      className: "whitespace-normal",
      render: (row) => formatClause(row.clause),
    },
    {
      key: "disputedTotal",
      header: "다툼 입금액",
      align: "right",
      width: 130,
      render: (row) => formatAmount(row.disputedTotal),
    },
    {
      key: "objectionDeadline",
      header: "신청 기한",
      align: "center",
      width: 110,
      render: (row) =>
        row.objectionDeadline ? formatDate(row.objectionDeadline) : "-",
    },
    {
      key: "receivedAt",
      header: "접수 일시",
      align: "center",
      width: 150,
      render: (row) => (row.receivedAt ? formatDateTime(row.receivedAt) : "-"),
    },
    {
      key: "caseStatus",
      header: "지급정지",
      align: "center",
      width: 110,
      render: (row) => (
        <Badge variant={CASE_STATUS_TONE[row.caseStatus] ?? "neutral"}>
          {labelOf(CASE_STATUS_LABEL, row.caseStatus)}
        </Badge>
      ),
    },
    {
      key: "objectionStatus",
      header: "처리 상태",
      align: "center",
      width: 90,
      render: (row) => (
        <Badge
          variant={OBJECTION_STATUS_TONE[row.objectionStatus] ?? "neutral"}
        >
          {labelOf(OBJECTION_STATUS_LABEL, row.objectionStatus)}
        </Badge>
      ),
    },
    {
      key: "analysis",
      header: "AI 분석",
      width: 150,
      render: (row) => (
        <AnalysisStatus snapshot={snapshots.get(row.objectionId)} />
      ),
    },
    {
      key: "detail",
      header: "관리",
      align: "center",
      width: 70,
      render: (row) => (
        <Link
          to={`/admin/objections/${row.objectionId}`}
          aria-label={`이의제기 ${row.objectionId} 심사`}
          className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.objectionStatus === "RECEIVED" ? "심사" : "상세"}
        </Link>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <Stat label="접수" value={`${rows.length}건`} />
        <Stat label="판정 대기" value={`${waitingCount}건`} highlight />
        <Stat label="판정 확정" value={`${rows.length - waitingCount}건`} />
      </div>

      <FormSection
        title="이의제기 목록"
        className="mb-0"
        action={
          // 대리 접수는 변경 권한이 있을 때만 보인다(직무분리 PH-49).
          canWrite && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate("/admin/objections/intake")}
            >
              대리 접수
            </Button>
          )
        }
      >
        <p className="mb-2 text-base text-ink">
          <span className="font-bold text-primary">
            [총 {rows.length.toLocaleString("ko-KR")}건]
          </span>
        </p>

        <DataGrid
          columns={columns}
          rows={pageRows}
          rowKey={(row) => String(row.objectionId)}
          loading={isFetching}
          emptyMessage={
            isError
              ? (toErrorMessage(error) ?? "")
              : "접수된 이의제기가 없습니다."
          }
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </FormSection>

      <NoticeBoxFooter
        items={[
          "목록은 최근 접수 순 200건까지 표시됩니다.",
          "신청 기한은 채권소멸 공고일 기준 이의제기를 받을 수 있는 마지막 날입니다.",
          "지급정지 해제는 해제 요건 점검을 통과한 판정을 담당자가 확정할 때만 이루어집니다.",
          "상세 화면은 소명 원문이 보이므로 조회 사유를 고른 뒤 열립니다.",
        ]}
      />
    </div>
  )
}

const Stat = ({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) => (
  <Panel className="px-4 py-3">
    <p className="text-xs font-bold text-ink-muted">{label}</p>
    <p
      className={
        highlight
          ? "text-h2 font-bold text-primary"
          : "text-h2 font-bold text-ink"
      }
    >
      {value}
    </p>
  </Panel>
)

const RUN_STATUS_TONE: Record<string, BadgeVariant> = {
  QUEUED: "neutral",
  RUNNING: "primary",
  COMPLETED: "success",
  FAILED: "danger",
}

/** AI 분석 상태 칸. 분석 중이면 지금 하는 단계를 함께 보인다. */
const AnalysisStatus = ({
  snapshot,
}: {
  snapshot: AgentRunSnapshot | undefined
}) => {
  if (!snapshot?.isLoaded) return <span className="text-ink-faint">-</span>
  if (snapshot.status == null) {
    return <span className="text-xs text-ink-faint">분석 없음</span>
  }
  if (snapshot.status === "RUNNING") {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-primary">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">
          {snapshot.currentStepTitle ?? "분석 중"}
        </span>
      </span>
    )
  }
  return (
    <Badge variant={RUN_STATUS_TONE[snapshot.status] ?? "neutral"}>
      {labelOf(AGENT_RUN_STATUS_LABEL, snapshot.status)}
    </Badge>
  )
}

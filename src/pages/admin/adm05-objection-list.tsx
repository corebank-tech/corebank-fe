import * as React from "react"
import { Link, useNavigate } from "react-router"
import { hasPermission } from "@/entities/auth"
import { useSession } from "@/features/session"
import {
  CASE_STATUS_LABEL,
  AGENT_RUN_STATUS_LABEL,
  OBJECTION_STATUS_LABEL,
  formatClause,
  isObjectionOpen,
  labelOf,
  useObjectionList,
  type ObjectionSummary,
} from "@/entities/payment-stop"
import { DeadlineCountdown } from "@/widgets/objection"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDate, formatDateTime } from "@/shared/lib/format"
import { QUERY_DEFAULT_PAGE_SIZE } from "@/shared/config/policy"
import { Loader2 } from "lucide-react"
import { Alert } from "@/shared/ui/alert"
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
 * AI 분석 상태 칸과 심사 기한 칸은 목록 응답의 요약 필드(`latestRunStatus`,
 * `latestRunLastStepTitle`, `reviewDeadline`, `deadlineAlert`, `supplementOverdue`)로 그린다.
 * 이의제기마다 실행 목록을 따로 묻던 방식(N+1)은 걷어냈다.
 */

const CASE_STATUS_TONE: Record<string, BadgeVariant> = {
  STOPPED: "danger",
  PARTIAL: "warning",
  RELEASED: "success",
}

const OBJECTION_STATUS_TONE: Record<string, BadgeVariant> = {
  RECEIVED: "primary",
  UNDER_REVIEW: "primary",
  SUPPLEMENT_REQUESTED: "coolViolet",
  SUPPLEMENT_SUBMITTED: "primary",
  PENDING_APPROVAL: "warning",
  DECIDED: "neutral",
}

export const Adm05ObjectionList = () => {
  const navigate = useNavigate()
  const { permissions } = useSession()
  const canWrite = hasPermission(permissions, "PAYMENT_STOP_WRITE")
  const { objections, isPending, isError, error, isQueueStalled, recheck } =
    useObjectionList()
  const [page, setPage] = React.useState(1)

  // 다시 받기가 한 번 실패해도 이미 받은 목록은 그대로 둔다. 오류는 따로 알린다.
  const rows = objections ?? []
  const hasStaleRows = isError && objections != null
  const totalPages = Math.ceil(rows.length / QUERY_DEFAULT_PAGE_SIZE)
  const pageRows = rows.slice(
    (page - 1) * QUERY_DEFAULT_PAGE_SIZE,
    page * QUERY_DEFAULT_PAGE_SIZE,
  )
  const openCount = rows.filter((row) =>
    isObjectionOpen(row.objectionStatus),
  ).length
  const approvalCount = rows.filter(
    (row) => row.objectionStatus === "PENDING_APPROVAL",
  ).length
  const alertCount = rows.filter((row) => row.deadlineAlert).length

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
      width: 100,
      render: (row) =>
        row.objectionDeadline ? formatDate(row.objectionDeadline) : "-",
    },
    {
      key: "reviewDeadline",
      header: "심사 기한",
      align: "center",
      width: 190,
      render: (row) =>
        row.objectionStatus === "DECIDED" ? (
          <span className="text-xs text-ink-faint">
            {row.reviewDeadline ? formatDate(row.reviewDeadline) : "-"}
          </span>
        ) : row.objectionStatus === "SUPPLEMENT_REQUESTED" ? (
          // 보완 중에는 서버가 심사 기한을 비운다. 대신 보완 기한을 보인다.
          <DeadlineCountdown
            label="보완 기한"
            deadline={row.supplementDue}
            alert={row.supplementOverdue}
            pendingText="보완 기한 미정"
            compact
          />
        ) : (
          <DeadlineCountdown
            label="심사 기한"
            deadline={row.reviewDeadline}
            alert={row.deadlineAlert}
            pendingText="완비 확인 전"
            compact
          />
        ),
    },
    {
      key: "receivedAt",
      header: "접수 일시",
      align: "center",
      width: 100,
      render: (row) =>
        row.receivedAt ? (
          <span title={formatDateTime(row.receivedAt)}>
            {formatDate(row.receivedAt)}
          </span>
        ) : (
          "-"
        ),
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
      width: 110,
      render: (row) => (
        <span className="inline-flex flex-col items-center gap-1">
          <Badge
            variant={OBJECTION_STATUS_TONE[row.objectionStatus] ?? "neutral"}
          >
            {labelOf(OBJECTION_STATUS_LABEL, row.objectionStatus)}
          </Badge>
          {row.supplementOverdue && <Badge variant="danger">불수용 대상</Badge>}
        </span>
      ),
    },
    {
      key: "analysis",
      header: "AI 분석",
      width: 150,
      render: (row) => <AnalysisStatus row={row} />,
    },
    {
      key: "detail",
      header: "관리",
      align: "center",
      width: 70,
      render: (row) => {
        const action = isObjectionOpen(row.objectionStatus) ? "심사" : "상세"
        return (
          <Link
            to={`/admin/objections/${row.objectionId}`}
            aria-label={`이의제기 ${row.objectionId} ${action}`}
            className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {action}
          </Link>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-4 gap-3">
        <Stat label="접수" value={`${rows.length}건`} />
        <Stat label="심사 진행" value={`${openCount}건`} highlight />
        <Stat label="승인 대기" value={`${approvalCount}건`} />
        <Stat label="기한 임박" value={`${alertCount}건`} danger />
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

        {hasStaleRows && (
          <Alert variant="warning" className="mb-2">
            목록을 다시 받지 못했습니다. 아래는 마지막으로 받은 목록입니다.{" "}
            {toErrorMessage(error)}
          </Alert>
        )}
        {isQueueStalled && (
          <Alert variant="info" title="분석 대기가 길어짐" className="mb-2">
            <p>
              AI 분석이 1분 넘게 대기에서 시작되지 않아 자동 갱신을 멈췄습니다.
              분석 워커가 꺼져 있을 수 있습니다. 판정은 분석 없이도 할 수
              있습니다.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={recheck}
            >
              다시 확인
            </Button>
          </Alert>
        )}

        <DataGrid
          columns={columns}
          rows={pageRows}
          rowKey={(row) => String(row.objectionId)}
          loading={isPending}
          emptyMessage={
            isError
              ? (toErrorMessage(error) ?? "목록을 불러오지 못했습니다.")
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
          "지급정지 해제는 해제 요건 점검을 통과한 판정을 다른 관리자가 승인할 때만 이루어집니다.",
          "심사 기한은 소명 완비 확인일부터 5영업일입니다. 기한 하루 전부터 빨간색으로 표시됩니다.",
          "불수용 대상은 보완 기한까지 자료가 오지 않은 건입니다. 자동으로 확정하지 않습니다.",
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
  danger,
}: {
  label: string
  value: string
  highlight?: boolean
  danger?: boolean
}) => (
  <Panel className="px-4 py-3">
    <p className="text-xs font-bold text-ink-muted">{label}</p>
    <p
      className={
        danger
          ? "text-h2 font-bold text-danger"
          : highlight
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
const AnalysisStatus = ({ row }: { row: ObjectionSummary }) => {
  if (row.latestRunStatus == null) {
    return <span className="text-xs text-ink-faint">분석 없음</span>
  }
  if (row.latestRunStatus === "RUNNING") {
    return (
      <span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-primary">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">
          {row.latestRunLastStepTitle ?? "분석 중"}
        </span>
      </span>
    )
  }
  return (
    <Badge variant={RUN_STATUS_TONE[row.latestRunStatus] ?? "neutral"}>
      {labelOf(AGENT_RUN_STATUS_LABEL, row.latestRunStatus)}
    </Badge>
  )
}

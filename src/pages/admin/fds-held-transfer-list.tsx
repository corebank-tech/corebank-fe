import * as React from "react"
import { useNavigate } from "react-router"
import {
  FDS_HELD_TRANSFER_FIXTURES,
  formatWon,
  type FdsAgentStatus,
  type FdsHeldTransferView,
  type FdsPolicy,
} from "@/entities/fds"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Panel } from "@/shared/ui/panel"
import { Select } from "@/shared/ui/select"

type PolicyFilter = "ALL" | FdsPolicy
type StatusFilter = "ALL" | FdsAgentStatus

const agentStatusLabel: Record<FdsAgentStatus, string> = {
  PENDING: "조사 대기",
  RUNNING: "분석 중",
  COMPLETED: "판정 대기",
  FAILED: "조사 실패",
}

const riskVariant = (
  status: FdsHeldTransferView["riskStatus"],
): BadgeVariant =>
  status === "MATCH" ? "danger" : status === "NO_MATCH" ? "success" : "warning"

export const FdsHeldTransferList = () => {
  const navigate = useNavigate()
  const [policy, setPolicy] = React.useState<PolicyFilter>("ALL")
  const [status, setStatus] = React.useState<StatusFilter>("ALL")
  const [applied, setApplied] = React.useState<{
    policy: PolicyFilter
    status: StatusFilter
  }>({ policy: "ALL", status: "ALL" })

  const rows = FDS_HELD_TRANSFER_FIXTURES.filter(
    (item) =>
      (applied.policy === "ALL" || item.policy === applied.policy) &&
      (applied.status === "ALL" || item.agentStatus === applied.status),
  )

  const columns: DataGridColumn<FdsHeldTransferView>[] = [
    { key: "caseNo", header: "사건번호", render: (row) => row.caseNo },
    { key: "customer", header: "고객", render: (row) => row.customer },
    {
      key: "recipient",
      header: "수취인",
      render: (row) => (
        <span>
          {row.recipientName} · {row.recipientBankName}{" "}
          {row.recipientAccountNumber}
        </span>
      ),
    },
    {
      key: "amount",
      header: "요청금액",
      align: "right",
      render: (row) => formatWon(row.amount),
    },
    {
      key: "policy",
      header: "보류 정책",
      align: "center",
      render: (row) => <Badge variant="warning">정책 {row.policy}</Badge>,
    },
    {
      key: "agentStatus",
      header: "AI 조사",
      align: "center",
      render: (row) => (
        <Badge variant={row.agentStatus === "FAILED" ? "danger" : "success"}>
          {agentStatusLabel[row.agentStatus]}
        </Badge>
      ),
    },
    {
      key: "riskStatus",
      header: "위험 계좌",
      align: "center",
      render: (row) => (
        <Badge variant={riskVariant(row.riskStatus)}>{row.riskStatus}</Badge>
      ),
    },
    {
      key: "route",
      header: "처리 경로",
      render: (row) =>
        row.riskStatus === "MATCH" ? "무통화 거절" : "고객 확인 후 판정",
    },
    {
      key: "action",
      header: "처리",
      align: "center",
      render: (row) => (
        <Button
          size="sm"
          onClick={() => navigate(`/admin/fds/held-transfers/${row.id}`)}
        >
          상세
        </Button>
      ),
    },
  ]

  const counts = {
    pending: FDS_HELD_TRANSFER_FIXTURES.filter(
      (item) => item.agentStatus === "PENDING",
    ).length,
    running: FDS_HELD_TRANSFER_FIXTURES.filter(
      (item) => item.agentStatus === "RUNNING",
    ).length,
    decision: FDS_HELD_TRANSFER_FIXTURES.filter(
      (item) => item.agentStatus === "COMPLETED",
    ).length,
    failed: FDS_HELD_TRANSFER_FIXTURES.filter(
      (item) => item.agentStatus === "FAILED",
    ).length,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["심사 대기", counts.pending],
          ["AI 분석 중", counts.running],
          ["담당자 판정 대기", counts.decision],
          ["조사 실패", counts.failed],
        ].map(([label, value]) => (
          <Panel key={label} className="p-4">
            <p className="text-base font-bold text-ink">{label}</p>
            <p className="mt-2 text-h2 font-bold text-primary">{value}건</p>
          </Panel>
        ))}
      </div>

      <FormSection title="조회조건" className="mb-0">
        <div className="grid border-t border-border md:grid-cols-2">
          <FormRow label="보류 정책" htmlFor="fds-policy-filter">
            <Select
              id="fds-policy-filter"
              value={policy}
              onChange={(event) =>
                setPolicy(event.target.value as PolicyFilter)
              }
            >
              <option value="ALL">전체</option>
              <option value="A">정책 A</option>
              <option value="B">정책 B</option>
            </Select>
          </FormRow>
          <FormRow label="조사 상태" htmlFor="fds-status-filter">
            <Select
              id="fds-status-filter"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as StatusFilter)
              }
            >
              <option value="ALL">전체</option>
              <option value="PENDING">조사 대기</option>
              <option value="RUNNING">분석 중</option>
              <option value="COMPLETED">판정 대기</option>
              <option value="FAILED">조사 실패</option>
            </Select>
          </FormRow>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button onClick={() => setApplied({ policy, status })}>조회</Button>
          <Button
            variant="secondary"
            onClick={() => {
              setPolicy("ALL")
              setStatus("ALL")
              setApplied({ policy: "ALL", status: "ALL" })
            }}
          >
            초기화
          </Button>
        </div>
      </FormSection>

      <FormSection title="조회결과" className="mb-0">
        <DataGrid
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          emptyMessage="조건에 해당하는 FDS 보류 거래가 없습니다."
        />
      </FormSection>
    </div>
  )
}

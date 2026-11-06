import * as React from "react"
import {
  EXTERNAL_AGENCY_LABEL,
  EXTERNAL_CHECK_STATUS_LABEL,
  EXTERNAL_REPLY_LABEL,
  labelOf,
  useExternalChecks,
  useRequestExternalCheck,
  type ExternalCheck,
} from "@/entities/payment-stop"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatDateTime } from "@/shared/lib/format"
import { useIdempotencyKey } from "@/shared/lib/hooks/use-idempotency-key"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { Select } from "@/shared/ui/select"

type Agency = "POLICE" | "PEER_BANK"
type MockReply =
  "INVOLVEMENT_SUSPECTED" | "DOCUMENT_FORGED" | "OWNER_UNRELATED" | "NO_RECORD"

const AGENCIES: Agency[] = ["POLICE", "PEER_BANK"]
const MOCK_REPLIES: MockReply[] = [
  "INVOLVEMENT_SUSPECTED",
  "DOCUMENT_FORGED",
  "OWNER_UNRELATED",
  "NO_RECORD",
]

/** 해제를 막는 회신(G6 부정 회신). 색으로 방향을 가른다. */
const NEGATIVE_REPLIES = new Set(["INVOLVEMENT_SUSPECTED", "DOCUMENT_FORGED"])

const columns: DataGridColumn<ExternalCheck>[] = [
  {
    key: "agency",
    header: "기관",
    width: 120,
    render: (row) => labelOf(EXTERNAL_AGENCY_LABEL, row.agency),
  },
  {
    key: "status",
    header: "상태",
    align: "center",
    width: 90,
    render: (row) => labelOf(EXTERNAL_CHECK_STATUS_LABEL, row.status),
  },
  {
    key: "reply",
    header: "회신",
    render: (row) =>
      row.reply ? (
        <Badge variant={NEGATIVE_REPLIES.has(row.reply) ? "danger" : "neutral"}>
          {labelOf(EXTERNAL_REPLY_LABEL, row.reply)}
        </Badge>
      ) : (
        "-"
      ),
  },
  {
    key: "requestedAt",
    header: "요청 일시",
    align: "center",
    width: 170,
    render: (row) => (row.requestedAt ? formatDateTime(row.requestedAt) : "-"),
  },
  {
    key: "repliedAt",
    header: "회신 일시",
    align: "center",
    width: 170,
    render: (row) => (row.repliedAt ? formatDateTime(row.repliedAt) : "-"),
  },
]

type Props = {
  objectionId: number
  /** 상세 응답에 실린 목록. 별도 목록 응답이 오기 전에 보인다 */
  initialChecks: ExternalCheck[]
  /** 변경 권한. 없으면 요청 입력을 그리지 않는다 */
  canWrite: boolean
  /** 판정이 올라갔거나 확정됐으면 새 요청을 받지 않는다 */
  isClosed: boolean
}

/**
 * 외부 확인 요청(모의, 계획 PA-10). 수사기관과 관련 금융회사 회신은 실제 연동이 없어 담당자가
 * 회신을 골라 넣는다. 고른 회신은 해제 요건 점검의 외부 확인 회신 규칙에 들어간다.
 */
export const ExternalCheckPanel = ({
  objectionId,
  initialChecks,
  canWrite,
  isClosed,
}: Props) => {
  const { checks } = useExternalChecks(objectionId)
  const requestCheck = useRequestExternalCheck()
  const idempotency = useIdempotencyKey()
  const [agency, setAgency] = React.useState<Agency>("POLICE")
  const [reply, setReply] = React.useState<MockReply>("NO_RECORD")
  const [error, setError] = React.useState<string | null>(null)

  const rows = checks ?? initialChecks

  const handleRequest = () => {
    setError(null)
    const request = { agency, mockReply: reply }
    requestCheck.mutate(
      {
        objectionId,
        request,
        idempotencyKey: idempotency.keyFor({ objectionId, request }),
      },
      {
        onSuccess: () => idempotency.reset(),
        onError: (cause) => setError(toErrorMessage(cause)),
      },
    )
  }

  return (
    <Panel aria-label="외부 확인">
      <PanelHeader
        title="외부 확인"
        action={<Badge variant="warning">모의 회신</Badge>}
      />
      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        {canWrite && !isClosed && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-bold text-ink">
              요청 기관
              <Select
                aria-label="요청 기관"
                value={agency}
                onChange={(event) => setAgency(event.target.value as Agency)}
              >
                {AGENCIES.map((option) => (
                  <option key={option} value={option}>
                    {EXTERNAL_AGENCY_LABEL[option]}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold text-ink">
              모의 회신
              <Select
                aria-label="모의 회신"
                value={reply}
                onChange={(event) => setReply(event.target.value as MockReply)}
              >
                {MOCK_REPLIES.map((option) => (
                  <option key={option} value={option}>
                    {EXTERNAL_REPLY_LABEL[option]}
                  </option>
                ))}
              </Select>
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRequest}
              disabled={requestCheck.isPending}
            >
              외부 확인 요청
            </Button>
          </div>
        )}
        <p className="text-2xs text-ink-muted">
          실제 기관 연동이 없어 요청 즉시 고른 회신으로 끝납니다. 같은 기관에
          다시 요청하면 처음 회신을 그대로 보입니다. 가담 의심과 서류 위조
          회신은 수용과 일부 지급정지를 닫습니다.
        </p>
        {error && <Alert variant="danger">{error}</Alert>}
        <DataGrid
          columns={columns}
          rows={rows}
          rowKey={(row) => String(row.checkId)}
          emptyMessage="요청한 외부 확인이 없습니다."
        />
      </div>
    </Panel>
  )
}

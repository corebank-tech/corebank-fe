import {
  NOTICE_CHANNEL_LABEL,
  NOTICE_KIND_LABEL,
  NOTICE_TARGET_LABEL,
  labelOf,
  useObjectionNotices,
  type ObjectionNotice,
} from "@/entities/payment-stop"
import { formatDateTime } from "@/shared/lib/format"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"

const columns: DataGridColumn<ObjectionNotice>[] = [
  {
    key: "recordedAt",
    header: "기록 일시",
    align: "center",
    width: 170,
    render: (row) => (row.recordedAt ? formatDateTime(row.recordedAt) : "-"),
  },
  {
    key: "target",
    header: "대상",
    align: "center",
    width: 120,
    render: (row) => labelOf(NOTICE_TARGET_LABEL, row.target),
  },
  {
    key: "kind",
    header: "통지 종류",
    width: 150,
    render: (row) => labelOf(NOTICE_KIND_LABEL, row.kind),
  },
  {
    key: "channel",
    header: "수단",
    align: "center",
    width: 70,
    render: (row) => labelOf(NOTICE_CHANNEL_LABEL, row.channel),
  },
  {
    key: "basis",
    header: "근거",
    className: "whitespace-normal",
    render: (row) => <span className="text-ink-muted">{row.basis}</span>,
  },
]

/**
 * 통지 기록(D30). 접수, 보완 요청, 판정 확정 때 서버가 같은 트랜잭션에서 남긴다. 실제 발송은
 * 없고 기록만 있다. 최근 기록이 위로 오게 뒤집어 보인다.
 */
export const NoticeList = ({ objectionId }: { objectionId: number }) => {
  const { notices, isPending } = useObjectionNotices(objectionId)
  return (
    <div className="flex flex-col gap-2">
      <DataGrid
        columns={columns}
        rows={[...(notices ?? [])].reverse()}
        rowKey={(row) => String(row.noticeId)}
        loading={isPending}
        emptyMessage="남긴 통지 기록이 없습니다."
      />
      <p className="text-2xs text-ink-faint">
        실제 문자와 서면 발송은 하지 않고 통지 기록만 남깁니다.
      </p>
    </div>
  )
}

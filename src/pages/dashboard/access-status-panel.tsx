import type { AccessStatus } from "@/entities/dashboard"
import { formatDateTime } from "@/shared/lib/format"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { LabelValueRow } from "@/shared/ui/label-value-row"

type AccessStatusPanelProps = {
  status: AccessStatus
}

/** 우측 접속현황 패널: primary 헤더 + label/value 3행. */
export const AccessStatusPanel = ({ status }: AccessStatusPanelProps) => {
  const rows: { label: string; value: string }[] = [
    { label: "최근 접속일시", value: formatDateTime(status.lastLogin) },
    { label: "현재 접속 IP", value: status.ip },
    { label: "최근 거래일시", value: formatDateTime(status.lastTransaction) },
  ]

  return (
    <Panel aria-label="접속현황">
      <PanelHeader title="접속현황" className="bg-surface-2" />
      {rows.map((row, i) => (
        <LabelValueRow
          key={row.label}
          label={row.label}
          value={row.value}
          className={i > 0 ? "border-t border-border" : undefined}
        />
      ))}
      <p className="border-t border-border px-4 py-2 text-2xs text-ink-faint">
        ※ 본인이 아닌 접속 기록이 있으면 즉시 비밀번호를 변경해 주세요.
      </p>
    </Panel>
  )
}

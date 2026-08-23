import type { LoginStatusResponse } from "@/entities/dashboard"
import { formatDateTime } from "@/shared/lib/format"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Skeleton } from "@/shared/ui/skeleton"

type AccessStatusPanelProps = {
  status?: LoginStatusResponse
  isLoading?: boolean
  isError?: boolean
}

/** 이력이 없으면 서버가 null 을 준다(최초 로그인·거래 이력 없음). */
const NO_HISTORY = "-"

const formatOptionalDateTime = (value: string | null | undefined) =>
  value ? formatDateTime(value) : NO_HISTORY

/**
 * 우측 접속현황 패널: primary 헤더 + label/value 3행.
 * 로딩·조회 실패에도 라벨 3행은 유지한다 — 골격이 사라지면 화면에서 항목 자체가
 * 없어진 것처럼 보인다.
 */
export const AccessStatusPanel = ({
  status,
  isLoading = false,
  isError = false,
}: AccessStatusPanelProps) => {
  const values = [
    formatOptionalDateTime(status?.previousLoginAt),
    status?.currentLoginIp ?? NO_HISTORY,
    formatOptionalDateTime(status?.lastTransactionAt),
  ]
  const labels = ["최근 접속일시", "현재 접속 IP", "최근 거래일시"]

  const renderValue = (value: string) => {
    if (isLoading) return <Skeleton className="h-4 w-24" />
    if (isError) return <span className="text-ink-faint">조회 실패</span>
    return value
  }

  return (
    <Panel aria-label="접속현황">
      <PanelHeader title="접속현황" className="bg-surface-2" />
      {labels.map((label, i) => (
        <LabelValueRow
          key={label}
          label={label}
          value={renderValue(values[i])}
          className={i > 0 ? "border-t border-border" : undefined}
        />
      ))}
      <p className="border-t border-border px-4 py-2 text-2xs text-ink-faint">
        ※ 본인이 아닌 접속 기록이 있으면 즉시 비밀번호를 변경해 주세요.
      </p>
    </Panel>
  )
}

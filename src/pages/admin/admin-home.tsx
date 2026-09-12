import { useSession } from "@/features/session"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { NoticeBox } from "@/shared/ui/notice-box"
import { Panel, PanelHeader } from "@/shared/ui/panel"

/**
 * 관리자 홈. 지금은 세션의 역할·권한을 보여주는 것이 전부다 —
 * 조회·변경 화면은 서버 API 확정 후 #128~#132 에서 붙는다.
 */
export const AdminHome = () => {
  const { customerName, role, canModify } = useSession()

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="세션" />
        <LabelValueRow label="계정" value={customerName || "-"} />
        <LabelValueRow label="역할" value={role} />
        <LabelValueRow
          label="권한"
          value={canModify ? "조회 + 변경" : "조회 전용"}
        />
      </Panel>

      <NoticeBox
        items={[
          "관리자 조회·변경 화면은 서버 API 확정 후 순차적으로 추가됩니다.",
          "변경 권한이 없는 계정에는 변경 메뉴와 버튼이 표시되지 않습니다.",
        ]}
      />
    </div>
  )
}

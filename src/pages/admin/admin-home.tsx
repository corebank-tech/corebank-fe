import { ADMIN_PERMISSION_LABELS, hasAnyWritePermission } from "@/entities/auth"
import { useSession } from "@/features/session"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { NoticeBox } from "@/shared/ui/notice-box"
import { Panel, PanelHeader } from "@/shared/ui/panel"

/**
 * 관리자 홈. 지금은 세션의 역할·권한을 보여주는 것이 전부다 —
 * 조회·변경 화면은 서버 API 확정 후 #128~#132 에서 붙는다.
 *
 * 권한을 **목록 그대로** 보여준다. "조회 전용 / 변경 가능" 한 줄로 요약하면
 * 어느 기능에 대한 권한인지가 사라져, 메뉴가 왜 안 보이는지 설명되지 않는다.
 *
 * 권한 한글 표기는 `entities/auth` 로 옮겼다 — 권한 부족 안내(`AdminForbidden`)가
 * 같은 표기를 쓰게 되면서 두 벌이 될 자리였다.
 */

export const AdminHome = () => {
  const { customerName, role, permissions } = useSession()

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <PanelHeader title="세션" />
        <LabelValueRow label="계정" value={customerName || "-"} />
        <LabelValueRow label="역할" value={role} />
        <LabelValueRow
          label="권한"
          value={
            permissions.length > 0
              ? permissions
                  .map(
                    (permission) =>
                      `${ADMIN_PERMISSION_LABELS[permission]}(${permission})`,
                  )
                  .join(" · ")
              : "부여된 권한 없음"
          }
        />
        <LabelValueRow
          label="변경 권한"
          value={
            hasAnyWritePermission(permissions) ? "있음" : "없음 (조회 전용)"
          }
        />
      </Panel>

      <NoticeBox
        items={[
          "관리자 조회·변경 화면은 서버 API 확정 후 순차적으로 추가됩니다.",
          "권한이 없는 기능은 메뉴와 버튼이 표시되지 않습니다.",
        ]}
      />
    </div>
  )
}

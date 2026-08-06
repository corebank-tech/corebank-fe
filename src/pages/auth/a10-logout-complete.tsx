import * as React from "react"
import { useNavigate } from "react-router"
import { Button } from "@/shared/ui/button"
import { ResultPanel } from "@/widgets/transfer"
import type { DataGridColumn } from "@/shared/ui/data-grid"
import { formatDateTime } from "@/shared/lib/format"

type LogoutRow = {
  loggedOutAt: string
}

const COLUMNS: DataGridColumn<LogoutRow>[] = [
  { key: "loggedOutAt", header: "로그아웃 일시", align: "center" },
]

/** A-10 로그아웃 완료. REQ-AUTH-028. */
export const A10LogoutComplete = () => {
  const navigate = useNavigate()
  const loggedOutAt = React.useMemo(() => formatDateTime(new Date()), [])

  return (
    <ResultPanel<LogoutRow>
      variant="success"
      message="로그아웃 되었습니다."
      description="보안을 위해 다시 로그인하기 전까지는 인증이 필요한 화면에 접근할 수 없습니다."
      columns={COLUMNS}
      row={{ loggedOutAt }}
      actions={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-35"
            onClick={() => navigate("/dashboard")}
          >
            메인으로
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-35"
            onClick={() => navigate("/")}
          >
            다시 로그인
          </Button>
        </>
      }
    />
  )
}

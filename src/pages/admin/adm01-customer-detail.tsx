import * as React from "react"
import { Link, useNavigate, useParams } from "react-router"
import { hasPermission } from "@/entities/auth"
import { useSession } from "@/features/session"
import {
  findAdminCustomer,
  updateAdminCustomer,
  type AdminCustomer,
} from "@/entities/admin-customer"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { EmptyState } from "@/shared/ui/empty-state"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Modal } from "@/shared/ui/modal"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { Panel, PanelHeader } from "@/shared/ui/panel"
import {
  formatDate,
  formatDateTime,
  maskBirthDate,
  maskEmail,
  maskName,
  maskPhone,
  maskUserId,
} from "@/shared/lib/format"
import { LOGIN_MAX_ATTEMPTS } from "@/shared/config/policy"

/**
 * ADM-01 관리자 고객 계정 운영 — 상세와 변경 액션.
 *
 * 변경 액션은 **확인 → 실행 → 결과** 3단이다. 이체 플로우의 `StepLayout`+`ResultPanel`
 * (화면을 넘기는 3단)을 쓰지 않는다 — 계정 운영은 이 화면에 머문 채 끝나므로, 화면을
 * 넘기면 방금 무엇을 누구에게 했는지 대상 정보와 함께 볼 수 없다.
 *
 * 비밀번호 초기화만 결과를 모달로 띄운다. 임시 비밀번호는 1회만 표시되고 메일 발송이
 * 없어, 인라인 알림에 섞으면 스크롤로 사라진다.
 *
 * 개인정보는 전부 마스킹해 표시한다. 관리자가 대상을 특정하는 수단은 목록의 검색
 * 조건이지 상세에 찍힌 원본 값이 아니다.
 */

/** 실행할 변경 액션. `null` 이면 확인 다이얼로그가 닫힌 상태다. */
type PendingAction = "unlock" | "resetPassword" | "toggleStatus" | null

type ActionResult = {
  variant: "success" | "info"
  message: string
}

const ACTION_TITLE: Record<Exclude<PendingAction, null>, string> = {
  unlock: "계정 잠금 해제",
  resetPassword: "로그인 비밀번호 초기화",
  toggleStatus: "계정 상태 변경",
}

/**
 * 목업 임시 비밀번호. 실제 발급은 서버(PH-97)가 하고 응답으로 1회 돌려준다 —
 * 화면은 받은 값을 보여줄 뿐이라 생성 규칙을 흉내만 낸다.
 */
const issueTemporaryPassword = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const picked = Array.from(
    { length: 10 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("")
  // 서버 비밀번호 규칙(영문·숫자·특수문자)을 만족하는 모양으로 끝을 고정한다.
  return `${picked}!1`
}

export const Adm01CustomerDetail = () => {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { permissions } = useSession()
  // 기능 단위로 묻는다. "변경 권한이 있는가"로 물으면 `GL_WRITE` 만 가진
  // 회계 관리자에게 고객 정지 버튼이 열린다.
  const canOperateCustomer = hasPermission(permissions, "CUSTOMER_WRITE")

  const parsedId = Number(customerId)
  const [customer, setCustomer] = React.useState<AdminCustomer | undefined>(
    () =>
      Number.isInteger(parsedId) ? findAdminCustomer(parsedId) : undefined,
  )
  const [pendingAction, setPendingAction] = React.useState<PendingAction>(null)
  const [result, setResult] = React.useState<ActionResult | null>(null)
  const [temporaryPassword, setTemporaryPassword] = React.useState<
    string | null
  >(null)

  if (!customer) {
    return (
      <Panel>
        <EmptyState
          message="고객을 찾을 수 없습니다"
          description="목록에서 다시 선택해 주세요."
          action={
            <Button onClick={() => navigate("/admin/customers")}>
              고객 목록으로
            </Button>
          }
        />
      </Panel>
    )
  }

  const isSuspended = customer.status === "SUSPENDED"

  /** 확인 다이얼로그에 띄우는 "무엇이 어떻게 바뀌는지". 액션마다 다르다. */
  const confirmItems = (() => {
    if (pendingAction == null) return []
    const target = [
      { label: "대상 아이디", value: maskUserId(customer.userId) },
      { label: "대상 성명", value: maskName(customer.userName) },
    ]
    if (pendingAction === "unlock") {
      return [
        ...target,
        { label: "현재", value: `잠김 (실패 ${customer.loginFailureCount}회)` },
        { label: "변경 후", value: "잠금 해제 · 실패 횟수 0회" },
      ]
    }
    if (pendingAction === "resetPassword") {
      return [
        ...target,
        { label: "처리", value: "임시 비밀번호 발급" },
        {
          label: "안내",
          value: "발급된 비밀번호는 이 화면에서 1회만 표시됩니다",
        },
      ]
    }
    return [
      ...target,
      { label: "현재", value: isSuspended ? "정지" : "정상" },
      { label: "변경 후", value: isSuspended ? "정상" : "정지" },
    ]
  })()

  const handleConfirm = () => {
    const action = pendingAction
    setPendingAction(null)
    if (action == null) return

    if (action === "unlock") {
      // REQ-AUTH-035: 잠금을 해제하면 로그인 실패 횟수를 0으로 초기화한다.
      const updated = updateAdminCustomer(customer.customerId, {
        accountLocked: false,
        loginFailureCount: 0,
      })
      setCustomer(updated)
      setResult({
        variant: "success",
        message:
          "계정 잠금을 해제했습니다. 로그인 실패 횟수도 0으로 초기화됐습니다.",
      })
      return
    }

    if (action === "resetPassword") {
      setTemporaryPassword(issueTemporaryPassword())
      return
    }

    const nextStatus = isSuspended ? "ACTIVE" : "SUSPENDED"
    const updated = updateAdminCustomer(customer.customerId, {
      status: nextStatus,
    })
    setCustomer(updated)
    setResult({
      variant: "success",
      message:
        nextStatus === "SUSPENDED"
          ? "계정을 정지 상태로 변경했습니다. 이 계정은 로그인할 수 없습니다."
          : "계정을 정상 상태로 변경했습니다.",
    })
  }

  const handleCloseTemporaryPassword = () => {
    setTemporaryPassword(null)
    setResult({
      variant: "info",
      message:
        "임시 비밀번호를 발급했습니다. 값은 다시 표시되지 않으며, 고객이 로그인 후 변경해야 합니다.",
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          to="/admin/customers"
          className="text-base text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          ← 고객 목록
        </Link>
      </div>

      {result != null && (
        <Alert variant={result.variant}>{result.message}</Alert>
      )}

      <Panel>
        <PanelHeader
          title="계정 정보"
          action={
            <span className="inline-flex gap-1">
              <Badge variant={isSuspended ? "danger" : "success"}>
                {isSuspended ? "정지" : "정상"}
              </Badge>
              {customer.accountLocked && <Badge variant="warning">잠김</Badge>}
            </span>
          }
        />
        <LabelValueRow label="아이디" value={maskUserId(customer.userId)} />
        <LabelValueRow label="성명" value={maskName(customer.userName)} />
        <LabelValueRow
          label="생년월일"
          value={maskBirthDate(customer.birthDate)}
        />
        <LabelValueRow label="이메일" value={maskEmail(customer.email)} />
        <LabelValueRow label="연락처" value={maskPhone(customer.phoneNumber)} />
        <LabelValueRow
          label="로그인 실패"
          value={
            <span
              className={
                customer.loginFailureCount > 0 ? "text-danger" : undefined
              }
            >
              {customer.loginFailureCount}/{LOGIN_MAX_ATTEMPTS}회
            </span>
          }
        />
        <LabelValueRow
          label="최근 로그인"
          value={
            customer.lastLoginAt
              ? formatDateTime(customer.lastLoginAt)
              : "이력 없음"
          }
        />
        <LabelValueRow label="가입일" value={formatDate(customer.joinedAt)} />
      </Panel>

      {/* 직무분리(PH-49). 변경 권한이 없으면 버튼을 그리지 않는다 — 눌러서 서버
          거부를 받는 건 이미 늦다. 왜 없는지는 설명해 둔다. */}
      {canOperateCustomer ? (
        <Panel>
          <PanelHeader title="계정 운영" />
          <div className="flex flex-wrap gap-2 px-4 pt-1 pb-4">
            <Button
              variant="secondary"
              disabled={!customer.accountLocked}
              onClick={() => setPendingAction("unlock")}
            >
              잠금 해제
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPendingAction("resetPassword")}
            >
              비밀번호 초기화
            </Button>
            <Button
              variant="secondary"
              onClick={() => setPendingAction("toggleStatus")}
            >
              {isSuspended ? "정지 해제" : "계정 정지"}
            </Button>
          </div>
          {!customer.accountLocked && (
            <p className="px-4 pb-4 text-2xs text-ink-muted">
              ※ 잠기지 않은 계정은 잠금 해제를 할 수 없습니다.
            </p>
          )}
        </Panel>
      ) : (
        <Alert variant="info" title="조회 전용 권한">
          계정 운영(잠금 해제 · 비밀번호 초기화 · 상태 변경)은 변경 권한이 있는
          관리자만 수행할 수 있습니다.
        </Alert>
      )}

      <NoticeBoxFooter
        items={[
          "계정 잠금 해제 시 로그인 실패 횟수가 0으로 초기화됩니다(REQ-AUTH-035).",
          "임시 비밀번호는 발급 직후 1회만 표시되며 메일로 발송되지 않습니다. 고객에게 안전한 경로로 전달하세요.",
          "계정 정지는 로그인 자체를 차단합니다. 잠금(로그인 실패 누적)과는 다른 상태입니다.",
          "서버 API 연동 전이라 현재 변경은 화면 안에서만 유지되며 새로고침하면 처음 상태로 돌아갑니다.",
        ]}
      />

      <ConfirmDialog
        open={pendingAction != null}
        onClose={() => setPendingAction(null)}
        onConfirm={handleConfirm}
        title={pendingAction ? ACTION_TITLE[pendingAction] : "확인"}
        messages={["아래 내용을 확인합니다.", "확인을 누르면 즉시 반영됩니다."]}
        items={confirmItems}
      />

      <Modal
        open={temporaryPassword != null}
        onClose={handleCloseTemporaryPassword}
        title="임시 비밀번호 발급 완료"
        size="sm"
        footer={
          <Button
            size="lg"
            className="min-w-30"
            onClick={handleCloseTemporaryPassword}
          >
            확인
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-base text-ink">
            {maskName(customer.userName)} 님의 임시 비밀번호입니다.
          </p>
          <p className="rounded-md border border-border bg-surface-2 px-4 py-3 text-center text-h2 font-bold text-ink">
            {temporaryPassword}
          </p>
          <Alert variant="warning">
            이 창을 닫으면 다시 확인할 수 없습니다. 고객에게 전달한 뒤 로그인 후
            변경하도록 안내하세요.
          </Alert>
        </div>
      </Modal>
    </div>
  )
}

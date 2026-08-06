import * as React from "react"
import { Button } from "@/shared/ui/button"
import { FormSection } from "@/shared/ui/form-section"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { OtpModal } from "@/entities/auth"
import { LimitModal } from "@/entities/transfer"
import { SessionExpiredModal } from "@/entities/auth"
import { MOCK_TRANSFER_LIMITS } from "@/entities/transfer"

type OpenModal = "confirm" | "error" | "otp" | "limit" | "session" | null

/** Trigger board for the shared modal family (A-91 ~ A-93, D-05, A-11). */
export const ModalFamilyGallery = () => {
  const [open, setOpen] = React.useState<OpenModal>(null)
  const [otpDone, setOtpDone] = React.useState<string | null>(null)
  const close = () => setOpen(null)

  const dailyRemaining =
    MOCK_TRANSFER_LIMITS.perDay - MOCK_TRANSFER_LIMITS.usedToday

  return (
    <div>
      <FormSection title="공통 모달">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => setOpen("confirm")}>
            확인 다이얼로그 (A-91)
          </Button>
          <Button variant="danger" onClick={() => setOpen("error")}>
            오류 다이얼로그 (A-92)
          </Button>
          <Button variant="outline" onClick={() => setOpen("otp")}>
            OTP 인증 (A-93)
          </Button>
          <Button variant="outline" onClick={() => setOpen("limit")}>
            이체한도 조회 (D-05)
          </Button>
          <Button variant="secondary" onClick={() => setOpen("session")}>
            세션 만료 (A-11)
          </Button>
        </div>
        {otpDone && (
          <p className="mt-3 text-base font-bold text-success">
            OTP 인증이 완료되었습니다. (입력값 {otpDone})
          </p>
        )}
      </FormSection>

      <ConfirmDialog
        open={open === "confirm"}
        onClose={close}
        onConfirm={close}
        items={[
          { label: "이체예정일시", value: "2026.07.23 08:57:34" },
          { label: "출금계좌", value: "자유입출금 110-632-892336" },
          { label: "입금계좌", value: "333-330-730135" },
          { label: "받는분", value: "김민수" },
          { label: "이체금액", value: "500,000원" },
          { label: "수수료", value: "면제" },
        ]}
      />

      <ErrorDialog
        open={open === "error"}
        onClose={close}
        messages={[
          "출금계좌의 잔액이 부족해 이체를 처리하지 못했습니다.",
          "잔액을 확인한 뒤 다시 시도하세요.",
        ]}
        code="E-40312"
      />

      <OtpModal
        open={open === "otp"}
        onClose={close}
        onConfirm={(code) => {
          setOtpDone(code)
          close()
        }}
      />

      <LimitModal
        open={open === "limit"}
        onClose={close}
        perDay={MOCK_TRANSFER_LIMITS.perDay}
        perTransfer={MOCK_TRANSFER_LIMITS.perTransfer}
        dailyRemaining={dailyRemaining}
        onChangeLimit={close}
      />

      <SessionExpiredModal open={open === "session"} onRelogin={close} />
    </div>
  )
}

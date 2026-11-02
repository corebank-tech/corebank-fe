import { formatAmount } from "@/shared/lib/format"
import {
  TRANSFER_LIMIT_PER_DAY_MAX as PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX as PER_TRANSFER_MAX,
} from "@/shared/config/policy"

/** 계좌비밀번호는 숫자 4자리다. */
export const ACCOUNT_PASSWORD_LENGTH = 4

export type LimitChangeDraft = {
  oneTimeLimit: number
  dailyLimit: number
  accountNo: string
  accountPassword: string
}

export type LimitChangeDraftValidation =
  { ok: true } | { ok: false; reason: string }

/**
 * 한도 변경 입력 검증(REQ-TRSF-025). 상한은 POL-015·016 에서 온다.
 * 1회 한도는 1일 한도를 초과할 수 없다.
 *
 * 계좌와 계좌비밀번호도 함께 본다 — 변경은 계좌비밀번호 확인을 거치므로
 * 둘이 없으면 인증을 시작할 수 없다(서버 `api_conventions.md` §8-2).
 */
export const validateLimitChangeDraft = ({
  oneTimeLimit,
  dailyLimit,
  accountNo,
  accountPassword,
}: LimitChangeDraft): LimitChangeDraftValidation => {
  if (oneTimeLimit <= 0) {
    return { ok: false, reason: "1회 이체한도를 입력하세요." }
  }
  if (dailyLimit <= 0) {
    return { ok: false, reason: "1일 이체한도를 입력하세요." }
  }
  if (oneTimeLimit > PER_TRANSFER_MAX) {
    return {
      ok: false,
      reason: `1회 이체한도는 최대 ${formatAmount(PER_TRANSFER_MAX)}까지 변경할 수 있습니다.`,
    }
  }
  if (dailyLimit > PER_DAY_MAX) {
    return {
      ok: false,
      reason: `1일 이체한도는 최대 ${formatAmount(PER_DAY_MAX)}까지 변경할 수 있습니다.`,
    }
  }
  if (oneTimeLimit > dailyLimit) {
    return {
      ok: false,
      reason: "1회 이체한도는 1일 이체한도를 초과할 수 없습니다.",
    }
  }
  if (!accountNo) {
    return { ok: false, reason: "계좌비밀번호를 확인할 계좌를 선택하세요." }
  }
  if (accountPassword.length !== ACCOUNT_PASSWORD_LENGTH) {
    return {
      ok: false,
      reason: `계좌비밀번호 ${ACCOUNT_PASSWORD_LENGTH}자리를 입력하세요.`,
    }
  }
  return { ok: true }
}

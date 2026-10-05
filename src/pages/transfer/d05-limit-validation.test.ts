import { describe, expect, it } from "vitest"
import {
  ACCOUNT_PASSWORD_LENGTH,
  validateLimitChangeDraft,
  type LimitChangeDraft,
} from "@/pages/transfer/d05-limit-validation"
import {
  TRANSFER_LIMIT_PER_DAY_MAX as PER_DAY_MAX,
  TRANSFER_LIMIT_PER_TRANSFER_MAX as PER_TRANSFER_MAX,
} from "@/shared/config/policy"

const VALID: LimitChangeDraft = {
  oneTimeLimit: 3_000_000,
  dailyLimit: 7_000_000,
  accountNo: "088100000010",
  accountPassword: "1234",
}

const reasonOf = (draft: Partial<LimitChangeDraft>): string => {
  const result = validateLimitChangeDraft({ ...VALID, ...draft })
  if (result.ok) throw new Error("검증이 통과해버렸다")
  return result.reason
}

describe("validateLimitChangeDraft", () => {
  it("상한 이내이고 계좌·비밀번호가 있으면 통과한다", () => {
    expect(validateLimitChangeDraft(VALID)).toEqual({ ok: true })
  })

  it("한도를 비우면 입력을 요구한다", () => {
    expect(reasonOf({ oneTimeLimit: 0 })).toBe("1회 이체한도를 입력하세요.")
    expect(reasonOf({ dailyLimit: 0 })).toBe("1일 이체한도를 입력하세요.")
  })

  it("POL-015·016 상한을 넘으면 거부한다", () => {
    expect(reasonOf({ oneTimeLimit: PER_TRANSFER_MAX + 1 })).toContain(
      "1회 이체한도는 최대",
    )
    // 1회 한도는 상한 이내로 둔다 — 넘기면 1회 한도 검사에 먼저 걸린다.
    expect(
      reasonOf({ oneTimeLimit: 1_000_000, dailyLimit: PER_DAY_MAX + 1 }),
    ).toContain("1일 이체한도는 최대")
  })

  it("상한과 같은 값은 통과한다", () => {
    expect(
      validateLimitChangeDraft({
        ...VALID,
        oneTimeLimit: PER_TRANSFER_MAX,
        dailyLimit: PER_DAY_MAX,
      }),
    ).toEqual({ ok: true })
  })

  it("1회 한도가 1일 한도를 넘으면 거부한다", () => {
    expect(reasonOf({ oneTimeLimit: 8_000_000, dailyLimit: 7_000_000 })).toBe(
      "1회 이체한도는 1일 이체한도를 초과할 수 없습니다.",
    )
  })

  it("1회 한도와 1일 한도가 같으면 통과한다", () => {
    expect(
      validateLimitChangeDraft({
        ...VALID,
        oneTimeLimit: 7_000_000,
        dailyLimit: 7_000_000,
      }),
    ).toEqual({ ok: true })
  })

  it("인증할 계좌를 고르지 않으면 거부한다", () => {
    expect(reasonOf({ accountNo: "" })).toBe(
      "계좌비밀번호를 확인할 계좌를 선택하세요.",
    )
  })

  it(`계좌비밀번호가 ${ACCOUNT_PASSWORD_LENGTH}자리가 아니면 거부한다`, () => {
    expect(reasonOf({ accountPassword: "123" })).toContain("계좌비밀번호")
    expect(reasonOf({ accountPassword: "" })).toContain("계좌비밀번호")
  })

  it("한도 검증을 계좌·비밀번호보다 먼저 본다", () => {
    expect(reasonOf({ oneTimeLimit: 0, accountNo: "" })).toBe(
      "1회 이체한도를 입력하세요.",
    )
  })
})

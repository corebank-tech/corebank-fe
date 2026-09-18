import { describe, expect, it } from "vitest"
import { MOCK_MEMBERS } from "@/entities/auth"
import { MOCK_ADMIN_CUSTOMERS } from "@/entities/admin-customer/api/adm01-customers"

/**
 * 관리자 목 고객과 로그인 계정(`MOCK_MEMBERS`)의 대응을 잠근다.
 *
 * `adm01-customers.ts` 주석이 "아이디·성명은 같은 값을 써서 로그인 계정과의
 * 대응이 보이게 한다"고 선언하는데, **주석은 장치가 아니다.** 두 파일은 서로를
 * import 하지 않아서 한쪽만 고쳐도 아무것도 깨지지 않는다 — 관리자 화면에서
 * `honggildong` 을 찾아 잠금을 풀어도 실제로 로그인하는 계정과 다른 사람이 된다.
 *
 * `entities/auth` 를 넘어 import 하는 것은 이 파일이 **테스트**이기 때문이다.
 * 런타임 코드에서 슬라이스를 가로지르지는 않는다(`.claude/conventions.md` FSD-lite).
 */

/** `1990-01-01` → `900101`. `MOCK_MEMBERS.birth` 의 YYMMDD 표기와 맞춘다. */
const toYyMmDd = (isoDate: string): string =>
  `${isoDate.slice(2, 4)}${isoDate.slice(5, 7)}${isoDate.slice(8, 10)}`

describe("MOCK_ADMIN_CUSTOMERS ↔ MOCK_MEMBERS 대응", () => {
  it.each(MOCK_MEMBERS.map((member) => [member.memberId, member] as const))(
    "%s 는 같은 성명·생년월일로 관리자 목록에 있다",
    (_memberId, member) => {
      const found = MOCK_ADMIN_CUSTOMERS.find(
        (customer) => customer.userId === member.memberId,
      )

      expect(found).toBeDefined()
      expect(found?.userName).toBe(member.ownerName)
      expect(found && toYyMmDd(found.birthDate)).toBe(member.birth)
    },
  )

  it("아이디가 중복되지 않는다", () => {
    const ids = MOCK_ADMIN_CUSTOMERS.map((customer) => customer.userId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("customerId 가 중복되지 않는다", () => {
    const ids = MOCK_ADMIN_CUSTOMERS.map((customer) => customer.customerId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

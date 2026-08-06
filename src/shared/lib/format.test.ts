import { describe, expect, it } from "vitest"
import {
  formatAccountNo,
  maskAccountNo,
  maskEmail,
  maskName,
} from "@/shared/lib/format"

describe("maskName", () => {
  it("성명 가운데 1자를 마스킹한다 (REQ-CMN-018)", () => {
    expect(maskName("홍길동")).toBe("홍*동")
  })

  it("4자 이상 성명도 가운데 1자만 마스킹한다", () => {
    expect(maskName("남궁민수")).toBe("남궁*수")
  })

  it("2자 성명은 마지막 글자를 마스킹한다", () => {
    expect(maskName("김철")).toBe("김*")
  })
})

describe("maskEmail", () => {
  it("로컬파트 4번째 문자 이후를 마스킹한다 (REQ-CMN-018)", () => {
    expect(maskEmail("abcdef@example.com")).toBe("abc***@example.com")
  })

  it("로컬파트가 3자 이하이면 마스킹하지 않는다", () => {
    expect(maskEmail("abc@example.com")).toBe("abc@example.com")
  })
})

describe("계좌번호 표시 (REQ-CMN-017 / REQ-INQR-015)", () => {
  it("화면 표시는 하이픈 포함 전체 12자리를 마스킹 없이 보여준다", () => {
    expect(formatAccountNo("110632892336")).toBe("110-632-892336")
  })

  it("CSV 저장 전용 마스킹만 뒷자리를 가린다", () => {
    expect(maskAccountNo("110632892336")).toBe("110-632-89****")
  })
})

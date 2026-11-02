import { describe, expect, it } from "vitest"
import {
  formatAccountLabel,
  formatAccountNo,
  formatSessionClock,
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

  it("서버가 이미 마스킹해 내려준 값은 다시 가공하지 않는다", () => {
    expect(formatAccountNo("110******877")).toBe("110******877")
    expect(maskAccountNo("110******877")).toBe("110******877")
  })
})

describe("formatAccountLabel", () => {
  it("별칭이 있으면 계좌번호 앞에 붙인다", () => {
    expect(formatAccountLabel("자유입출금", "110-220-093412")).toBe(
      "자유입출금 110-220-093412",
    )
  })

  it("구분자를 지정할 수 있다", () => {
    expect(formatAccountLabel("자유입출금", "110-220-093412", " / ")).toBe(
      "자유입출금 / 110-220-093412",
    )
  })

  // 서버는 별칭 미설정 건에 값을 안 내려준다. 그대로 보간하면 구분자만 남는다.
  it("별칭이 없으면 계좌번호만 남기고 구분자를 붙이지 않는다", () => {
    expect(formatAccountLabel(undefined, "110-220-093412", " / ")).toBe(
      "110-220-093412",
    )
  })

  it("별칭이 빈 문자열이어도 미설정으로 본다", () => {
    expect(formatAccountLabel("", "110-220-093412", " / ")).toBe(
      "110-220-093412",
    )
  })
})

describe("formatSessionClock", () => {
  it("mm:ss 로 0 을 채워 그린다", () => {
    expect(formatSessionClock(600)).toBe("10:00")
    expect(formatSessionClock(65)).toBe("01:05")
    expect(formatSessionClock(9)).toBe("00:09")
  })

  it("0 이면 00:00 이다", () => {
    expect(formatSessionClock(0)).toBe("00:00")
  })

  it("음수는 00:00 으로 접는다", () => {
    // 만료 판정과 타이머 갱신 사이 한 틱 동안 음수가 나올 수 있다.
    // 접지 않으면 헤더에 "-1:-1" 같은 값이 그려진다.
    expect(formatSessionClock(-1)).toBe("00:00")
    expect(formatSessionClock(-120)).toBe("00:00")
  })
})

/**
 * 아이디·비밀번호 규칙 실시간 판정. POL-009(아이디), POL-010(비밀번호), POL-011(금칙).
 * A-04 정보입력과 A-08 비밀번호 재설정이 동일 규칙을 공유한다(REQ-AUTH-033 인수기준).
 */

export type RuleCheck = {
  key: string
  label: string
  passed: boolean
}

/** POL-009: 영문 소문자 시작 + 영문/숫자 6~16자. 특수문자·공백·한글 불가. */
export function evaluateIdRules(id: string): RuleCheck[] {
  return [
    {
      key: "start",
      label: "영문 소문자로 시작합니다",
      passed: /^[a-z]/.test(id),
    },
    {
      key: "charset",
      label: "영문 소문자·숫자만 사용합니다(특수문자·공백·한글 불가)",
      passed: id.length > 0 && /^[a-z0-9]+$/.test(id),
    },
    {
      key: "length",
      label: "6~16자로 입력합니다",
      passed: id.length >= 6 && id.length <= 16,
    },
  ]
}

export function isIdValid(id: string): boolean {
  return evaluateIdRules(id).every((r) => r.passed)
}

function hasFourRepeating(value: string): boolean {
  for (let i = 0; i <= value.length - 4; i++) {
    if (
      value[i] === value[i + 1] &&
      value[i] === value[i + 2] &&
      value[i] === value[i + 3]
    ) {
      return true
    }
  }
  return false
}

function hasFourSequential(value: string): boolean {
  for (let i = 0; i <= value.length - 4; i++) {
    const a = value.charCodeAt(i)
    const b = value.charCodeAt(i + 1)
    const c = value.charCodeAt(i + 2)
    const d = value.charCodeAt(i + 3)
    const ascending = b - a === 1 && c - b === 1 && d - c === 1
    const descending = a - b === 1 && b - c === 1 && c - d === 1
    if (ascending || descending) return true
  }
  return false
}

/** POL-010·POL-011: 8~15자 / 4종 중 3종 이상 / 아이디 미포함 / 동일문자·연속증감 4자리 금지. */
export function evaluatePasswordRules(
  password: string,
  id: string,
): RuleCheck[] {
  const kinds = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length

  return [
    {
      key: "length",
      label: "8~15자로 입력합니다",
      passed: password.length >= 8 && password.length <= 15,
    },
    {
      key: "combination",
      label: "영문 대문자·소문자·숫자·특수문자 중 3종 이상을 조합합니다",
      passed: kinds >= 3,
    },
    {
      key: "no-id",
      label: "아이디를 포함하지 않습니다",
      passed: !(
        id.length > 0 && password.toLowerCase().includes(id.toLowerCase())
      ),
    },
    {
      key: "no-repeat",
      label: "동일한 문자를 4자리 이상 연속 사용하지 않습니다(예: aaaa)",
      passed: !hasFourRepeating(password),
    },
    {
      key: "no-sequential",
      label: "연속 증감 숫자를 4자리 이상 사용하지 않습니다(예: 1234, 4321)",
      passed: !hasFourSequential(password),
    },
  ]
}

export function isPasswordValid(password: string, id: string): boolean {
  return evaluatePasswordRules(password, id).every((r) => r.passed)
}

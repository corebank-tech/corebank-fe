/**
 * 아이디·비밀번호 규칙 실시간 판정.
 * A-04 회원가입과 A-08 비밀번호 재설정이 공통 규칙을 사용한다.
 *
 * 비밀번호 규칙은 서버 구현을 기준으로 한다.
 * REQ-AUTH-011의 '4종 중 3종' 정책과 서버의 '영문·숫자·특수문자 필수'
 * 정책 사이 불일치는 요구사항 담당자 확인이 필요하다.
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
    const part = value.slice(i, i + 4)
    if (!/^\d{4}$/.test(part)) continue

    const gap = part.charCodeAt(1) - part.charCodeAt(0)
    if (
      (gap === 1 || gap === -1) &&
      part.charCodeAt(2) - part.charCodeAt(1) === gap &&
      part.charCodeAt(3) - part.charCodeAt(2) === gap
    ) {
      return true
    }
  }

  return false
}

/** 서버 공통 비밀번호 정책: 8~15자 / 영문·숫자·특수문자 필수 / 공백·금칙 패턴 불가. */
export function evaluatePasswordRules(
  password: string,
  id: string,
): RuleCheck[] {
  return [
    {
      key: "length",
      label: "8~15자로 입력합니다",
      passed: password.length >= 8 && password.length <= 15,
    },
    {
      key: "combination",
      label: "영문자·숫자·특수문자를 모두 포함하며 공백은 사용할 수 없습니다",
      passed:
        /[A-Za-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9\s]/.test(password) &&
        !/\s/.test(password),
    },
    {
      key: "no-id",
      label: "아이디를 포함하지 않습니다",
      passed:
        id.length === 0 || !password.toLowerCase().includes(id.toLowerCase()),
    },
    {
      key: "no-repeat",
      label: "동일한 문자를 4자리 이상 연속 사용하지 않습니다",
      passed: !hasFourRepeating(password),
    },
    {
      key: "no-sequential",
      label: "연속 증가·감소 숫자 4자리를 사용하지 않습니다",
      passed: !hasFourSequential(password),
    },
  ]
}

export function isPasswordValid(password: string, id: string): boolean {
  return evaluatePasswordRules(password, id).every((r) => r.passed)
}

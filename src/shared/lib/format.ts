/**
 * CoreBank display formatters. KRW single currency, Asia/Seoul.
 * Keep all presentation formatting here so components stay pure.
 */

/** 1000000 -> "1,000,000원" (or "1,000,000" when suffix=false). */
export function formatAmount(
  value: number,
  options: { suffix?: boolean } = {},
): string {
  const { suffix = true } = options
  if (!Number.isInteger(value)) {
    console.warn(`formatAmount: non-integer amount ${value}; truncating.`)
  }
  const truncated = Math.trunc(value)
  const grouped = truncated.toLocaleString("ko-KR")
  return suffix ? `${grouped}원` : grouped
}

const KO_DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]
const KO_SMALL_UNITS = ["", "십", "백", "천"]
const KO_BIG_UNITS = ["", "만", "억", "조", "경"]

function readFourDigits(num: number): string {
  const s = String(num).padStart(4, "0")
  let out = ""
  for (let i = 0; i < 4; i++) {
    const d = Number(s[i])
    if (d !== 0) out += KO_DIGITS[d] + KO_SMALL_UNITS[3 - i]
  }
  return out
}

/**
 * 1000000 -> "일백만원". Reads a KRW integer amount in Korean numerals.
 * Used for the read-back label next to amount inputs.
 */
export function formatKoreanAmount(value: number): string {
  const n = Math.trunc(Math.abs(value))
  if (n === 0) return "영원"
  const groups: number[] = []
  let x = n
  while (x > 0) {
    groups.push(x % 10000)
    x = Math.floor(x / 10000)
  }
  let out = ""
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] !== 0) out += readFourDigits(groups[i]) + KO_BIG_UNITS[i]
  }
  return `${out}원`
}

/** "110632892336" -> "110-632-892336" (3-3-6). Non-digits are stripped. */
export function formatAccountNo(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.length !== 12) {
    // Fall back to a best-effort 3-3-rest grouping for non-standard lengths.
    return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)]
      .filter(Boolean)
      .join("-")
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

function toDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input)
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

/** -> "YYYY.MM.DD" */
export function formatDate(input: Date | string): string {
  const d = toDate(input)
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`
}

/** -> "YYYY.MM.DD HH:mm:ss" */
export function formatDateTime(input: Date | string): string {
  const d = toDate(input)
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )}`
}

/**
 * "1999-01-15" -> "1999.**.**". Masks the month and day, keeps the birth year.
 * REQ-MYPG-001. 생년월일 단독 필드의 마스킹 자리수는 개인정보보호위원회·금융위
 * 가이드라인에 명시되어 있지 않다 — 주민등록번호 마스킹 관행(뒷 7자리 마스킹,
 * 앞 6자리 생년월일은 노출)과 달리 이 화면은 생년월일 자체를 마스킹 대상으로
 * 요구하므로, 개인 특정에 더 크게 기여하는 월·일을 마스킹하고 출생연도만 남긴다.
 */
export function maskBirthDate(input: Date | string): string {
  const d = toDate(input)
  return `${d.getFullYear()}.**.**`
}

/** "홍길동" -> "홍*동". Masks the middle character only. (REQ-CMN-018) */
export function maskName(name: string): string {
  if (name.length <= 1) return name
  if (name.length === 2) return `${name[0]}*`
  const mid = Math.floor(name.length / 2)
  return `${name.slice(0, mid)}*${name.slice(mid + 1)}`
}

/**
 * "110632892336" -> "110-632-89****". Masks the trailing digits of the last group.
 * CSV export only (REQ-INQR-015) — on-screen account numbers are shown in full (REQ-CMN-017).
 */
export function maskAccountNo(raw: string): string {
  const formatted = formatAccountNo(raw)
  const groups = formatted.split("-")
  const lastIndex = groups.length - 1
  const last = groups[lastIndex]
  groups[lastIndex] =
    last.length <= 2
      ? last
      : `${last.slice(0, 2)}${"*".repeat(last.length - 2)}`
  return groups.join("-")
}

/** "abcdef@example.com" -> "abc****@example.com". Masks the local part from the 4th character on. (REQ-CMN-018) */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  if (local.length <= 3) return email
  const visible = local.slice(0, 3)
  return `${visible}${"*".repeat(local.length - 3)}@${domain}`
}

/** "01012345678" -> "010-1234-5678" (3-4-4). Non-digits are stripped. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11)
  const p1 = digits.slice(0, 3)
  const p2 = digits.slice(3, 7)
  const p3 = digits.slice(7, 11)
  return [p1, p2, p3].filter(Boolean).join("-")
}

/** "010-1234-5678" -> "010-****-5678". Masks the middle group. (REQ-CMN-018) */
export function maskPhone(raw: string): string {
  const formatted = formatPhone(raw)
  const groups = formatted.split("-")
  if (groups.length !== 3) return formatted
  return `${groups[0]}-${"*".repeat(groups[1].length)}-${groups[2]}`
}

/** "honggildong" -> "hon********". Masks everything after the first 3 characters. (REQ-AUTH-032) */
export function maskUserId(id: string): string {
  if (id.length <= 3) return id
  return `${id.slice(0, 3)}${"*".repeat(id.length - 3)}`
}

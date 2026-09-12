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

/**
 * "110632892336" -> "110-632-892336" (3-3-6). Non-digits are stripped.
 *
 * 서버가 마스킹해서 내려준 값(예: "110******877")은 그대로 돌려준다. 숫자만
 * 남기면 마스킹 자릿수가 통째로 사라지기 때문이다 — 호출부 주석만으로는 이미
 * 세 번 새어 나갔다(#49 c06-complete.tsx, #51 e04-reservation-list.tsx).
 */
export function formatAccountNo(raw: string): string {
  if (raw.includes("*")) return raw
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
  // 이미 마스킹된 값은 formatAccountNo가 그대로 돌려주지만, 아래 뒷자리 마스킹
  // 로직이 하이픈 없는 문자열을 다시 갈라 진짜 숫자까지 지울 수 있어 여기서도 막는다.
  if (raw.includes("*")) return raw
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

/**
 * "자유입출금 110-220-093412". 별칭이 없으면 계좌번호만 남긴다.
 *
 * 서버는 별칭 미설정 건에 값을 내려주지 않는다. 호출부에서 그대로 보간하면
 * ` 110-220-093412` 처럼 구분자만 남은 표기가 되므로 이 함수를 거친다.
 * `accountNo` 는 이미 마스킹·포맷을 끝낸 문자열을 받는다 — 화면마다 규칙이 다르다.
 */
export function formatAccountLabel(
  alias: string | undefined,
  accountNo: string,
  separator = " ",
): string {
  return alias ? `${alias}${separator}${accountNo}` : accountNo
}

/**
 * 세션 잔여시간 `mm:ss`. 헤더에 카운트다운을 그리는 셸이 둘(고객 `AppHeader`,
 * 관리자 `AdminShell`)이라 여기 둔다 — 같은 값을 두 곳에서 다르게 찍으면
 * 화면마다 남은 시간이 달라 보인다.
 *
 * **음수는 `00:00` 으로 접는다.** 이건 AppHeader 의 지역 함수를 옮기면서 더한
 * 동작이다 — 만료 판정과 타이머 갱신 사이 한 틱 동안 잔여시간이 음수가 될 수
 * 있고, 그때 원본은 `-1:-1` 꼴을 그렸다.
 */
export function formatSessionClock(seconds: number): string {
  const safe = Math.max(0, seconds)
  const m = Math.floor(safe / 60)
  const s = safe % 60
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

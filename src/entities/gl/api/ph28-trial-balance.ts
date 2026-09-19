import { compactDate, daysAgo } from "@/shared/lib/mock-date"

/**
 * ADM-02 시산표(#128) 목업 데이터 — 계정과목 시드와 분개 원본.
 *
 * 대응 서버 API(PH-28, S2 2주차)가 아직 없다. **GL 스키마 자체가 서버에 없다** —
 * `gl_account`·`gl_voucher`·`gl_journal_entry` Flyway 는 PH-20(10/1 머지) 예정이고
 * 현재 마이그레이션 최신은 `V202609081402` 다. 그래서 이 파일은 단순한 목이 아니라
 * **화면이 먼저 제안하는 계약**이다 — 필드명·코드 체계·분개 방향을 여기서 정해
 * BE 가 그대로 받는다(`P3-회계정보계RAG.md` PH-28 "스키마는 S1 말 FE 선전달").
 *
 * 그래서 이름을 임의로 짓지 않았다. 계정과목 체계와 분개 패턴은 전부 계획 문서의
 * 원문에서 가져왔고, 출처가 없는 항목은 아래 "넣지 않은 것"에 사유와 함께 남긴다.
 *
 * **집계된 표를 목으로 두지 않는다.** 분개 원본을 두고 화면이 기간으로 걸러 합산한다.
 * 미리 합산한 표를 들고 있으면 기간 조건이 화면에서 아무 일도 하지 않아, 조회기간이
 * 동작하는지 만들면서 확인할 수 없다. 서버 PH-28 도 같은 일(네이티브 SQL 집계)을 한다.
 *
 * **넣지 않은 것 — 타행 미결제 2패턴.** `P4-이체코어타행이체.md` 는 미결제타점권을
 * "자금이 머무는 **자산** 계정"이라 규정하는데, 출금 측을 자산 증가(차변)로 세우면
 * 상대 계정도 차변이 되어 전표가 성립하지 않는다. 방향을 제가 임의로 정하면 틀린
 * 계약이 그대로 BE 에 전달된다. 패턴 소유자는 P4(PH-33, S2 말~S3)이므로 그때 받는다.
 * 계정 자체는 PH-20 이 시드 포함을 지시했으므로 계정과목에는 남겨 둔다.
 */

/** 계정 5분류(PH-20). 코드 첫 자리와 1:1 로 대응한다. */
export type GlAccountClass =
  "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"

/** 정상잔액 방향(PH-20 "차변/대변 정상잔액 방향"). */
export type GlNormalBalance = "DEBIT" | "CREDIT"

export type GlAccount = {
  /**
   * 계정과목 코드. **대분류 1 + 중분류 2 + 세분류 2 = 5자리**(PH-20).
   * 첫 자리가 분류라 `accountClass` 와 중복으로 보이지만, 서버가 코드만 내려주는
   * 경우에도 화면이 분류를 복원할 수 있어야 해서 둘 다 계약에 둔다.
   */
  code: string
  name: string
  accountClass: GlAccountClass
  normalBalance: GlNormalBalance
}

/**
 * 계정과목 시드 15개(PH-20 "계정 15개 내외").
 *
 * 문서가 포함을 명시한 여섯(**예수금 · 미결제타점권 · 이자비용 · 원천세예수금 ·
 * 개시잔액(자본) · 현금성**)이 전부 들어 있다. 나머지는 그 여섯이 서려면 상대 계정이
 * 필요해서 채운 것이고, 분개 패턴이 확정되지 않은 계정은 목 분개를 만들지 않는다.
 */
// 계정과목은 표로 읽어야 한다 — 한 계정이 한 줄이어야 코드 체계와 정상잔액 방향이
// 눈으로 대조된다. prettier 가 줄마다 6줄로 펴면 그 성질이 사라지므로 배열 전체를
// 서식 대상에서 뺀다. 줄마다 달면 한 줄을 지웠을 때 다음 줄이 조용히 풀린다.
// prettier-ignore
export const GL_ACCOUNTS: GlAccount[] = [
  // 1 자산 — 정상잔액 차변
  { code: "10100", name: "현금및현금성자산", accountClass: "ASSET",     normalBalance: "DEBIT"  },
  { code: "10200", name: "미결제타점권",     accountClass: "ASSET",     normalBalance: "DEBIT"  },
  { code: "10300", name: "예치금",           accountClass: "ASSET",     normalBalance: "DEBIT"  },
  { code: "10400", name: "미수이자",         accountClass: "ASSET",     normalBalance: "DEBIT"  },
  // 2 부채 — 정상잔액 대변
  { code: "20100", name: "예수금",           accountClass: "LIABILITY", normalBalance: "CREDIT" },
  { code: "20200", name: "원천세예수금",     accountClass: "LIABILITY", normalBalance: "CREDIT" },
  { code: "20300", name: "미지급이자",       accountClass: "LIABILITY", normalBalance: "CREDIT" },
  { code: "20400", name: "미지급금",         accountClass: "LIABILITY", normalBalance: "CREDIT" },
  { code: "20500", name: "가수금",           accountClass: "LIABILITY", normalBalance: "CREDIT" },
  // 3 자본 — 정상잔액 대변
  { code: "30100", name: "개시잔액",         accountClass: "EQUITY",    normalBalance: "CREDIT" },
  // 4 수익 — 정상잔액 대변
  { code: "40100", name: "이자수익",         accountClass: "REVENUE",   normalBalance: "CREDIT" },
  { code: "40200", name: "수수료수익",       accountClass: "REVENUE",   normalBalance: "CREDIT" },
  // 5 비용 — 정상잔액 차변
  { code: "50100", name: "이자비용",         accountClass: "EXPENSE",   normalBalance: "DEBIT"  },
  { code: "50200", name: "수수료비용",       accountClass: "EXPENSE",   normalBalance: "DEBIT"  },
  { code: "50300", name: "세금과공과",       accountClass: "EXPENSE",   normalBalance: "DEBIT"  },
]

/**
 * 전표 유형. 전표번호 접두와 화면 표시 라벨의 근거가 된다.
 * 목록에 없는 유형(타행 미결제)은 패턴이 확정되면 추가한다.
 */
export type GlTxType =
  "OPENING" | "TRANSFER" | "PRODUCT_SUBSCRIPTION" | "INTEREST"

export type GlJournalEntry = {
  /** 전표번호. **영업일 + 유형 + 일련**(PH-21 채번 규칙). */
  voucherNo: string
  /** 거래일자 `yyyy-MM-dd`. 시산표 기간 필터의 기준이다. */
  tradeDate: string
  txType: GlTxType
  accountCode: string
  /**
   * 차변 금액. 반대편이면 0 — 한 줄이 양쪽을 동시에 갖지 않는다.
   *
   * 접미사를 붙여 `creditAmount` 와 대칭을 맞춘다. 서버 스펙의 금액 필드가
   * `<명사>Amount` 관용구(`successAmount`·`depositAmount`·`withdrawalAmount`)를
   * 쓰고 `debit`·`credit` 이름은 아직 없어, 이 계약이 그 관용구를 따라간다.
   */
  debitAmount: number
  creditAmount: number
}

const VOUCHER_PREFIX: Record<GlTxType, string> = {
  OPENING: "OPN",
  TRANSFER: "TRF",
  PRODUCT_SUBSCRIPTION: "SUB",
  INTEREST: "INT",
}

/**
 * 전표 하나를 분개 줄들로 편다.
 *
 * 줄을 손으로 나열하면 전표번호를 줄마다 다시 적게 되고, 하나만 틀려도 전표가
 * 쪼개진 채 화면에서는 멀쩡해 보인다(합계는 같으므로). 전표 단위로 만들어야
 * **전표번호가 한 곳에서만 만들어진다.**
 *
 * 입력 줄은 `debit`·`credit` 짧은 이름을 쓴다 — 아래 분개표가 한 줄에 한 분개로
 * 읽혀야 하기 때문이다. 내보내는 계약 필드는 `debitAmount`·`creditAmount` 다.
 */
const voucher = (
  tradeDate: string,
  txType: GlTxType,
  seq: number,
  lines: { accountCode: string; debit?: number; credit?: number }[],
): GlJournalEntry[] =>
  lines.map((line) => ({
    voucherNo: `${compactDate(tradeDate)}-${VOUCHER_PREFIX[txType]}-${String(seq).padStart(4, "0")}`,
    tradeDate,
    txType,
    accountCode: line.accountCode,
    debitAmount: line.debit ?? 0,
    creditAmount: line.credit ?? 0,
  }))

/**
 * 목 분개. 날짜는 전부 `daysAgo()` 상대값이다 — 고정 날짜를 쓰면 시간이 지나면서
 * 기본 조회기간(1개월) 밖으로 밀려나 화면이 진입하자마자 빈 표가 된다.
 *
 * 오프셋을 2~90일에 흩어 둔 이유는 **기간 조건이 실제로 무언가를 거르는 것을
 * 화면에서 보기 위해서**다. 기본 1개월이면 8전표가 들어오고, 3개월로 넓히면
 * 개시잔액 전표까지 11전표가 들어온다.
 *
 * **기본 창 안쪽 전표는 25일을 넘기지 않는다.** 기본 기간은 `recentPeriod()` =
 * `addMonths(today, -1)` 이라 일수가 아니라 **달력 기준**이고, 2월을 지나는 달에는
 * 창이 28일까지 좁아진다(`today=2026-03-10 → start=2026-02-10`). 처음에 `daysAgo(30)`
 * 에 둔 전표는 그런 달에 조용히 빠져서, 같은 화면이 3월에는 20줄이 아니라 16줄을
 * 보여줬다. 차대변은 여전히 맞아 테스트로는 드러나지 않는다 — 수동 검산만 어긋난다.
 * 28 은 최소 창의 시작일에 정확히 앉으므로 여유를 두고 25 로 잡는다.
 *
 * 분개 방향은 전부 계획 문서 원문이다.
 * - 개시 잔액 — "차 현금성 / 대 예수금 + 상대 개시잔액 계정"(PH-21)
 * - 당행 이체 — "차 예수금(출금) / 대 예수금(입금)"(PH-21 패턴표)
 * - 이자 지급 — "차 이자비용 / 대 예수금 · 차 예수금 / 대 원천세예수금"(P2 PH-14)
 */
export const MOCK_JOURNAL_ENTRIES: GlJournalEntry[] = [
  // 개시 잔액 — 장부 시작. 상대 계정 없이 만들면 시산표가 처음부터 안 맞는다.
  ...voucher(daysAgo(90), "OPENING", 1, [
    { accountCode: "10100", debit: 5_000_000_000 },
    { accountCode: "20100", credit: 4_800_000_000 },
    { accountCode: "30100", credit: 200_000_000 },
  ]),

  // 당행 이체 — 예수금 안의 이동이라 같은 계정이 양변에 선다.
  ...voucher(daysAgo(45), "TRANSFER", 1, [
    { accountCode: "20100", debit: 1_500_000 },
    { accountCode: "20100", credit: 1_500_000 },
  ]),
  ...voucher(daysAgo(20), "TRANSFER", 1, [
    { accountCode: "20100", debit: 320_000 },
    { accountCode: "20100", credit: 320_000 },
  ]),
  ...voucher(daysAgo(12), "TRANSFER", 1, [
    { accountCode: "20100", debit: 2_400_000 },
    { accountCode: "20100", credit: 2_400_000 },
  ]),
  ...voucher(daysAgo(5), "TRANSFER", 1, [
    { accountCode: "20100", debit: 780_000 },
    { accountCode: "20100", credit: 780_000 },
  ]),
  ...voucher(daysAgo(2), "TRANSFER", 1, [
    { accountCode: "20100", debit: 55_000 },
    { accountCode: "20100", credit: 55_000 },
  ]),

  // 상품가입 초입금 — 고객 자금이 들어와 현금성이 늘고 예수금(부채)이 는다.
  ...voucher(daysAgo(40), "PRODUCT_SUBSCRIPTION", 1, [
    { accountCode: "10100", debit: 10_000_000 },
    { accountCode: "20100", credit: 10_000_000 },
  ]),
  ...voucher(daysAgo(18), "PRODUCT_SUBSCRIPTION", 1, [
    { accountCode: "10100", debit: 3_000_000 },
    { accountCode: "20100", credit: 3_000_000 },
  ]),
  ...voucher(daysAgo(6), "PRODUCT_SUBSCRIPTION", 1, [
    { accountCode: "10100", debit: 25_000_000 },
    { accountCode: "20100", credit: 25_000_000 },
  ]),

  // 이자 지급 2줄 — 이자비용 계상과 원천징수가 한 전표에 들어간다.
  ...voucher(daysAgo(25), "INTEREST", 1, [
    { accountCode: "50100", debit: 420_000 },
    { accountCode: "20100", credit: 420_000 },
    { accountCode: "20100", debit: 64_680 },
    { accountCode: "20200", credit: 64_680 },
  ]),
  ...voucher(daysAgo(10), "INTEREST", 1, [
    { accountCode: "50100", debit: 135_000 },
    { accountCode: "20100", credit: 135_000 },
    { accountCode: "20100", debit: 20_790 },
    { accountCode: "20200", credit: 20_790 },
  ]),
]

import { compactDate, daysAgo } from "@/shared/lib/mock-date"

/**
 * ADM-02 시산표(#128) 목업 데이터 — 계정과목 시드와 분개 원본.
 *
 * 대응 서버 API(PH-28, S2 2주차)는 아직 없다. 다만 **GL 스키마와 분개 패턴은 서버에
 * 확정됐다** — `gl_account`·`gl_voucher`·`gl_journal_entry` Flyway 가 PH-20(PR #478,
 * 9/25 머지)으로 들어갔고 분개 패턴표가 PH-21(PR #491, 9/27 머지)로 나왔다.
 *
 * **정본은 서버다.** `docs/schema_reference.md` 와 `docs/phase2/gl_journal_patterns.md`
 * 가 계정 체계와 분개 패턴을 정하고, 이 목은 그 둘을 따라간다 — 어긋나면 이쪽을 고친다.
 *
 * 그래서 이름을 임의로 짓지 않았다. 계정과목 체계와 분개 패턴은 전부 서버 정본의
 * 원문에서 가져왔고, 출처가 없는 항목은 아래 "넣지 않은 것"에 사유와 함께 남긴다.
 *
 * **집계된 표를 목으로 두지 않는다.** 분개 원본을 두고 화면이 기간으로 걸러 합산한다.
 * 미리 합산한 표를 들고 있으면 기간 조건이 화면에서 아무 일도 하지 않아, 조회기간이
 * 동작하는지 만들면서 확인할 수 없다. 서버 PH-28 도 같은 일(네이티브 SQL 집계)을 한다.
 *
 * **넣지 않은 것 — 타행 미결제 2패턴.** 서버 정본도 `10200` 미결제타점권의 차대 방향을
 * 아직 정하지 않았다(`gl_journal_patterns.md` §3-4, 소유 P4 PH-33, S2 말~S3). 방향을
 * 임의로 정하면 틀린 분개가 화면에 남는다. 계정 자체는 시드 15개에 들어 있으므로
 * 계정과목에는 남겨 둔다.
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

/**
 * 분개 한 줄의 차대 구분(`gl_journal_entry.dr_cr`).
 *
 * 값이 `GlNormalBalance` 와 같지만 타입을 따로 둔다. 저쪽은 **계정의 성질**이고
 * 이쪽은 **이 줄이 어느 변에 섰는가**라, 한쪽이 바뀌어도 다른 쪽은 따라가지 않는다.
 * 서버도 `GlNormalBalance` 와 `JournalDirection` 을 따로 갖는다.
 */
export type JournalDirection = "DEBIT" | "CREDIT"

export type GlJournalEntry = {
  /** 전표번호 `yyyyMMdd-TTT-NNNNNN`(`gl_journal_patterns.md` §1). */
  voucherNo: string
  /** 거래일자 `yyyy-MM-dd`. 시산표 기간 필터의 기준이다. */
  tradeDate: string
  txType: GlTxType
  accountCode: string
  /**
   * 차변인지 대변인지. **한 줄은 한 변에만 선다.**
   *
   * 차변칸·대변칸 두 개를 두고 안 쓰는 쪽을 0 으로 채우던 모양을 버렸다. 서버
   * `gl_journal_entry` 가 `dr_cr` + `amount` 단일 금액이고(Apache Fineract
   * `acc_gl_journal_entry` 의 `type_enum` + `amount` 와 같은 꼴), 금액에
   * `CHECK (amount > 0)` 가 걸려 있어 0 짜리 반대편을 표현할 자리가 없다.
   */
  drCr: JournalDirection
  /** 항상 양수다(서버 `CHECK (amount > 0)`). */
  amount: number
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
 * 읽혀야 하기 때문이다. 내보내는 계약 필드는 `drCr` + `amount` 다.
 */
/**
 * 한 줄은 차변이거나 대변이다. 반대편 칸을 `never` 로 막아 **둘 다 적는 것과 둘 다
 * 빠뜨리는 것을 타입이 둘 다 거른다.** 서버가 금액을 한 칸만 갖는 이상 양쪽을 적을
 * 방법이 없어야 한다.
 */
type VoucherLine =
  | { accountCode: string; debit: number; credit?: never }
  | { accountCode: string; credit: number; debit?: never }

const voucher = (
  tradeDate: string,
  txType: GlTxType,
  seq: number,
  lines: VoucherLine[],
): GlJournalEntry[] =>
  lines.map((line) => ({
    voucherNo: `${compactDate(tradeDate)}-${VOUCHER_PREFIX[txType]}-${String(seq).padStart(6, "0")}`,
    tradeDate,
    txType,
    accountCode: line.accountCode,
    ...(line.debit !== undefined
      ? { drCr: "DEBIT" as const, amount: line.debit }
      : { drCr: "CREDIT" as const, amount: line.credit }),
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
 * 분개 방향의 정본은 서버 `docs/phase2/gl_journal_patterns.md` 다.
 * - 개시 잔액 — 차 `10100` / 대 `20100` + 대 `30100`(차액). §3-1
 * - 당행 이체 — 차 `20100`(출금) / 대 `20100`(입금). §3-2
 * - 상품가입 초입금 — 당행 이체와 같은 계정 구성. `tx_type` 만 다르다. §3-3
 * - 이자 지급 — 차 `50100` / 대 `20100`, 차 `20100` / 대 `20200`. **아직 미확정**이다
 *   (§3-4, 소유 P2 PH-14 S2). 확정되면 이 목도 따라 고친다.
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

  // 상품가입 초입금 — 고객의 기존 출금계좌에서 신규 예적금계좌로 가는 내부 이동이라
  // 당행 이체와 계정 구성이 같다. 외부에서 현금이 들어오는 거래가 아니다.
  ...voucher(daysAgo(40), "PRODUCT_SUBSCRIPTION", 1, [
    { accountCode: "20100", debit: 10_000_000 },
    { accountCode: "20100", credit: 10_000_000 },
  ]),
  ...voucher(daysAgo(18), "PRODUCT_SUBSCRIPTION", 1, [
    { accountCode: "20100", debit: 3_000_000 },
    { accountCode: "20100", credit: 3_000_000 },
  ]),
  ...voucher(daysAgo(6), "PRODUCT_SUBSCRIPTION", 1, [
    { accountCode: "20100", debit: 25_000_000 },
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

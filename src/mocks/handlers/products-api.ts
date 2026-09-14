import { delay, http } from "msw"
import type {
  PageResponseProductListItemResponse,
  PreferentialRateItem,
  ProductDetailResponse,
  ProductListItemResponse,
  ProductTermsViewResponse,
  RateTierItem,
  TermsItem,
} from "@/shared/api/generated"
import { formatAmount } from "@/shared/lib/format"
import { readSignedInMemberId, unauthorized } from "@/mocks/handlers/auth"
import { fail, ok } from "@/mocks/lib/envelope"
import { readStore, toLocalDateTime, writeStore } from "@/mocks/lib/mock-store"

const MOCK_LATENCY_MS = 200

/**
 * 상품목록(C-01)·상품상세(C-02)·약관 전문(C-03) MSW 목.
 *
 * 상품 데이터의 출처는 아래 `MOCK_PRODUCTS` 하나다. 상세 응답은 이걸 늘려서 만들고,
 * 약관 전문은 상세 응답을 읽어서 만든다. 겹치는 값(이름·금리·가입기간·금액)을
 * 다시 적지 않는다 — 여러 곳에 손으로 맞춰 두면 C-01 카드·C-02 상세·C-03
 * 상품설명서의 숫자가 조용히 어긋난다. 이 불변식은 `products-api.test.ts` 가 지킨다.
 */
export const MOCK_PRODUCTS: ProductListItemResponse[] = [
  {
    productId: 1,
    productCode: "DEP-001",
    productName: "코어 정기예금",
    productGroup: "DEPOSIT",
    summary: "목돈을 맡기고 만기에 이자를 받는 기본 예금",
    baseRate: 3.1,
    maxRate: 3.6,
    minTermMonths: 6,
    maxTermMonths: 36,
    minAmount: 1_000_000,
    maxAmount: 500_000_000,
    newProduct: false,
  },
  {
    productId: 2,
    productCode: "SAV-001",
    productName: "코어 자유적금",
    productGroup: "SAVINGS",
    summary: "매월 자유롭게 납입하는 적금",
    baseRate: 3.4,
    maxRate: 4.2,
    minTermMonths: 12,
    maxTermMonths: 36,
    minAmount: 10_000,
    maxAmount: 3_000_000,
    newProduct: true,
  },
  {
    productId: 3,
    productCode: "SAV-002",
    productName: "코어 정기적금",
    productGroup: "SAVINGS",
    summary: "매월 같은 금액을 납입하는 적금",
    baseRate: 3.2,
    maxRate: 3.9,
    minTermMonths: 12,
    maxTermMonths: 24,
    minAmount: 50_000,
    maxAmount: 2_000_000,
    newProduct: false,
  },
]

export const findProduct = (productId: unknown) =>
  MOCK_PRODUCTS.find((item) => item.productId === Number(productId))

/** 가입기간 선택지 후보(개월). 상품별 최소~최대 범위 안의 것만 쓴다. */
const TERM_CANDIDATES = [6, 12, 24, 36]

/**
 * 우대조건. 합계가 최고금리 계산에 들어간다 — 매퍼(`entities/product/lib/mappers.ts`)가
 * 우대금리를 기간 축 없이 전 구간에 합산하므로, 최고 구간 금리 + 이 합 = 최고금리가
 * 되게 구간 금리를 역산한다.
 */
const PREFERENTIAL_RATES: PreferentialRateItem[] = [
  { conditionCode: "SALARY", conditionName: "급여이체 실적", rate: 0.3 },
  {
    conditionCode: "AUTO_TRANSFER",
    conditionName: "자동이체 3건 이상",
    rate: 0.2,
  },
]

const NOTICES = [
  "금리는 세전 연이율이며, 가입 시점의 금리가 만기까지 적용됩니다.",
  "우대금리는 조건 충족 시 만기해지할 때 적용됩니다.",
]

/**
 * 약관 목록. 상세 응답의 `terms` 와 약관 전문 응답의 메타데이터(이름·버전·필수 여부)가
 * 모두 이 배열에서 나온다 — 둘이 다르면 C-03 이 동의 이력을 엉뚱한 버전으로 싣는다
 * (동의 이력은 termsId·version 쌍으로 저장된다).
 */
const TERMS: TermsItem[] = [
  {
    termsId: 1,
    termsName: "예금거래기본약관",
    version: "1.0",
    required: true,
    viewRequired: true,
    displayOrder: 1,
  },
  {
    termsId: 2,
    termsName: "상품설명서",
    version: "1.0",
    required: true,
    viewRequired: true,
    displayOrder: 2,
  },
  {
    termsId: 3,
    termsName: "마케팅 정보 수신 동의",
    version: "1.0",
    required: false,
    viewRequired: false,
    displayOrder: 3,
  },
]

const roundRate = (rate: number): number => Math.round(rate * 100) / 100

/**
 * 가입기간별 금리. 최저 구간 = 기본금리, 최고 구간 = 최고금리 - 우대합으로 두고
 * 사이는 선형으로 채운다. 그래야 C-02 금리표의 최고금리 열 끝값이 C-01 카드의
 * 최고금리와 같다.
 */
const buildRateTiers = (
  product: ProductListItemResponse,
  termOptions: number[],
): RateTierItem[] => {
  const base = product.baseRate ?? 0
  const preferentialSum = PREFERENTIAL_RATES.reduce(
    (sum, item) => sum + (item.rate ?? 0),
    0,
  )
  const top = (product.maxRate ?? 0) - preferentialSum
  const lastIndex = termOptions.length - 1

  return termOptions.map((termMonths, index) => ({
    termMonths,
    rate: roundRate(
      lastIndex === 0 ? base : base + ((top - base) * index) / lastIndex,
    ),
  }))
}

export const buildProductDetail = (
  product: ProductListItemResponse,
): ProductDetailResponse => {
  const termOptions = TERM_CANDIDATES.filter(
    (term) =>
      term >= (product.minTermMonths ?? 0) &&
      term <= (product.maxTermMonths ?? 0),
  )

  return {
    productId: product.productId,
    productCode: product.productCode,
    productName: product.productName,
    productGroup: product.productGroup,
    summary: product.summary,
    description: product.summary,
    baseRate: product.baseRate,
    maxRate: product.maxRate,
    minAmount: product.minAmount,
    maxAmount: product.maxAmount,
    amountUnit: 1_000,
    minTermMonths: product.minTermMonths,
    maxTermMonths: product.maxTermMonths,
    interestPayType: "SIMPLE",
    termOptions,
    rateTiers: buildRateTiers(product, termOptions),
    preferentialRates: PREFERENTIAL_RATES,
    eligibility: "실명의 개인 (1인 1계좌)",
    subscriptionRestrictions: [],
    notices: NOTICES,
    saleStatus: "ON_SALE",
    terms: TERMS,
  }
}

/**
 * 약관 전문. 상품설명서는 상품마다 다르므로 상세 응답에서 금리·기간·금액을 읽어
 * 만든다 — 전문에 숫자를 따로 적으면 C-02 상세와 C-03 설명서가 어긋난다.
 * `TERMS` 에 항목을 추가하면 여기도 채워야 한다(빠지면 테스트가 잡는다).
 */
const TERMS_CONTENT: Record<number, (detail: ProductDetailResponse) => string> =
  {
    1: () =>
      [
        "제1조(목적)",
        '이 약관은 CoreBank(이하 "은행")와 예금주 사이의 예금거래에 관한 기본적인 사항을 정합니다.',
        "",
        "제2조(거래방법)",
        "예금주는 은행의 인터넷뱅킹을 통해 예금을 신규·해지하거나 입출금할 수 있습니다.",
        "",
        "제3조(이자)",
        "이자는 은행이 정한 이율과 계산방법에 따라 지급하며, 관계 법령에 따른 세금을 원천징수합니다.",
        "",
        "제4조(중도해지)",
        "만기 전에 해지하면 은행이 정한 중도해지이율을 적용합니다.",
      ].join("\n"),
    2: (detail) => {
      const terms = detail.termOptions ?? []
      const preferential = (detail.preferentialRates ?? [])
        .map((item) => `${item.conditionName} +${item.rate}%p`)
        .join(", ")
      return [
        `상품명: ${detail.productName}`,
        `가입대상: ${detail.eligibility}`,
        `가입기간: ${terms[0]}개월 ~ ${terms[terms.length - 1]}개월`,
        `가입금액: ${formatAmount(detail.minAmount ?? 0)} ~ ${formatAmount(detail.maxAmount ?? 0)}`,
        `기본금리: 연 ${detail.baseRate}% (세전)`,
        `최고금리: 연 ${detail.maxRate}% (세전, 우대조건 충족 시)`,
        `우대조건: ${preferential}`,
        "",
        "유의사항",
        ...(detail.notices ?? []).map((notice) => `- ${notice}`),
      ].join("\n")
    },
    3: () =>
      [
        "1. 수집·이용 목적",
        "신상품 안내, 금리 우대 이벤트 등 마케팅 정보 제공",
        "",
        "2. 보유·이용 기간",
        "동의 철회 시까지",
        "",
        "3. 동의 거부 권리",
        "동의하지 않아도 상품 가입에는 제한이 없습니다.",
      ].join("\n"),
  }

/**
 * 약관 열람 이력의 유효시간. 서버 `TermsViewHistoryRedisAdapter.VIEW_TTL`(30분)과 같다.
 * 가입 검증은 이 시간 안에 열람한 기록이 있어야 PRD0005 를 내지 않는다.
 */
export const TERMS_VIEW_TTL_MS = 30 * 60 * 1000

export const buildProductTermsView = (
  product: ProductListItemResponse,
  termsId: number,
  viewedAt: Date,
): ProductTermsViewResponse | undefined => {
  const detail = buildProductDetail(product)
  const term = (detail.terms ?? []).find((item) => item.termsId === termsId)
  const content = TERMS_CONTENT[termsId]
  if (!term || !content) return undefined

  return {
    termsId: term.termsId,
    termsName: term.termsName,
    version: term.version,
    required: term.required,
    viewRequired: term.viewRequired,
    content: content(detail),
    viewedAt: toLocalDateTime(viewedAt),
    viewExpiresAt: toLocalDateTime(
      new Date(viewedAt.getTime() + TERMS_VIEW_TTL_MS),
    ),
  }
}

/** 고객·약관 단위 열람 만료 시각(ms). 서버 Redis 키 `terms-view:{customerId}:{termsId}` 와 같은 단위다. */
const TERMS_VIEWS_KEY = "terms-views"

const recordTermsView = (memberId: string, termsId: number, viewedAt: Date) => {
  const views = readStore<Record<string, number>>(TERMS_VIEWS_KEY, {})
  views[`${memberId}:${termsId}`] = viewedAt.getTime() + TERMS_VIEW_TTL_MS
  writeStore(TERMS_VIEWS_KEY, views)
}

export const isTermsViewed = (memberId: string, termsId: number): boolean =>
  (readStore<Record<string, number>>(TERMS_VIEWS_KEY, {})[
    `${memberId}:${termsId}`
  ] ?? 0) > Date.now()

/** 서버 ProductErrorCode.PRODUCT_NOT_FOUND. */
const productNotFound = () => fail("PRD0201", "상품을 찾을 수 없습니다.", 404)

export const productsApiHandlers = [
  /**
   * 상품목록. **반영하는 파라미터는 `productGroup` 하나뿐이다.** `keyword`·`sort`·
   * `page`·`size` 는 받고도 버린다(`SearchProductsParams` 에는 여섯 개가 있다).
   * 서버는 전부 처리하므로, 이 목 위에서 정렬·검색·페이징이 동작하는 것처럼
   * 보이면 안 된다 — 그 화면을 검증하려면 목을 먼저 늘려야 한다.
   */
  http.get("*/products", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const group = new URL(request.url).searchParams.get("productGroup")
    const items = group
      ? MOCK_PRODUCTS.filter((product) => product.productGroup === group)
      : MOCK_PRODUCTS

    const body: PageResponseProductListItemResponse = {
      page: 0,
      size: items.length,
      totalCount: items.length,
      totalPages: 1,
      items,
    }
    return ok(body)
  }),

  // 상품상세는 서버에서도 로그인 없이 열린다(실서버 GET /products/1 이 200).
  http.get("*/products/:productId", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)

    const product = findProduct(params.productId)
    if (!product) return productNotFound()

    return ok(buildProductDetail(product))
  }),

  // 약관 전문은 로그인이 필요하고(실서버 401), 조회 자체가 열람 이력으로 남는다.
  http.get("*/products/:productId/terms/:termsId", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)

    const memberId = readSignedInMemberId()
    if (memberId == null) return unauthorized()

    const product = findProduct(params.productId)
    if (!product) return productNotFound()

    const termsId = Number(params.termsId)
    const viewedAt = new Date()
    const view = buildProductTermsView(product, termsId, viewedAt)
    // 서버 ProductErrorCode.TERMS_NOT_FOUND.
    if (!view) return fail("PRD0202", "약관을 찾을 수 없습니다.", 404)

    recordTermsView(memberId, termsId, viewedAt)
    return ok(view)
  }),
]

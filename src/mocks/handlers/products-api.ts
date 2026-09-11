import { delay, http } from "msw"
import type {
  PageResponseProductListItemResponse,
  PreferentialRateItem,
  ProductDetailResponse,
  ProductListItemResponse,
  RateTierItem,
  TermsItem,
} from "@/shared/api/generated"
import { fail, ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * 상품목록(C-01)·상품상세(C-02) MSW 목.
 *
 * 상품 데이터의 출처는 아래 `MOCK_PRODUCTS` 하나다. 상세 응답은 이걸 늘려서 만들고
 * 목록과 겹치는 값(이름·금리·가입기간·금액)을 다시 적지 않는다 — 두 곳에 손으로
 * 맞춰 두면 C-01 카드와 C-02 상세의 최고금리·가입기간이 조용히 어긋난다.
 * 목록↔상세 불변식은 `products-api.test.ts` 가 지킨다.
 *
 * 날짜를 담지 않는 응답이라 상대 날짜 헬퍼를 쓰지 않는다 — 시각 회귀
 * 베이스라인이 흔들릴 여지도 없다.
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
    notices: [
      "금리는 세전 연이율이며, 가입 시점의 금리가 만기까지 적용됩니다.",
      "우대금리는 조건 충족 시 만기해지할 때 적용됩니다.",
    ],
    saleStatus: "ON_SALE",
    terms: TERMS,
  }
}

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

  /**
   * 상품상세. 약관 본문(`/products/:productId/terms/:termsId`)은 목이 없다 —
   * C-03 약관동의까지 e2e 로 밟으려면 그 목을 먼저 만들어야 한다.
   */
  http.get("*/products/:productId", async ({ params }) => {
    await delay(MOCK_LATENCY_MS)

    const product = MOCK_PRODUCTS.find(
      (item) => item.productId === Number(params.productId),
    )
    // 오류 코드는 서버 실제 값을 확인하지 않았다. C-02 는 코드가 아니라
    // isError 만 보고 오류 화면을 그린다.
    if (!product) return fail("PRD0404", "존재하지 않는 상품입니다.", 404)

    return ok(buildProductDetail(product))
  }),
]

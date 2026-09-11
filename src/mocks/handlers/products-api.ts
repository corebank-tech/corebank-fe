import { delay, http } from "msw"
import type {
  PageResponseProductListItemResponse,
  ProductListItemResponse,
} from "@/shared/api/generated"
import { ok } from "@/mocks/lib/envelope"

const MOCK_LATENCY_MS = 200

/**
 * `GET /products` 목. 상품몰(C-01)이 e2e 에서 네트워크 오류 화면으로 떨어지던 것을 막는다.
 *
 * 날짜를 담지 않는 응답이라 상대 날짜 헬퍼를 쓰지 않는다 — 시각 회귀
 * 베이스라인이 흔들릴 여지도 없다.
 */
const PRODUCTS: ProductListItemResponse[] = [
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

export const productsApiHandlers = [
  http.get("*/products", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)

    const group = new URL(request.url).searchParams.get("productGroup")
    const items = group
      ? PRODUCTS.filter((product) => product.productGroup === group)
      : PRODUCTS

    const body: PageResponseProductListItemResponse = {
      page: 0,
      size: items.length,
      totalCount: items.length,
      totalPages: 1,
      items,
    }
    return ok(body)
  }),
]

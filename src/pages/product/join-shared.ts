import type { ProductCategory } from "@/entities/product"

/**
 * 가입 완료 화면(C-06)에 노출할 신규계좌번호(모의). 실제 계좌를 만드는 API가 없어
 * 가입한 상품ID로 그럴듯한 값을 만든다 — 어떤 값으로도 실제 계좌를 조회할 수 없다.
 */
export const mockNewAccountNo = (productId: number): string =>
  `110774${String(productId).padStart(6, "0")}`

/** C-03~C-06 공용 스텝 라벨. */
export const PRODUCT_JOIN_STEPS = [
  "약관동의",
  "정보입력",
  "확인 및 인증",
  "완료",
]

/** C-04 에서 입력해 C-05 로 넘기는 값. 각 스텝은 독립 라우트이므로 router state 로 전달한다. */
export type ProductJoinFormState = {
  termMonths: number | null
  fromAccount: string
  amount: number | null
}

/** C-05 인증 완료 후 C-06 으로 넘기는 가입 결과. */
export type ProductJoinResult = {
  productId: number
  productName: string
  category: ProductCategory
  newAccountNo: string
  amount: number
  termMonths: number
  maturityDate: string
  rate: number
}

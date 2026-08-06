import type { ProductCategory } from "@/entities/product"

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
  productId: string
  productName: string
  category: ProductCategory
  newAccountNo: string
  amount: number
  termMonths: number
  maturityDate: string
  rate: number
}

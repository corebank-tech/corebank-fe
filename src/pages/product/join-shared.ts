import type { ProductCategory } from "@/entities/product"

/** C-03~C-06 공용 스텝 라벨. */
export const PRODUCT_JOIN_STEPS = [
  "약관동의",
  "정보입력",
  "확인 및 인증",
  "완료",
]

/** 가입 실행 요청에 실을 동의 약관. C-03 에서 수집해 C-05 까지 넘긴다. */
export type AgreedTerm = {
  termsId: number
  version: string
}

/** C-03 에서 C-04 로 넘기는 값. 각 스텝은 독립 라우트이므로 router state 로 전달한다. */
export type ProductJoinTermsState = {
  agreedTerms: AgreedTerm[]
}

/** C-04 에서 입력해 C-05 로 넘기는 값. */
export type ProductJoinFormState = ProductJoinTermsState & {
  termMonths: number | null
  /** 화면 표시용 출금계좌번호. */
  fromAccountNo: string
  /** 출금계좌 ID. 가입 실행 요청이 계좌번호가 아니라 ID를 받는다. */
  withdrawalAccountId: number | null
  amount: number | null
}

/**
 * C-05 가입 실행 후 C-06 으로 넘기는 결과. 계좌번호·만기일·예상만기금액·적용금리는
 * 전부 서버 응답값이다 — 화면에서 다시 계산하면 서버 산출과 어긋난다.
 */
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

import {
  useExecuteProductSubscription,
  getProductSubscriptions,
  getProductTerms,
} from "@/shared/api/generated"
import type {
  ProductSubscriptionExecuteRequest,
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
  ProductTermsViewResponse,
} from "@/shared/api/generated"

/**
 * 약관 전문. 서버는 이 요청을 열람 이력으로 기록하고, 가입 실행 시 전문 미열람을
 * 검증한다(PRD0005). 그래서 목록을 그릴 때 미리 부르지 않고 실제로 [보기]를 누른
 * 시점에만 부른다.
 */
export const fetchProductTerms = async (
  productId: number,
  termsId: number,
): Promise<ProductTermsViewResponse | undefined> => {
  return getProductTerms(productId, termsId)
}

/** 가입 실행(C-05). */
export const useExecuteSubscription = () => useExecuteProductSubscription()

/**
 * 가입 상세. 실행 응답의 계좌번호는 마스킹돼 있고(088******002) 자동이체 프리필도
 * 없어서, 실행 직후 원본 값을 얻으려면 이쪽을 한 번 더 불러야 한다.
 */
export const fetchSubscriptionResult = async (
  subscriptionId: number,
): Promise<ProductSubscriptionResultResponse | undefined> => {
  return getProductSubscriptions(subscriptionId)
}

export type {
  ProductSubscriptionExecuteRequest,
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
  ProductTermsViewResponse,
}

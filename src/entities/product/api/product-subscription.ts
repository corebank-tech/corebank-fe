import {
  useExecuteProductSubscription,
  getProductSubscriptions,
} from "@/shared/api/generated/product-subscription-controller/product-subscription-controller"
import { getProductTerms } from "@/shared/api/generated/product-controller/product-controller"
import type {
  ProductSubscriptionExecuteRequest,
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
  ProductTermsViewResponse,
} from "@/shared/api/generated/model"

/**
 * 약관 전문. 서버는 이 요청을 열람 이력으로 기록하고, 가입 실행 시 전문 미열람을
 * 검증한다(PRD0005). 그래서 목록을 그릴 때 미리 부르지 않고 실제로 [보기]를 누른
 * 시점에만 부른다.
 */
export const fetchProductTerms = async (
  productId: number,
  termsId: number,
): Promise<ProductTermsViewResponse | undefined> => {
  const response = await getProductTerms(productId, termsId)
  return response as unknown as ProductTermsViewResponse | undefined
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
  const response = await getProductSubscriptions(subscriptionId)
  return response as unknown as ProductSubscriptionResultResponse | undefined
}

export type {
  ProductSubscriptionExecuteRequest,
  ProductSubscriptionExecuteResponse,
  ProductSubscriptionResultResponse,
  ProductTermsViewResponse,
}

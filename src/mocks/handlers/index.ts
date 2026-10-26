import { accountPasswordApiHandlers } from "@/mocks/handlers/account-password-api"
import { accountsApiHandlers } from "@/mocks/handlers/accounts-api"
import { accountHandlers } from "@/mocks/handlers/account"
import { authHandlers } from "@/mocks/handlers/auth"
import { glApiHandlers } from "@/mocks/handlers/gl-api"
import { ledgerReconciliationApiHandlers } from "@/mocks/handlers/ledger-reconciliation-api"
import { otpApiHandlers } from "@/mocks/handlers/otp-api"
import { productSubscriptionsApiHandlers } from "@/mocks/handlers/product-subscriptions-api"
import { productsApiHandlers } from "@/mocks/handlers/products-api"
import { transferApiHandlers } from "@/mocks/handlers/transfer-api"

/**
 * 순서가 중요하다. `accountHandlers` 쪽 와일드카드 패턴이 먼저 오면 실제 경로
 * 핸들러를 가릴 수 있어, 실경로 목을 앞에 둔다.
 */
export const handlers = [
  ...accountsApiHandlers,
  ...accountPasswordApiHandlers,
  ...productsApiHandlers,
  ...productSubscriptionsApiHandlers,
  ...otpApiHandlers,
  ...transferApiHandlers,
  ...glApiHandlers,
  ...ledgerReconciliationApiHandlers,
  ...accountHandlers,
  ...authHandlers,
]

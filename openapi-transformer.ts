import type { OpenAPIObject, OperationObject } from "openapi3-ts/oas31"

/**
 * `openapi.yaml` 은 서버(`/v3/api-docs`) 스냅샷을 손대지 않고 그대로 둔다.
 * 대신 codegen 직전에 두 가지만 이 파일에서 정리한다.
 *
 * 1. 태그 — 일부 컨트롤러가 한글 `@Tag` 를 달고 있어서, `mode: tags-split` 이
 *    `generated/계좌/계좌.ts` 같은 한글 경로를 만든다. 클래스명 기준 slug 로 바꾼다.
 * 2. operationId — 서버에 `@Operation(operationId=...)` 가 하나도 없어 springdoc 이
 *    자바 메서드명을 그대로 내보낸다. 이름이 겹치면 orval 이 `search1`·`register2`
 *    처럼 번호를 붙이는데, 이 번호는 컨트롤러가 하나만 늘어도 밀린다.
 *    화면이 참조하는 오퍼레이션은 여기서 이름을 고정한다.
 */

/** 한글 `@Tag` → 컨트롤러 클래스명 기준 slug. */
const TAG_SLUG: Record<string, string> = {
  자동이체: "auto-transfer-controller",
  예약이체: "scheduled-transfer-controller",
  계좌: "account-controller",
  "계좌 설정": "account-preference-controller",
  이체: "transfer-controller",
  이체한도: "limit-controller",
  "자주 쓰는 계좌": "favorite-account-controller",
  출금계좌: "withdrawal-account-controller",
  "회원가입 식별정보 인증": "signup-identity-controller",
  "회원가입 실명·계좌 인증": "signup-account-verification-controller",
  "회원가입 완료": "signup-completion-controller",
  "회원가입 진행": "signup-progress-controller",
}

/**
 * `"<method> <path>"` → 고정할 operationId.
 * 여기 없는 오퍼레이션은 서버 메서드명을 그대로 쓴다 — 화면에서 참조하게 되면
 * 그때 이 표에 추가한다. 이름은 `동사 + 도메인` 으로 맞춘다(`searchProducts`).
 */
const OPERATION_ID: Record<string, string> = {
  "get /accounts": "getAccounts",

  "get /products": "searchProducts",
  "get /products/{productId}": "getProductDetail",
  "get /products/{productId}/terms/{termsId}": "getProductTerms",
  "post /product-subscriptions/validation": "validate",
  "get /product-subscriptions/{subscriptionId}": "getProductSubscriptions",

  "get /scheduled-transfers": "searchScheduledTransfers",
  "post /scheduled-transfers": "registerScheduledTransfer",
  "post /scheduled-transfers/{scheduledTransferId}/cancel":
    "cancelScheduledTransfer",
  "get /scheduled-transfers/executions": "searchScheduledTransferExecutions",

  "get /auto-transfers": "searchAutoTransfers",
  "post /auto-transfers": "registerAutoTransfer",
  "patch /auto-transfers/{autoTransferId}": "changeAutoTransfer",
  "delete /auto-transfers/{autoTransferId}": "cancelAutoTransfer",
  "get /auto-transfers/executions": "searchAutoTransferExecutions",
}

const HTTP_METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
] as const satisfies readonly (keyof OpenAPIObject["paths"][string])[]

export default (spec: OpenAPIObject): OpenAPIObject => {
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OperationObject | undefined
      if (!operation) continue

      const tag = operation.tags?.[0]
      if (tag && TAG_SLUG[tag]) operation.tags = [TAG_SLUG[tag]]

      const operationId = OPERATION_ID[`${method} ${path}`]
      if (operationId) operation.operationId = operationId
    }
  }

  return spec
}

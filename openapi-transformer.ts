import type {
  OpenAPIObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31"

/**
 * `openapi.yaml` 은 서버(`/v3/api-docs`) 스냅샷을 손대지 않고 그대로 둔다.
 * 대신 codegen 직전에 operationId 만 이 파일에서 고정한다.
 *
 * 서버에 `@Operation(operationId=...)` 가 하나도 없어 springdoc 이 자바 메서드명을
 * 그대로 내보낸다. 이름이 겹치면 orval 이 `verify1`·`register2` 처럼 번호를 붙이는데,
 * 이 번호는 컨트롤러가 하나만 늘어도 밀려서 훅 이름이 조용히 바뀐다.
 * 화면이 참조하는 오퍼레이션은 여기서 이름을 고정한다.
 *
 * 함께 REQ-CMN-007 공통 응답 봉투도 여기서 벗긴다 — 아래 `unwrapApiEnvelope` 참고.
 *
 * 태그는 건드리지 않는다. `mode: "single"` 이라 태그가 파일 경로에 쓰이지 않으므로
 * 서버가 한글 `@Tag` 를 달거나 바꿔도 생성물이 흔들리지 않는다.
 */

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
  "post /product-subscriptions": "executeProductSubscription",
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

/** springdoc 이 제네릭을 평탄화해 내보내는 공통 봉투 스키마의 이름 접두사다. */
const ENVELOPE_SCHEMA_PREFIX = "ApiResponse"
const SCHEMA_REF_PREFIX = "#/components/schemas/"

const isReference = (
  schema: SchemaObject | ReferenceObject,
): schema is ReferenceObject => "$ref" in schema

/**
 * REQ-CMN-007 공통 봉투(`{ code, message, data }`)를 스펙 단계에서 벗긴다.
 *
 * `customFetch` 는 런타임에서 봉투를 벗기고 `data` 만 돌려준다. 그런데 스펙은 봉투째
 * 내려주므로, 벗기지 않으면 생성 타입(`ApiResponseX`)과 실제 값(`X`)이 어긋난다.
 * 그 어긋남을 화면이 `as unknown as` 로 되돌리게 되는데, 그 순간 타입 검사가
 * 통째로 무력화돼 스펙이 바뀌어도 `tsc` 가 잡지 못한다.
 *
 * 벗기고 나면 아무도 참조하지 않는 봉투 스키마는 지운다. 남겨두면 응답 타입으로
 * 오인해 다시 쓰는 사람이 생긴다.
 */
const unwrapApiEnvelope = (spec: OpenAPIObject): void => {
  const schemas = spec.components?.schemas ?? {}

  /** 봉투를 가리키는 `$ref` 면 그 `data` 스키마를, 아니면 undefined 를 돌려준다. */
  const resolveEnvelopeData = (
    schema: SchemaObject | ReferenceObject,
  ): SchemaObject | ReferenceObject | undefined => {
    if (!isReference(schema)) return undefined
    if (!schema.$ref.startsWith(SCHEMA_REF_PREFIX)) return undefined

    const schemaName = schema.$ref.slice(SCHEMA_REF_PREFIX.length)
    if (!schemaName.startsWith(ENVELOPE_SCHEMA_PREFIX)) return undefined

    const envelope = schemas[schemaName]
    if (!envelope || isReference(envelope)) return undefined

    return envelope.properties?.data
  }

  for (const pathItem of Object.values(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const responses = (pathItem[method] as OperationObject | undefined)
        ?.responses
      if (!responses) continue

      for (const response of Object.values(responses)) {
        for (const mediaType of Object.values(response.content ?? {})) {
          if (!mediaType.schema) continue

          const data = resolveEnvelopeData(mediaType.schema)
          if (data) mediaType.schema = data
        }
      }
    }
  }

  for (const schemaName of Object.keys(schemas)) {
    if (schemaName.startsWith(ENVELOPE_SCHEMA_PREFIX))
      delete schemas[schemaName]
  }
}

export default (spec: OpenAPIObject): OpenAPIObject => {
  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method] as OperationObject | undefined
      if (!operation) continue

      const operationId = OPERATION_ID[`${method} ${path}`]
      if (operationId) operation.operationId = operationId
    }
  }

  unwrapApiEnvelope(spec)

  return spec
}

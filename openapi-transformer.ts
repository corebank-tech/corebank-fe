import type {
  OpenAPIObject,
  OperationObject,
  ReferenceObject,
  SchemaObject,
} from "openapi3-ts/oas31"

/**
 * codegen 직전에 REQ-CMN-007 공통 응답 봉투를 벗긴다 — 아래 `unwrapApiEnvelope` 참고.
 *
 * operationId 는 손대지 않는다. 서버가 `corebank-server#308` 로 컨트롤러 47곳에
 * `@Operation(operationId=...)` 를 명시해 안정적인 이름을 직접 내려준다.
 *
 * 태그도 건드리지 않는다. `mode: "single"` 이라 태그가 파일 경로에 쓰이지 않으므로
 * 서버가 한글 `@Tag` 를 달거나 바꿔도 생성물이 흔들리지 않는다.
 */

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
  unwrapApiEnvelope(spec)

  return spec
}

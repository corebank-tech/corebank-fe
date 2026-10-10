import { writeFileSync } from "node:fs"

/**
 * codegen 입력 스냅샷(`openapi.snapshot.json`)을 서버 스펙으로 갱신한다.
 *
 * 서버는 스펙을 한 줄로 내려준다. 그대로 커밋하면 갱신 PR 의 diff 가 전부
 * "한 줄 변경"이 되어 무엇이 바뀐지 볼 수 없다. 들여쓰기를 고정해 바뀐 엔드포인트가
 * diff 에 드러나게 한다.
 *
 * 키 순서는 서버가 준 그대로 둔다. 정렬하면 orval 이 타입을 그 순서로 내보내 생성물이
 * 통째로 재배치된다 — 스냅샷 전환이 생성물을 바꾸지 않는다는 것을 확인할 수 없게 된다.
 */
const SPEC_URL =
  process.env.OPENAPI_SPEC_URL ||
  "https://api.corebank.cloud/api/v1/v3/api-docs"
const SNAPSHOT_PATH = "openapi.snapshot.json"

const response = await fetch(SPEC_URL)
if (!response.ok) {
  console.error(`스펙을 받지 못했습니다: ${response.status} ${SPEC_URL}`)
  process.exit(1)
}

const spec = await response.json()

const isOpenApiDocument =
  spec != null &&
  typeof spec === "object" &&
  !Array.isArray(spec) &&
  typeof spec.openapi === "string" &&
  (spec.paths == null || typeof spec.paths === "object")

if (!isOpenApiDocument) {
  console.error(`OpenAPI 문서가 아닙니다 — 스냅샷을 그대로 둡니다: ${SPEC_URL}`)
  process.exit(1)
}

writeFileSync(SNAPSHOT_PATH, `${JSON.stringify(spec, null, 2)}\n`)

console.log(`${SNAPSHOT_PATH} 갱신 — ${SPEC_URL}`)
console.log(`  openapi ${spec.openapi}`)
console.log(`  paths ${Object.keys(spec.paths ?? {}).length}개`)
console.log(`  schemas ${Object.keys(spec.components?.schemas ?? {}).length}개`)

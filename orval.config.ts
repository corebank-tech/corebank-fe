import { defineConfig } from "orval"

/** springdoc 이 내려주는 스펙 위치. 로컬 백엔드로 맞추려면 OPENAPI_SPEC_URL 을 넘긴다. */
const SPEC_URL =
  process.env.OPENAPI_SPEC_URL ??
  "https://api.corebank.cloud/api/v1/v3/api-docs"

export default defineConfig({
  corebank: {
    // REQ-NFR-013: 스펙 우선. 이 파일이 단일 계약 출처다.
    // openapi.yaml 이 저장소에 도착하기 전까지 `pnpm codegen` 은 의도적으로 실패한다.
    input: {
      // 스펙은 저장소에 두지 않고 서버가 내려주는 것을 그대로 읽는다.
      // 로컬 백엔드로 맞추려면 OPENAPI_SPEC_URL 로 덮어쓴다.
      target: SPEC_URL,
      // 서버 스냅샷의 한글 태그·불안정한 operationId 를 정리한다.
      override: { transformer: "./openapi-transformer.ts" },
    },
    output: {
      // 생성물은 커밋하지 않는다 (.gitignore). 파일을 태그로 쪼개면 서버가 한글
      // `@Tag` 를 바꿀 때마다 디렉터리 이름이 통째로 흔들리므로 한 파일로 모은다.
      mode: "single",
      target: "./src/shared/api/generated/index.ts",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      override: {
        // 프로젝트 규약이 interface 대신 type 이다
        useTypeOverInterfaces: true,
        // 공통 봉투는 customFetch 가 벗기므로 data 만 반환하게 한다
        fetch: { includeHttpResponseReturnType: false },
        mutator: {
          path: "./src/shared/api/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          // useQuery/useMutation 을 명시하면 모든 HTTP 메서드에 무조건 적용돼버린다.
          // 비워두면 orval이 verb === GET 일 때만 query, 그 외엔 mutation으로 자동 판별한다.
          useSuspenseQuery: false,
          signal: true,
        },
      },
    },
  },
})

import { defineConfig } from "orval"

/**
 * codegen 입력. 기본은 저장소에 커밋된 스냅샷이고, 서버나 로컬 백엔드의 최신 스펙으로
 * 맞춰 보려면 OPENAPI_SPEC_URL 을 넘긴다.
 */
// 빈 문자열도 스냅샷으로 떨어뜨린다. `??` 로 두면 `OPENAPI_SPEC_URL=` 가 그대로
// 입력이 되어 orval 이 디렉터리를 읽으려 한다(EISDIR).
const SPEC = process.env.OPENAPI_SPEC_URL || "./openapi.snapshot.json"

export default defineConfig({
  corebank: {
    // REQ-NFR-013: 스펙 우선. 이 파일이 단일 계약 출처다.
    input: {
      target: SPEC,
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

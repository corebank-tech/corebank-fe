import { defineConfig } from "orval"

export default defineConfig({
  corebank: {
    // REQ-NFR-013: 스펙 우선. 이 파일이 단일 계약 출처다.
    // openapi.yaml 이 저장소에 도착하기 전까지 `pnpm codegen` 은 의도적으로 실패한다.
    input: { target: "./openapi.yaml" },
    output: {
      mode: "tags-split",
      target: "./src/shared/api/generated/api.ts",
      schemas: "./src/shared/api/generated/model",
      client: "react-query",
      httpClient: "fetch",
      clean: true,
      // 목업 핸들러도 스펙에서 생성한다 (src/mocks/handlers 의 수작업 예시는
      // 스펙 도착 시 대체된다)
      mock: { generators: [{ type: "msw", delay: 300 }] },
      override: {
        // 공통 봉투는 customFetch 가 벗기므로 data 만 반환하게 한다
        fetch: { includeHttpResponseReturnType: false },
        mutator: {
          path: "./src/shared/api/custom-fetch.ts",
          name: "customFetch",
        },
        query: {
          useQuery: true,
          useSuspenseQuery: false,
          signal: true,
        },
      },
    },
  },
})

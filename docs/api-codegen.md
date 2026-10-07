# API codegen 규약

서버 OpenAPI 스펙에서 TypeScript 타입과 TanStack Query 훅을 생성한다.

| 파일 | 역할 |
| --- | --- |
| `openapi.snapshot.json` | **codegen 입력.** 서버 스펙을 고정한 사본 |
| `orval.config.ts` | 생성 설정 |
| `openapi-transformer.ts` | 공통 응답 봉투 제거 |
| `scripts/update-openapi-snapshot.mjs` | 스냅샷 갱신 |
| `scripts/summarize-openapi-drift.mjs` | 어긋난 엔드포인트·스키마 요약 |
| `.github/workflows/api-drift.yml` | 매일 어긋남 점검 |

생성물은 `src/shared/api/generated/index.ts` 한 파일이며 **커밋하지 않는다**(`.gitignore`). `pnpm codegen` 이 만든다.

---

## 왜 스냅샷인가

원격 스펙을 CI 에서 직접 읽으면 **같은 커밋이 어제는 통과하고 오늘은 실패한다.**

스냅샷은 **서버 변경이 FE 를 멈추는 것을 막는 것이지, 반영을 면제하는 것이 아니다.** 깨진 호출부는 여전히 고쳐야 한다 — 다만 갱신 PR 하나에서 고친다.

`pnpm-lock.yaml` 과 같은 발상이다.

---

## 갱신

```bash
pnpm snapshot:update    # 서버 스펙 받아 스냅샷 덮어쓰기
pnpm codegen
pnpm check
```

**갱신 PR 에는 스냅샷 변경과 그로 깨진 코드 수정을 함께 담는다.** 스냅샷만 올려 `dev` 를 빨갛게 만들지 않는다. PR 본문에 바뀐 엔드포인트·필드를 적는다.

### 누가 · 언제

| 언제 | 누가 |
| --- | --- |
| 드리프트 이슈가 열리면 | 먼저 본 사람. 바뀐 API 를 쓰는 화면 담당자가 가장 빠르다 |
| 다음 작업이 그 API 를 건드리면 | 그 작업 담당자가 자기 PR 에 포함 |
| 이슈가 방치되면 | FE 리드가 갱신하거나 담당을 정한다 |

가운데가 가장 효율적이다 — PR 하나로 끝나고 같은 변경을 두 번 리뷰받지 않는다.

**바뀐 API 를 아무도 쓰지 않으면 급할 이유가 없다.** 깨지는 화면이 없으므로 그 API 를 연동할 때 갱신하고, 보류 사유를 이슈에 남긴다.

### 드리프트 점검

스냅샷은 서버 변경을 자동으로 따라가지 않는다. 아무도 갱신하지 않으면 FE 가 없는 API 를 상대로 개발하게 된다.

그래서 **`api-drift` 가 매일 09:00 KST 에 서버 스펙과 비교해 어긋나면 이슈로 알린다.** 서버 통보가 오면 더 빠르게, 없어도 하루 안에 드러난다. 열린 이슈는 **항상 하나**로 유지한다 — 이미 있으면 코멘트가 붙는다.

---

## 서버 최신 스펙으로 확인하기

스냅샷을 바꾸지 않고 서버 현재 상태로 생성해 본다.

```bash
OPENAPI_SPEC_URL=https://api.corebank.cloud/api/v1/v3/api-docs pnpm codegen
OPENAPI_SPEC_URL=http://localhost:8080/api/v1/v3/api-docs pnpm codegen
```

끝나면 `pnpm codegen` 으로 스냅샷 기준으로 되돌린다.

---

## 건드리면 안 되는 것

**`openapi-transformer.ts` 를 지우지 않는다.** `unwrapApiEnvelope` 가 REQ-CMN-007 공통 응답 봉투(`{ code, message, data }`)를 스펙 수준에서 벗긴다. 빼면 생성 타입이 `ApiResponseX` 가 되어 화면과 어긋난다.

```
transformer 제거 → ApiResponse 381건, typecheck 오류 112건
transformer 유지 → 0건, 0건
```

**스냅샷의 키 순서를 정렬하지 않는다.** 정렬하면 orval 이 타입을 그 순서로 내보내 생성물이 통째로 재배치되고, 스냅샷 변경이 생성물에 영향을 주는지 확인할 수 없게 된다.

**생성물을 화면에서 직접 쓰지 않는다.** `entities/*/api` 의 래퍼 훅을 통해서만 쓴다. 생성 함수명이 서버 `operationId` 에 묶여 있어 화면이 직접 부르면 서버가 이름을 바꿀 때 깨진다.

**스냅샷은 prettier 대상이 아니다.** `.prettierignore` 에 있다. 서버가 준 내용을 그대로 받아 적으므로 prettier 가 손대면 갱신마다 포맷 차이가 섞인다.

---

## operationId

생성 함수·훅 이름은 서버 `operationId` 에서 온다. **FE 는 이름을 고치지 않는다.** 서버가 `corebank-server#308` 로 컨트롤러 47곳에 명시했다. 과거의 `OPERATION_ID` 핀 표는 그 전제가 사라져 `#76` 에서 걷었다.

태그도 건드리지 않는다. `mode: "single"` 이라 태그가 파일 경로에 쓰이지 않는다.

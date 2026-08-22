# CoreBank 프론트엔드

한국 인터넷뱅킹 시뮬레이션 "CoreBank"의 채널계 프론트엔드. 데스크톱 전용 업무 시스템이다.

Vite + React 19 + TypeScript + React Router v8 / TanStack Query / Tailwind CSS.
코드 규약은 `CLAUDE.md`가 단일 출처다.

디자인 시스템과 화면 카탈로그는 Storybook에 있다 —
https://corebank-tech.github.io/corebank-design/

## 로컬 개발

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Node 24.18.0 / pnpm 11.15.1을 쓴다(`.nvmrc`, `package.json`의 `packageManager`).

`.env`의 `VITE_API_BASE_URL`은 `/api/v1`로 둔다. `vite.config.ts`의 dev 서버 프록시가
`localhost:8080`으로 넘겨 같은 오리진처럼 보이게 한다. 절대 URL을 넣으면 프록시를 우회해
CORS 오류가 난다.

백엔드 없이 화면만 보려면 `.env`의 `VITE_ENABLE_MSW`를 `true`로 바꾼다.

### 백엔드 함께 띄우기

`corebank-server` 저장소에서 실행한다. Java 21이 필요하다.

```bash
docker compose up -d minicore-mysql
./gradlew bootRun
```

### 자주 쓰는 명령

| 명령 | 설명 |
|---|---|
| `pnpm dev` | 개발 서버 |
| `pnpm check` | typecheck + lint + format:check + test. 작업 완료 기준 |
| `pnpm storybook` | Storybook 로컬 실행 |
| `pnpm codegen` | `openapi.yaml`에서 API 클라이언트 생성 |

`pnpm codegen` 결과(`src/shared/api/generated/`)를 기능 PR에 섞지 않는다.
스펙을 바꾸지 않았는데 변경이 잡히면 도구 버전 차이로 생긴 노이즈이므로
`git checkout -- src/shared/api/generated`로 되돌린다.

## 배포

| 항목 | 값 |
|---|---|
| 호스팅 | Cloudflare Pages (**Git 연동**) |
| Production branch | `main` |
| 배포 트리거 | `main`에 push하면 Cloudflare가 빌드·배포한다 |
| 운영 도메인 | https://www.corebank.cloud |
| 운영 API | https://api.corebank.cloud/api/v1 |

배포용 스크립트나 GitHub Actions 워크플로를 두지 않는다. Cloudflare가 저장소를 직접 보고
빌드한다.

### 프로젝트 설정

프로젝트를 만들 때 **Connect to Git**을 고른다. Upload assets를 고르면 Direct Upload
프로젝트가 되고 아래 "Direct Upload를 쓰지 않는 이유"의 문제가 재현된다.

| 설정 | 값 |
|---|---|
| Framework preset | None |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Production branch | `main` |

`pnpm build`는 `pnpm typecheck && vite build`라서 타입 오류가 있으면 배포가 실패한다.

### 환경변수 (Production)

Cloudflare 대시보드 > 프로젝트 > Settings > Variables and Secrets에 등록한다.

| 이름 | 값 | 없으면 |
|---|---|---|
| `NODE_VERSION` | `24.18.0` | `.nvmrc`로도 인식하지만 명시한다 |
| `PNPM_VERSION` | `11.15.1` | **빌드 실패.** Cloudflare v3 빌드 시스템은 `packageManager`와 `pnpm-lock.yaml`에서 pnpm 버전을 감지하지 못한다 |
| `VITE_API_BASE_URL` | `https://api.corebank.cloud/api/v1` | 요청이 `undefined/accounts`로 나간다 |
| `VITE_ENABLE_MSW` | `false` | MSW가 요청을 가로채 mock 응답을 돌려준다 |

`VITE_API_BASE_URL`을 절대 URL로 두는 이유는 이렇다. dev 서버 프록시는 `server` 블록에 있어
`vite build` 산출물에는 없다. 배포본에 상대경로 `/api/v1`이 들어가면 브라우저가
`https://www.corebank.cloud/api/v1/...`로 요청하는데, 최상위 `404.html`이 없어 Pages가
SPA로 판정하고 `index.html`을 **200**으로 응답한다. `customFetch`의 `readEnvelope`가
`text/html`을 보고 `null`을 반환해 화면에는 네트워크 오류만 뜬다. 상태 코드가 200이라
네트워크 탭에도 실패로 보이지 않아 원인 파악이 어렵다.

### 백엔드 선결 조건

프론트와 API가 서로 다른 오리진이므로 `corebank-server` 설정이 함께 있어야 화면이 동작한다.

1. **CORS** — `application-prod.yml`이 `allowed-origins: ${CORS_ALLOWED_ORIGINS:}`로 받고
   기본값이 비어 있다. 운영 환경변수에 `CORS_ALLOWED_ORIGINS=https://www.corebank.cloud`를
   넣고 재시작한다. 미리보기 배포에서 API를 확인하려면 해당 `*.pages.dev`도 함께 넣는다
2. **CSRF 쿠키 도메인** — `SecurityConfig`의 CSRF 쿠키에 `domain`을 `corebank.cloud`로
   지정한다. 없으면 `www`에서 `XSRF-TOKEN`을 읽지 못해 상태 변경 요청이 403이 된다

이 둘이 갖춰지기 전에 API 연동본을 배포하면 연동 이전보다 화면이 나빠진다.
mock 화면은 백엔드 없이도 동작하지만 연동 화면은 오류만 표시하기 때문이다.

### Direct Upload를 쓰지 않는 이유

초기 Pages 프로젝트는 `wrangler pages deploy`를 실행하면서 자동 생성되어 Direct Upload
방식이었다. 두 가지 제약이 있다.

- **Cloudflare가 빌드하지 않는다.** 로컬 `pnpm build` 결과물만 업로드한다. Vite는 `VITE_*`를
  빌드 시점에 코드로 치환하므로 대시보드 환경변수는 주입될 대상이 없다. 대시보드의
  Variables and Secrets는 Pages Functions 런타임용이고 이 프로젝트는 Functions를 쓰지 않는다
- **Git을 보지 않는다.** `main`에 push해도 배포가 일어나지 않는다

또한 production branch가 첫 배포 당시의 로컬 브랜치 이름으로 굳어 저장소에 없는 값이 되어
있었다. `--branch=main`으로 배포해도 production과 달라 preview로 떨어지고, 터미널에는
성공으로 표시되지만 운영 도메인은 바뀌지 않는다.

배포 방식은 프로젝트 생성 시점에 정해지고 이후 변경할 수 없다
([Cloudflare 문서](https://developers.cloudflare.com/pages/get-started/direct-upload/)).

### 기존 프로젝트에서 옮기는 절차

커스텀 도메인은 한 번에 하나의 Pages 프로젝트에만 붙일 수 있어 3~4번 사이에 짧은 공백이 생긴다.

1. 새 Pages 프로젝트를 Git 연동으로 만들고 위 설정을 넣는다. 도메인은 건드리지 않는다
2. 첫 빌드가 성공하는지, `*.pages.dev`에서 화면이 뜨는지 확인한다
3. 기존 프로젝트에서 `www.corebank.cloud` 커스텀 도메인을 제거한다
4. 새 프로젝트에 `www.corebank.cloud`를 추가한다. 대시보드 등록을 건너뛰고 CNAME만 바꾸면
   도메인이 해석되지 않는다
5. 가비아 DNS에서 `www` CNAME 값을 새 `*.pages.dev`로 변경한다.
   `corebank.cloud`의 네임서버는 가비아에 그대로 두며 이전하지 않는다
6. 전파를 확인한 뒤 기존 프로젝트를 삭제한다

```bash
dig +short www.corebank.cloud CNAME
curl -sI https://www.corebank.cloud | head -3
```

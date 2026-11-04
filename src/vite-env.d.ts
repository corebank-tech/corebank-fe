/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_MSW?: "true" | "false"
  /** 시연 전용 정적 배포 빌드. 실제 화면과 세션 처리를 빼고 시연 라우트만 넣는다 */
  readonly VITE_DEMO_ONLY?: "true" | "false"
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- 선언 병합에는 interface 가 필요하다
interface ImportMeta {
  readonly env: ImportMetaEnv
}

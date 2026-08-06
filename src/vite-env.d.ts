/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_MSW?: "true" | "false"
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- 선언 병합에는 interface 가 필요하다
interface ImportMeta {
  readonly env: ImportMetaEnv
}

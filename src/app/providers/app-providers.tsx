import * as React from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { createQueryClient } from "@/shared/api/query-client"

type AppProvidersProps = {
  children: React.ReactNode
}

/**
 * TanStack Query 전용 프로바이더. 라우터·세션 상태는 여기서 소유하지 않는다 —
 * `SessionProvider`/`RequireAuth`(`src/features/session`, `src/app/require-auth.tsx`)가
 * 이미 로그인·세션만료·POL-001 유휴 타이머를 소유하므로 중복 구현하지 않는다.
 * `src/shared/api/session-events.ts`의 401 신호는 실 API 연동(Phase 2) 시점에
 * 그 기존 세션 상태와 연결한다.
 */
export const AppProviders = ({ children }: AppProvidersProps) => {
  const [queryClient] = React.useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

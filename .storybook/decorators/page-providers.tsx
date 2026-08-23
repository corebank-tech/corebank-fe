import * as React from "react"
import { MemoryRouter, Route, Routes } from "react-router"
import type { InitialEntry } from "react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import type { Decorator } from "@storybook/react-vite"
import { createQueryClient } from "@/shared/api/query-client"
import { NotificationsProvider } from "@/features/notifications"
import { SessionProvider, useSession } from "@/features/session"

/**
 * 스토리에 인증 상태를 만든다. 로그인은 서버 API 라 스토리북에서 태울 수 없으므로,
 * 로그인 성공 직후와 같은 경로(setSession)로 세션만 세운다. 고객명 조회는 실패하고
 * 헤더 이름이 비지만, 화면 렌더 검증에는 영향이 없다.
 */
function AutoLogin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBootstrapping, setSession } = useSession()

  React.useEffect(() => {
    // 부트스트랩이 끝나기 전에 세우면 그 응답이 세션을 다시 지운다.
    if (isBootstrapping || isAuthenticated) return
    void setSession()
  }, [isAuthenticated, isBootstrapping, setSession])

  if (!isAuthenticated) return null
  return <>{children}</>
}

type PageProvidersProps = {
  initialEntry: InitialEntry
  /** 지정하면 `<Route path={routePattern}>`로 감싸 useParams()가 실제로 값을 받는다. */
  routePattern?: string
  children: React.ReactNode
}

function PageProviders({
  initialEntry,
  routePattern,
  children,
}: PageProvidersProps) {
  const [queryClient] = React.useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <SessionProvider>
          <NotificationsProvider>
            {routePattern ? (
              <Routes>
                <Route path={routePattern} element={children} />
              </Routes>
            ) : (
              children
            )}
          </NotificationsProvider>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

/** `route`에 경로 문자열 대신 이 형태를 주면 `useLocation().state`도 재현할 수 있다. */
export type RouteWithState = { path: string; state: unknown }

/**
 * `useLocation`/`useSearchParams`로 읽는 경로를 재현하려면 스토리에서
 * `parameters: { route: "/instant-transfer?from=..." }`를 지정한다. 이전 단계가
 * `navigate(path, { state })`로 넘기는 `useLocation().state`까지 재현하려면
 * `parameters: { route: { path: "...", state: {...} } }`를 쓴다. 생략하면 "/".
 *
 * `useParams()`는 `MemoryRouter`에 매칭되는 `<Route>`가 있어야만 값을 받는다 —
 * `:productId` 같은 동적 세그먼트를 읽는 화면은 `parameters.routePattern`도
 * 같이 지정해야 한다(예: `routePattern: "/product/:productId/join/1"`).
 */
type StoryRouteContext = {
  parameters: { route?: string | RouteWithState; routePattern?: string }
}

const routeEntryOf = (context: StoryRouteContext): InitialEntry => {
  const route = context.parameters.route ?? "/"
  return typeof route === "string"
    ? route
    : { pathname: route.path, state: route.state }
}

/** 로그인·아이디찾기 등 인증 전 화면용. RequireAuth 게이트를 통과하지 않은 상태를 그대로 보여준다. */
export const WithGuestPage: Decorator = (Story, context) => (
  <PageProviders
    initialEntry={routeEntryOf(context)}
    routePattern={context.parameters.routePattern}
  >
    <Story />
  </PageProviders>
)

/** RequireAuth로 보호되는 화면용. 실제 라우트에서는 항상 로그인된 상태로만 도달하므로 그 상태를 재현한다. */
export const WithAuthenticatedPage: Decorator = (Story, context) => (
  <PageProviders
    initialEntry={routeEntryOf(context)}
    routePattern={context.parameters.routePattern}
  >
    <AutoLogin>
      <Story />
    </AutoLogin>
  </PageProviders>
)

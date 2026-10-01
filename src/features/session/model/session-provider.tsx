import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { logout as requestLogout, readSessionAuthority } from "@/entities/auth"
import {
  getCustomerProfileQueryKey,
  useCustomerProfileQuery,
} from "@/entities/customer"
import {
  ADMIN_SESSION_TIMEOUT_SECONDS,
  SESSION_TIMEOUT_SECONDS,
} from "@/shared/config/policy"
import { onApiActivity, onSessionExpired } from "@/shared/api/session-events"
import {
  SessionContext,
  type SessionContextValue,
  type SessionExpiredReason,
} from "@/features/session/model/session-context-value"

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const queryClient = useQueryClient()
  /**
   * 세션 보유 여부와 고객명의 단일 출처다. 서버 세션이 살아 있으면 성공하고
   * 없으면 401 로 실패하므로, 별도 로그인 플래그를 두면 사본이 하나 더 생긴다.
   *
   * 고객명을 로그인 응답이 아니라 여기서 읽는 이유: LoginResponse.userName 은
   * 평문이고 이쪽은 마스킹(홍*동)이라, 출처가 갈리면 새로고침 전후로 헤더 표기가
   * 달라진다.
   */
  const profile = useCustomerProfileQuery()
  /**
   * 남은 시간을 **깎아서 들고 있지 않는다.** 마지막 활동 시각과 현재 시각을
   * 들고 매 렌더 빼서 쓴다.
   *
   * 남은 초를 상태로 들면 만료 길이가 바뀔 때(역할이 정해지는 순간) 그 값을
   * 다시 채워 넣어야 하는데, 그 재설정이 프로필 도착보다 늘 한 박자 빨라서
   * 관리자가 고객 길이로 끊긴다. 뺄셈으로 두면 길이가 바뀌는 순간 남은 시간이
   * 저절로 따라오므로 맞출 것이 없다.
   *
   * 벽시계 기준이라 생기는 이득이 하나 더 있다. 브라우저는 백그라운드 탭의
   * 1초 타이머를 늦추기 때문에, 째깍인 횟수로 세면 탭을 묻어둔 동안 시간이
   * 덜 흐른 것으로 계산돼 만료가 늦는다.
   */
  const [lastActivityAt, setLastActivityAt] = React.useState(() => Date.now())
  const [nowMs, setNowMs] = React.useState(() => Date.now())
  const [expiredReason, setExpiredReason] =
    React.useState<SessionExpiredReason | null>(null)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)

  const hasSession = profile.data != null
  const isAuthenticated = hasSession && expiredReason == null

  /** 역할·권한은 프로필 응답 하나에서 나온다. 판정은 entities/auth 에 한 곳뿐이다. */
  const authority = React.useMemo(
    () => readSessionAuthority(profile.data),
    [profile.data],
  )

  /**
   * POL-A01: 관리자 세션은 30분, 고객은 10분(POL-001)이다.
   *
   * 판정 키는 보고 있는 경로가 아니라 **세션의 역할**이다. 관리자가 고객 화면을
   * 잠깐 열었다고 만료 시간이 바뀌면 한 번의 로그인 안에서 규칙이 흔들린다.
   * 만료 뒤 도착지가 경로를 보는 것(`app/session-expired-gate.tsx`)과는 다른
   * 질문이다 — 그쪽은 "보던 화면으로 돌려보낸다"라서 경로가 맞다.
   */
  const timeoutSeconds =
    authority.role === "ADMIN"
      ? ADMIN_SESSION_TIMEOUT_SECONDS
      : SESSION_TIMEOUT_SECONDS

  const remainingSeconds = Math.max(
    0,
    timeoutSeconds - Math.floor((nowMs - lastActivityAt) / 1000),
  )

  /** 만료 신호는 렌더 밖(구독 콜백)에서 판정해야 해서 현재 상태를 ref 로 따라둔다. */
  const isAuthenticatedRef = React.useRef(false)
  React.useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated
  }, [isAuthenticated])

  /**
   * 로그아웃 진행 여부는 state 가 아니라 ref 로 판정한다. state 갱신은 다음 렌더까지
   * 반영되지 않는데, 만료 신호는 요청이 응답을 받은 그 순간에 도착하기 때문이다.
   */
  const isLoggingOutRef = React.useRef(false)

  /** 서버 세션을 끊는다. 응답과 무관하게 쿠키는 지워진다(entities/auth/logout 주석). */
  const endServerSession = React.useCallback(async () => {
    // 세션이 이미 없으면 이 호출 자체가 401 CMN0101 을 받아 만료 신호를 쏜다.
    // 로그아웃 중에는 그 신호를 무시해야 A-11 안내가 잘못 뜨지 않는다.
    isLoggingOutRef.current = true
    setIsLoggingOut(true)
    try {
      await requestLogout()
    } finally {
      isLoggingOutRef.current = false
      setIsLoggingOut(false)
    }
  }, [])

  /**
   * 고객정보를 포함해 캐시를 통째로 비운다. 다음 사용자가 로그인했을 때 이전
   * 사용자의 계좌·거래 조회 결과가 잠깐이라도 보이지 않게 하기 위해서다.
   */
  const clearClientSession = React.useCallback(() => {
    queryClient.clear()
  }, [queryClient])

  // POL-001·POL-A01 은 "마지막 요청 이후" 기준이므로 요청이 나갈 때마다 다시 센다.
  // 현재 시각도 같이 당겨야 다음 째깍을 기다리지 않고 바로 가득 찬 값이 보인다.
  React.useEffect(
    () =>
      onApiActivity(() => {
        const at = Date.now()
        setLastActivityAt(at)
        setNowMs(at)
      }),
    [],
  )

  // 401 CMN0101 은 서버가 세션을 끝냈다는 확정 신호다.
  React.useEffect(
    () =>
      onSessionExpired(() => {
        if (!isAuthenticatedRef.current || isLoggingOutRef.current) return
        setExpiredReason("server")
      }),
    [],
  )

  // 째깍임은 화면 표시를 갱신하는 일만 한다. 만료 판정은 표시값이 아니라
  // 마지막 활동 이후 실제로 흐른 시간으로 한다 — 째깍을 몇 번 놓쳐도 늦지 않는다.
  React.useEffect(() => {
    if (!isAuthenticated) return
    const id = setInterval(() => {
      const at = Date.now()
      setNowMs(at)
      if (at - lastActivityAt >= timeoutSeconds * 1000) {
        setExpiredReason("timer")
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isAuthenticated, lastActivityAt, timeoutSeconds])

  // 만료가 확정되면 안내 확인을 기다리지 않고 바로 정리한다 — 공용 PC 를 전제로 한다.
  React.useEffect(() => {
    if (expiredReason == null) return
    const teardown = async () => {
      try {
        // timer 경로는 무조작 만료라 서버 세션이 아직 살아 있다. 우리가 끊어야 한다.
        if (expiredReason === "timer") await endServerSession()
      } finally {
        clearClientSession()
      }
    }
    void teardown()
  }, [expiredReason, endServerSession, clearClientSession])

  /** 고객정보를 다시 읽어 세션을 세운다. 조회 실패는 로그인 실패와 구분해 돌려준다. */
  const refreshProfile = React.useCallback(async (): Promise<boolean> => {
    const queryKey = getCustomerProfileQueryKey()
    // refetchQueries 는 쿼리가 에러여도 reject 하지 않는다. 성공 여부는 쿼리 상태로
    // 판정한다 — 실패한 재조회는 직전 데이터를 캐시에 그대로 두므로 data 유무로 보면
    // 이미 끝난 세션을 살아 있다고 읽는다.
    await queryClient.refetchQueries({ queryKey })
    return queryClient.getQueryState(queryKey)?.status === "success"
  }, [queryClient])

  const setSession = React.useCallback(async () => {
    setExpiredReason(null)
    const at = Date.now()
    setLastActivityAt(at)
    setNowMs(at)
    return refreshProfile()
  }, [refreshProfile])

  const logout = React.useCallback(async () => {
    // 서버 호출 결과와 무관하게 클라이언트 상태는 반드시 정리한다 — 공용 PC 에
    // 로그인 상태를 남기는 쪽이 더 위험하다.
    try {
      await endServerSession()
    } finally {
      clearClientSession()
    }
  }, [endServerSession, clearClientSession])

  const extend = React.useCallback(() => {
    // 지역 타이머를 여기서 되돌리지 않는다. 요청이 서버에 닿아야 서버 세션이 갱신되고
    // (REQ-AUTH-030 인수기준), 그 응답이 onApiActivity 로 타이머를 리셋한다.
    // 세션이 이미 죽었으면 이 요청이 401 CMN0101 을 받아 A-11 로 이어진다 — 맞는 결과다.
    void refreshProfile()
  }, [refreshProfile])

  const acknowledgeExpired = React.useCallback(() => {
    setExpiredReason(null)
  }, [])

  const value = React.useMemo<SessionContextValue>(
    () => ({
      isAuthenticated,
      isBootstrapping: profile.isPending,
      customerName: profile.data?.userName ?? "",
      role: authority.role,
      permissions: authority.permissions,
      remainingSeconds,
      expiredReason,
      isLoggingOut,
      setSession,
      logout,
      extend,
      acknowledgeExpired,
    }),
    [
      isAuthenticated,
      profile.isPending,
      profile.data,
      authority,
      remainingSeconds,
      expiredReason,
      isLoggingOut,
      setSession,
      logout,
      extend,
      acknowledgeExpired,
    ],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

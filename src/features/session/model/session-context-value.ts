import * as React from "react"

/**
 * 세션이 끝난 이유. 둘의 차이는 "서버 세션이 아직 살아 있는가"다.
 * - timer: POL-001 무조작 10분 경과. 서버 세션은 남아 있어 우리가 끊어야 한다.
 * - server: 요청이 401 CMN0101 을 받았다. 서버 세션은 이미 없다.
 * 사용자에게 보이는 A-11 안내는 두 경우가 같다 — 할 행동(재로그인)이 같기 때문이다.
 */
export type SessionExpiredReason = "timer" | "server"

export type SessionContextValue = {
  isAuthenticated: boolean
  /** 서버 세션 복원(GET /customers/me) 응답 전. 이 동안은 로그인 여부가 미정이다. */
  isBootstrapping: boolean
  customerName: string
  remainingSeconds: number
  /** null 이 아니면 A-11 안내가 떠 있어야 하는 상태다. */
  expiredReason: SessionExpiredReason | null
  /** 로그아웃 요청 진행 중. 헤더 버튼 연타를 막는다. */
  isLoggingOut: boolean
  /**
   * 로그인 성공 후 호출한다. 고객명은 서버에서 다시 읽는다.
   * 그 조회가 실패하면 `false` 를 돌려준다 — 서버 세션은 생겼지만 화면은 아직
   * 로그인 상태가 아니므로, 호출자가 안내를 세워야 한다.
   */
  setSession: () => Promise<boolean>
  logout: () => Promise<void>
  /**
   * POL-002 세션 연장. 잔여시간을 지역에서 되돌리지 않고 **서버에 요청을 한 번 보낸다** —
   * REQ-AUTH-030 인수기준이 "서버 세션도 갱신된다"이고, 지역 타이머만 되돌리면
   * 화면은 10:00 인데 서버는 계속 만료를 향해 가는 상태가 된다.
   */
  extend: () => void
  /** A-11 안내 확인. 세션 정리는 만료 시점에 이미 끝나 있고, 여기서는 안내만 닫는다. */
  acknowledgeExpired: () => void
}

export const SessionContext = React.createContext<SessionContextValue | null>(
  null,
)

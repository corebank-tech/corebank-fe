import * as React from "react"

export type LoginResult =
  { ok: true } | { ok: false; locked: boolean; attempts: number }

export type SessionContextValue = {
  isAuthenticated: boolean
  customerName: string
  remainingSeconds: number
  /** 무조작 10분 경과로 세션이 만료되어 A-11 안내가 표시되어야 하는 상태. */
  expired: boolean
  login: (userId: string, password: string) => LoginResult
  logout: () => void
  extend: () => void
  /** A-11 안내 확인 후 세션 상태를 완전히 정리한다. */
  acknowledgeExpired: () => void
}

export const SessionContext = React.createContext<SessionContextValue | null>(
  null,
)

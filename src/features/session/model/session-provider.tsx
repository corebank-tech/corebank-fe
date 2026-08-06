import * as React from "react"
import { MOCK_MEMBERS } from "@/entities/auth"
import {
  LOGIN_MAX_ATTEMPTS as MAX_ATTEMPTS,
  SESSION_TIMEOUT_SECONDS as SESSION_SECONDS,
} from "@/shared/config/policy"
import {
  SessionContext,
  type LoginResult,
  type SessionContextValue,
} from "@/features/session/model/session-context-value"

export const SessionProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [customerName, setCustomerName] = React.useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] =
    React.useState(SESSION_SECONDS)
  const [expired, setExpired] = React.useState(false)
  const [attempts, setAttempts] = React.useState(0)
  const [locked, setLocked] = React.useState(false)

  const isAuthenticated = customerName != null && !expired

  React.useEffect(() => {
    if (!isAuthenticated) return
    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          setExpired(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [isAuthenticated])

  const login = React.useCallback(
    (userId: string, password: string): LoginResult => {
      if (locked) return { ok: false, locked: true, attempts: MAX_ATTEMPTS }

      const member = MOCK_MEMBERS.find(
        (m) => m.memberId === userId && m.loginPassword === password,
      )
      if (member) {
        setCustomerName(member.ownerName)
        setRemainingSeconds(SESSION_SECONDS)
        setExpired(false)
        setAttempts(0)
        return { ok: true }
      }

      const next = attempts + 1
      setAttempts(next)
      if (next >= MAX_ATTEMPTS) setLocked(true)
      return { ok: false, locked: next >= MAX_ATTEMPTS, attempts: next }
    },
    [attempts, locked],
  )

  const logout = React.useCallback(() => {
    setCustomerName(null)
    setExpired(false)
    setRemainingSeconds(SESSION_SECONDS)
  }, [])

  const extend = React.useCallback(() => {
    setRemainingSeconds(SESSION_SECONDS)
  }, [])

  const acknowledgeExpired = React.useCallback(() => {
    setCustomerName(null)
    setExpired(false)
    setRemainingSeconds(SESSION_SECONDS)
  }, [])

  const value = React.useMemo<SessionContextValue>(
    () => ({
      isAuthenticated,
      customerName: customerName ?? "",
      remainingSeconds,
      expired,
      login,
      logout,
      extend,
      acknowledgeExpired,
    }),
    [
      isAuthenticated,
      customerName,
      remainingSeconds,
      expired,
      login,
      logout,
      extend,
      acknowledgeExpired,
    ],
  )

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  )
}

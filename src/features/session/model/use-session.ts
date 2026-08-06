import * as React from "react"
import {
  SessionContext,
  type SessionContextValue,
} from "@/features/session/model/session-context-value"

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext)
  if (!ctx) throw new Error("useSession must be used within SessionProvider")
  return ctx
}

import * as React from "react"
import {
  NotificationsContext,
  type NotificationsContextValue,
} from "@/features/notifications/model/notifications-context-value"

export function useNotifications(): NotificationsContextValue {
  const ctx = React.useContext(NotificationsContext)
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    )
  return ctx
}

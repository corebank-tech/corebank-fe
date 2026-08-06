import * as React from "react"
import type { NotificationInboxRow } from "@/entities/notification"

export type NotificationsContextValue = {
  notifications: NotificationInboxRow[]
  unreadCount: number
  markRead: (id: string) => void
}

export const NotificationsContext =
  React.createContext<NotificationsContextValue | null>(null)

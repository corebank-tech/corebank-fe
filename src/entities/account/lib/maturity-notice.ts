import { daysBetween } from "@/shared/lib/date"

export const getMaturityNotice = (
  maturityDate: string | null | undefined,
  status: string | undefined,
  today: string,
): string | null => {
  if (!maturityDate) {
    return null
  }

  if (status === "MATURED") {
    return "만기 도달"
  }

  if (status === "CLOSED") {
    return null
  }

  const days = daysBetween(today, maturityDate)

  if (days > 0) {
    return `D-${days}`
  }

  if (days === 0) {
    return "D-day"
  }

  return "만기일 경과"
}

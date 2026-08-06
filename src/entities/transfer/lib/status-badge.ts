import type { BadgeVariant } from "@/shared/ui/badge"
import type { TransferStatus } from "@/entities/transfer/api/d04-transfers"
import type { ReservationStatus } from "@/entities/transfer/api/e04-reservations"
import type { ReservationResult } from "@/entities/transfer/api/e05-reservation-results"
import type {
  AutoTransferStatus,
  TransferCycle,
} from "@/entities/transfer/api/g04-auto-transfers"
import type { AutoTransferResult } from "@/entities/transfer/api/g05-auto-transfer-results"

const TRANSFER_STATUS_BADGE: Record<TransferStatus, BadgeVariant> = {
  정상: "success",
  오류: "danger",
  처리중: "warning",
}

export function getTransferStatusBadgeVariant(
  status: TransferStatus,
): BadgeVariant {
  return TRANSFER_STATUS_BADGE[status]
}

const RESERVATION_STATUS_BADGE: Record<ReservationStatus, BadgeVariant> = {
  대기: "warning",
  완료: "success",
  실패: "danger",
  취소: "neutral",
}

export function getReservationStatusBadgeVariant(
  status: ReservationStatus,
): BadgeVariant {
  return RESERVATION_STATUS_BADGE[status]
}

const RESERVATION_RESULT_BADGE: Record<ReservationResult, BadgeVariant> = {
  정상: "success",
  오류: "danger",
  취소: "neutral",
}

export function getReservationResultBadgeVariant(
  result: ReservationResult,
): BadgeVariant {
  return RESERVATION_RESULT_BADGE[result]
}

const AUTO_TRANSFER_STATUS_BADGE: Record<AutoTransferStatus, BadgeVariant> = {
  정상: "success",
  종료: "neutral",
  해지: "danger",
}

export function getAutoTransferStatusBadgeVariant(
  status: AutoTransferStatus,
): BadgeVariant {
  return AUTO_TRANSFER_STATUS_BADGE[status]
}

const AUTO_TRANSFER_RESULT_BADGE: Record<AutoTransferResult, BadgeVariant> = {
  정상: "success",
  오류: "danger",
}

export function getAutoTransferResultBadgeVariant(
  result: AutoTransferResult,
): BadgeVariant {
  return AUTO_TRANSFER_RESULT_BADGE[result]
}

/** 자동이체 이체주기(개월) 표시 라벨. */
export const AUTO_TRANSFER_CYCLE_LABEL: Record<TransferCycle, string> = {
  1: "1개월",
  3: "3개월",
  6: "6개월",
}

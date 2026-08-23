import type { TransactionItemResponse } from "@/shared/api/generated/model"
import type { Transaction } from "@/entities/transaction/api/transactions"

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  IMMEDIATE_TRANSFER: "즉시이체",
  SCHEDULED_TRANSFER: "예약이체",
  AUTO_TRANSFER: "자동이체",
}

const CHANNEL_LABELS: Record<string, string> = {
  WB: "인터넷뱅킹",
  BT: "배치",
}

export const toTransactionRow = (
  item: TransactionItemResponse,
  index: number,
): Transaction => {
  const occurredAt = item.occurredAt ?? ""
  const separatorIndex = occurredAt.indexOf("T")

  const date =
    separatorIndex >= 0 ? occurredAt.slice(0, separatorIndex) : occurredAt

  const time =
    separatorIndex >= 0
      ? occurredAt.slice(separatorIndex + 1, separatorIndex + 9)
      : ""

  return {
    id: String(
      item.ledgerEntryId ??
        item.transactionNumber ??
        `${occurredAt || "unknown"}-${item.balanceAfter ?? 0}-${index}`,
    ),
    date,
    time,
    description: item.transactionType
      ? (TRANSACTION_TYPE_LABELS[item.transactionType] ?? "-")
      : "-",
    content: item.transactionContent ?? "-",
    withdraw: item.withdrawalAmount ?? 0,
    deposit: item.depositAmount ?? 0,
    balance: item.balanceAfter ?? 0,
    channel: item.channel ? (CHANNEL_LABELS[item.channel] ?? "-") : "-",
  }
}

export const toTransactionRows = (
  items: TransactionItemResponse[],
): Transaction[] => {
  return items.map(toTransactionRow)
}

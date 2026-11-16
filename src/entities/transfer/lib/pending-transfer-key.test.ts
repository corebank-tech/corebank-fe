import { afterEach, describe, expect, it } from "vitest"
import {
  clearPendingTransferKey,
  readPendingTransferKey,
  writePendingTransferKey,
} from "@/entities/transfer/lib/pending-transfer-key"

const PENDING = {
  idempotencyKey: "key-1",
  intent: {
    withdrawalAccountId: 1,
    payeeBankCode: "004",
    depositAccountNumber: "1234567890005",
    amount: 30_000,
    myPassbookMemo: "",
    recipientPassbookMemo: "",
  },
}

afterEach(() => sessionStorage.clear())

describe("pending-transfer-key", () => {
  it("쓴 값을 다시 읽고, 지우면 없다", () => {
    writePendingTransferKey(PENDING)
    expect(readPendingTransferKey()).toEqual(PENDING)

    clearPendingTransferKey()
    expect(readPendingTransferKey()).toBeNull()
  })

  it("저장소에 깨진 값이 있으면 없는 것으로 본다", () => {
    sessionStorage.setItem("corebank:pending-transfer-key", "{깨진 값")
    expect(readPendingTransferKey()).toBeNull()
  })

  it.each([
    ["빈 객체", "{}"],
    ["키가 빈 문자열", JSON.stringify({ idempotencyKey: "", intent: {} })],
    ["거래 내용이 없는 값", JSON.stringify({ idempotencyKey: "key-1" })],
    [
      "거래 내용 형태가 아닌 값",
      JSON.stringify({ idempotencyKey: "k", intent: 1 }),
    ],
  ])("형태가 맞지 않는 값(%s)은 없는 것으로 본다", (_label, raw) => {
    sessionStorage.setItem("corebank:pending-transfer-key", raw)
    expect(readPendingTransferKey()).toBeNull()
  })
})

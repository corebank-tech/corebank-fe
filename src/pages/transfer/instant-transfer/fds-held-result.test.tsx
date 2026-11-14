import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { FdsHeldResult } from "@/pages/transfer/instant-transfer/fds-held-result"

describe("FdsHeldResult", () => {
  it("고객에게 보류 안내와 이체 내용만 표시한다", () => {
    render(
      <FdsHeldResult
        result={{
          withdrawalAccountNumber: "110-***-1201",
          recipientBankName: "신한은행",
          recipientAccountNumber: "088******0392",
          recipientName: "홍길동",
          amount: 500_000,
          requestedAt: "2026-11-08T09:10:00+09:00",
        }}
        onConfirm={vi.fn()}
        onGoToTransferMenu={vi.fn()}
      />,
    )

    expect(
      screen.getByRole("heading", { name: "이체가 보류되었습니다." }),
    ).toBeInTheDocument()
    expect(screen.getByText("신한은행 088******0392")).toBeInTheDocument()
    expect(screen.queryByText(/Agent|정책 A|정책 B/)).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "관리자 화면" }),
    ).not.toBeInTheDocument()
  })
})

import * as React from "react"
import { afterEach, describe, expect, it } from "vitest"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { MemoryRouter, Route, Routes, useNavigate } from "react-router"
import { TermsAgreement } from "@/widgets/terms-agreement"

/**
 * 동의 목록 통지 횟수의 상한. 위젯이 값이 아니라 배열 참조로 통지하면
 * 통지 → 부모 setState → 리렌더 → 새 terms → 통지 가 끝없이 돌아 테스트가
 * 실패하는 대신 멎어버린다. 상한을 넘으면 state 갱신을 멈춰 루프를 끊는다.
 */
const NOTIFY_LIMIT = 20

let notifyCount = 0

/** C-03(상품가입 약관동의)의 사용 형태 — terms 를 메모이즈하지 않고 매 렌더 새로 만든다. */
const TermsStep = () => {
  const navigate = useNavigate()
  const [agreedIds, setAgreedIds] = React.useState<string[]>([])

  const handleAgreedChange = React.useCallback((ids: string[]) => {
    notifyCount += 1
    if (notifyCount > NOTIFY_LIMIT) return
    setAgreedIds(ids)
  }, [])

  const terms = [
    {
      id: "1",
      required: true,
      title: "상품설명서",
      question: "상품설명서를 확인하였으며 이에 동의합니다.",
      body: "상품설명서 전문",
    },
    {
      id: "2",
      required: false,
      title: "마케팅 활용 동의",
      question: "마케팅 활용에 동의합니다.",
      body: "마케팅 전문",
    },
  ]

  return (
    <>
      <TermsAgreement terms={terms} onAgreedChange={handleAgreedChange} />
      <p data-testid="agreed">{agreedIds.join(",")}</p>
      <button type="button" onClick={() => navigate("/next")}>
        다음
      </button>
    </>
  )
}

const renderStep = () => {
  notifyCount = 0
  render(
    <MemoryRouter initialEntries={["/terms"]}>
      <Routes>
        <Route path="/terms" element={<TermsStep />} />
        <Route path="/next" element={<p>정보입력 단계</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

/** 목록 index 번째 약관을 [보기] → 모달 [동의] 로 동의 상태로 만든다. */
const agree = (index: number) => {
  const item = screen.getAllByRole("listitem")[index]
  fireEvent.click(within(item).getByRole("button", { name: "보기" }))
  fireEvent.click(screen.getByRole("button", { name: "동의" }))
}

// vitest 설정이 globals: false 라 RTL 자동 정리가 걸리지 않는다.
afterEach(cleanup)

describe("TermsAgreement", () => {
  it("terms 를 메모이즈하지 않는 소비자에서도 통지가 멈춘다", async () => {
    renderStep()
    await screen.findByText("상품설명서")
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(notifyCount).toBeLessThanOrEqual(NOTIFY_LIMIT)
  })

  it("동의한 항목을 선택 약관까지 부모에 올려보낸다", async () => {
    renderStep()
    agree(0)
    agree(1)

    expect(await screen.findByTestId("agreed")).toHaveTextContent("1,2")
  })

  it("동의 후 [다음] 한 번으로 다음 단계로 이동한다", async () => {
    renderStep()
    agree(0)
    fireEvent.click(screen.getByRole("button", { name: "다음" }))

    expect(await screen.findByText("정보입력 단계")).toBeInTheDocument()
  })
})

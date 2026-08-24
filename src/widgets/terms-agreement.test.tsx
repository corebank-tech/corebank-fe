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
 * 통지 횟수의 상한. 위젯이 동의 목록을 effect 로 부모에 동기화하면
 * 통지 → 부모 setState → 리렌더 → 통지 가 끝없이 돌아 테스트가 실패하는 대신
 * 멎어버린다. 상한을 넘으면 state 갱신을 멈춰 루프를 끊는다.
 */
const NOTIFY_LIMIT = 20

let notifyCount = 0

/**
 * 가장 불리한 소비자 — C-03(상품가입 약관동의)처럼 `terms` 를 매 렌더 새로 만들고,
 * 콜백도 메모이즈하지 않고 인라인으로 넘긴다.
 */
const TermsStep = () => {
  const navigate = useNavigate()
  const [agreedIds, setAgreedIds] = React.useState<string[]>([])

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
      <TermsAgreement
        terms={terms}
        onAgreedChange={(ids) => {
          notifyCount += 1
          if (notifyCount > NOTIFY_LIMIT) return
          setAgreedIds(ids)
        }}
      />
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
  it("terms·콜백을 렌더마다 새로 만드는 소비자에서도 통지가 폭주하지 않는다", async () => {
    renderStep()
    await screen.findByText("상품설명서")
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 마운트 시점의 동의 목록은 부모의 초기값과 같은 빈 목록이라 통지하지 않는다.
    expect(notifyCount).toBe(0)
  })

  it("체크를 바꾼 횟수만큼만 통지한다", async () => {
    renderStep()
    agree(0)

    expect(await screen.findByTestId("agreed")).toHaveTextContent("1")
    expect(notifyCount).toBe(1)
  })

  it("동의한 순서와 무관하게 terms 순서대로 선택 약관까지 올려보낸다", async () => {
    renderStep()
    agree(1)
    agree(0)

    expect(await screen.findByTestId("agreed")).toHaveTextContent("1,2")
  })

  it("동의 후 [다음] 한 번으로 다음 단계로 이동한다", async () => {
    renderStep()
    agree(0)
    fireEvent.click(screen.getByRole("button", { name: "다음" }))

    expect(await screen.findByText("정보입력 단계")).toBeInTheDocument()
  })
})

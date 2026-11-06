import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { Adm05ObjectionEvaluation } from "@/pages/admin/adm05-objection-evaluation"

describe("Adm05ObjectionEvaluation", () => {
  it("합성 시나리오 평가임을 밝히고 구조 불변식과 핵심 수치를 그린다", () => {
    render(<Adm05ObjectionEvaluation />)

    expect(
      screen.getAllByText(/합성 시나리오 24건 평가\(11\/5\)/).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByText(/사기 계좌 해제 0\/7 대 서류 기준 7\/7/),
    ).toBeInTheDocument()

    const accuracy = screen.getByRole("region", { name: "판정안 정확도" })
    expect(within(accuracy).getByText("96%")).toBeInTheDocument()
    expect(
      within(accuracy).getByText(/69\/72, 95% CI 88\.5~98\.6%, 키워드 71%/),
    ).toBeInTheDocument()

    const contradiction = screen.getByRole("region", {
      name: "규칙 통과 모순 탐지",
    })
    expect(within(contradiction).getByText("15/15")).toBeInTheDocument()
    expect(
      within(contradiction).getByText("키워드 규칙 분석기 0/5"),
    ).toBeInTheDocument()

    expect(
      within(screen.getByRole("region", { name: "분석 시간" })).getByText(
        "17초",
      ),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "건당 비용" })).getByText(
        "$0.040",
      ),
    ).toBeInTheDocument()
  })

  it("모델 비교 표에 네 방식과 건당 비용을 보인다", () => {
    render(<Adm05ObjectionEvaluation />)

    const rowOf = (label: string) => screen.getByText(label).closest("tr")!
    expect(within(rowOf("Opus 5.5")).getByText("$0.0401")).toBeInTheDocument()
    expect(within(rowOf("Sonnet 5.5")).getByText("$0.0197")).toBeInTheDocument()
    expect(within(rowOf("Haiku 5.5")).getByText("$0.0017")).toBeInTheDocument()
    const keywordRow = rowOf("규칙 분석기(키워드)")
    expect(within(keywordRow).getAllByText("$0")).toHaveLength(2)
    expect(within(keywordRow).getByText("0% (0/5)")).toBeInTheDocument()
  })
})

import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { Adm05ObjectionEvaluation } from "@/pages/admin/adm05-objection-evaluation"

describe("Adm05ObjectionEvaluation", () => {
  it("큰 표본 평가임을 밝히고 구조 불변식과 핵심 수치를 그린다", () => {
    render(<Adm05ObjectionEvaluation />)

    expect(
      screen.getByText(/합성 시나리오 100건 평가\(11\/11\)/),
    ).toBeInTheDocument()
    expect(screen.getByText(/팀원 1명이 따로 검토해/)).toBeInTheDocument()
    expect(screen.getByText(/프롬프트 objection-v2\.2로/)).toBeInTheDocument()
    expect(
      screen.getByText(/사기 계좌 해제 0\/35 대 서류 기준 35\/35/),
    ).toBeInTheDocument()

    const accuracy = screen.getByRole("region", { name: "판정 정확도" })
    expect(within(accuracy).getByText("99.5%")).toBeInTheDocument()
    expect(
      within(accuracy).getByText(
        /199\/200, 95% CI 97\.2~99\.9%, 보정 규칙 적용 전 95%, 같은 건 2회 일치 99\/100/,
      ),
    ).toBeInTheDocument()

    const release = screen.getByRole("region", {
      name: "정답이 해제가 아닌 건에 해제 의견",
    })
    expect(within(release).getByText("0건")).toBeInTheDocument()
    expect(
      within(release).getByText(/110회 중, 사기 패턴 놓침 0\/70/),
    ).toBeInTheDocument()

    const contradiction = screen.getByRole("region", {
      name: "규칙 통과 모순 탐지",
    })
    expect(within(contradiction).getByText("20/20")).toBeInTheDocument()
    expect(
      within(contradiction).getByText("모순 없는 건에 모순을 단 실행 1/90"),
    ).toBeInTheDocument()

    expect(
      within(
        screen.getByRole("region", { name: "공격 문장에 판정 변경" }),
      ).getByText("0건"),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "분석 시간" })).getByText(
        "15초",
      ),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole("region", { name: "건당 비용" })).getByText(
        "$0.036",
      ),
    ).toBeInTheDocument()
  })

  it("11/5 개발 세트 모순 탐지 비교와 모델 비교는 날짜와 건수를 붙여 따로 보인다", () => {
    render(<Adm05ObjectionEvaluation />)

    expect(
      screen.getByText("11/5 개발 세트 모순 탐지 비교"),
    ).toBeInTheDocument()
    expect(screen.getByText("11/5 개발 세트 모델 비교")).toBeInTheDocument()
    expect(
      screen.getByText(/합성 시나리오 24건 평가\(11\/5\)/),
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

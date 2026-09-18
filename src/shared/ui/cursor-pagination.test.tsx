import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { CursorPagination } from "@/shared/ui/cursor-pagination"

/**
 * 아직 이 컴포넌트를 쓰는 화면이 없다(대응 서버 API 가 S2 에 온다). 소비자가 없는
 * 장치는 걸러지지 않은 채 남기 쉬우므로 — 실제로 관리자 네비 권한 필터가 그렇게
 * 방치된 전례가 있다(#147) — 동작을 여기서 고정한다.
 */
afterEach(cleanup)

const renderWith = (props: Partial<Parameters<typeof CursorPagination>[0]>) => {
  const onPrevious = vi.fn()
  const onNext = vi.fn()
  render(
    <CursorPagination
      hasPrevious={false}
      hasNext={false}
      onPrevious={onPrevious}
      onNext={onNext}
      {...props}
    />,
  )
  return { onPrevious, onNext }
}

const previousButton = () => screen.getByRole("button", { name: /이전/ })
const nextButton = () => screen.getByRole("button", { name: /다음/ })

describe("CursorPagination — 렌더 조건", () => {
  it("앞뒤로 더 없으면 아무것도 그리지 않는다", () => {
    // 눌러도 아무 일이 없는 버튼 두 개를 남기지 않는다.
    renderWith({ hasPrevious: false, hasNext: false })

    expect(screen.queryByRole("navigation")).toBeNull()
  })

  it("한쪽이라도 있으면 그린다", () => {
    renderWith({ hasNext: true })

    expect(screen.getByRole("navigation", { name: "목록 이동" })).toBeTruthy()
  })
})

describe("CursorPagination — 버튼 상태", () => {
  it("앞쪽이 없으면 이전을 막는다", () => {
    renderWith({ hasPrevious: false, hasNext: true })

    expect(previousButton()).toBeDisabled()
    expect(nextButton()).not.toBeDisabled()
  })

  it("뒤쪽이 없으면 다음을 막는다", () => {
    renderWith({ hasPrevious: true, hasNext: false })

    expect(nextButton()).toBeDisabled()
    expect(previousButton()).not.toBeDisabled()
  })

  it("요청 중에는 양쪽을 다 막는다", () => {
    // 응답 전에 한 번 더 누르면 커서가 두 칸 건너뛰는데, 번호가 없어서
    // 사용자가 건너뛴 사실도 모르고 되돌아갈 수도 없다.
    renderWith({ hasPrevious: true, hasNext: true, isLoading: true })

    expect(previousButton()).toBeDisabled()
    expect(nextButton()).toBeDisabled()
  })
})

describe("CursorPagination — 콜백", () => {
  it("이전을 누르면 onPrevious 를 부른다", () => {
    const { onPrevious, onNext } = renderWith({
      hasPrevious: true,
      hasNext: true,
    })

    fireEvent.click(previousButton())

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).not.toHaveBeenCalled()
  })

  it("다음을 누르면 onNext 를 부른다", () => {
    const { onPrevious, onNext } = renderWith({
      hasPrevious: true,
      hasNext: true,
    })

    fireEvent.click(nextButton())

    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onPrevious).not.toHaveBeenCalled()
  })

  it("막힌 버튼은 콜백을 부르지 않는다", () => {
    const { onNext } = renderWith({ hasPrevious: true, hasNext: false })

    fireEvent.click(nextButton())

    expect(onNext).not.toHaveBeenCalled()
  })
})

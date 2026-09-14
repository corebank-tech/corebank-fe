import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router"
import { RouteError } from "@/app/route-error"

const Crash = () => {
  throw new Error("render crash")
}

const renderAt = (path: string) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        errorElement: <RouteError />,
        children: [
          { path: "crash", element: <Crash /> },
          { path: "admin/crash", element: <Crash /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe("RouteError", () => {
  beforeEach(() => {
    // 던져진 렌더 오류를 React·라우터가 콘솔에 남긴다. 기대한 오류라 출력만 막는다.
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("없는 주소는 404 안내를 보여준다", () => {
    renderAt("/no-such-page")

    expect(screen.getByText("페이지를 찾을 수 없습니다")).toBeTruthy()
    expect(screen.queryByText(/Unexpected Application Error/)).toBeNull()
  })

  it("라우트 하위의 렌더 오류는 404 와 다른 문구로 받는다", () => {
    renderAt("/crash")

    expect(screen.getByText("화면을 표시하지 못했습니다")).toBeTruthy()
    expect(screen.queryByText("페이지를 찾을 수 없습니다")).toBeNull()
  })

  it("고객 채널에서는 고객 시작 지점으로 돌아간다", () => {
    const router = renderAt("/crash")

    fireEvent.click(screen.getByRole("button", { name: "처음으로" }))

    expect(router.state.location.pathname).toBe("/")
  })

  it("관리자 채널에서는 관리자 시작 지점으로 돌아간다", () => {
    const router = renderAt("/admin/crash")

    fireEvent.click(screen.getByRole("button", { name: "처음으로" }))

    expect(router.state.location.pathname).toBe("/admin")
  })
})

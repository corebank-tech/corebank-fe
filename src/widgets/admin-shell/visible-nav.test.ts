import { describe, expect, it } from "vitest"
import { visibleAdminNav } from "@/widgets/admin-shell/visible-nav"
import type { AdminNavGroup } from "@/shared/config/admin-nav"

/**
 * 직무분리(PH-49)의 "메뉴를 아예 그리지 않는다"를 고정한다.
 *
 * 이 테스트가 없으면 **거르는 분기가 한 번도 실행되지 않는다** — 실제 `ADMIN_NAV`
 * 에는 권한이 걸린 항목이 하나뿐이고 목 관리자 둘 다 그 권한을 갖고 있어서,
 * 필터를 지워도 화면·e2e 가 전부 통과한다. 그래서 실제 설정이 아니라 이 파일에서
 * 만든 픽스처를 쓴다 — `ADMIN_NAV` 가 늘거나 줄어도 이 단언은 흔들리면 안 된다.
 */
const GROUPS: AdminNavGroup[] = [
  {
    title: "관리",
    items: [{ label: "관리자 홈", path: "/admin" }],
  },
  {
    title: "고객",
    items: [
      {
        label: "고객 조회",
        path: "/admin/customers",
        requiresPermission: "CUSTOMER_READ",
      },
      {
        label: "고객 권한 관리",
        path: "/admin/customers/roles",
        requiresPermission: "CUSTOMER_WRITE",
      },
    ],
  },
  {
    title: "회계",
    items: [
      { label: "시산표", path: "/admin/gl", requiresPermission: "GL_READ" },
    ],
  },
]

describe("visibleAdminNav", () => {
  it("권한이 없으면 그 항목을 뺀다", () => {
    const groups = visibleAdminNav(GROUPS, ["CUSTOMER_READ"])
    const 고객 = groups.find((group) => group.title === "고객")

    expect(고객?.items.map((item) => item.label)).toEqual(["고객 조회"])
  })

  it("권한이 있으면 그 항목을 남긴다", () => {
    const groups = visibleAdminNav(GROUPS, ["CUSTOMER_READ", "CUSTOMER_WRITE"])
    const 고객 = groups.find((group) => group.title === "고객")

    expect(고객?.items.map((item) => item.label)).toEqual([
      "고객 조회",
      "고객 권한 관리",
    ])
  })

  it("권한이 걸리지 않은 항목은 언제나 남는다", () => {
    const groups = visibleAdminNav(GROUPS, [])
    const 관리 = groups.find((group) => group.title === "관리")

    expect(관리?.items.map((item) => item.label)).toEqual(["관리자 홈"])
  })

  it("항목이 하나도 남지 않은 그룹은 통째로 뺀다", () => {
    // 제목만 남으면 관리자가 "열 수 있는 메뉴가 있는데 안 보인다"고 읽는다.
    const titles = visibleAdminNav(GROUPS, []).map((group) => group.title)

    expect(titles).toEqual(["관리"])
  })

  it("다른 기능의 권한으로는 통과하지 않는다", () => {
    // GL_READ 만 가진 회계 관리자에게 고객 메뉴가 열리면 안 된다.
    const titles = visibleAdminNav(GROUPS, ["GL_READ"]).map(
      (group) => group.title,
    )

    expect(titles).toEqual(["관리", "회계"])
  })

  it("원본 설정을 건드리지 않는다", () => {
    const before = JSON.stringify(GROUPS)
    visibleAdminNav(GROUPS, [])

    expect(JSON.stringify(GROUPS)).toBe(before)
  })
})

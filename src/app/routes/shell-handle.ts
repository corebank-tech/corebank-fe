import type * as React from "react"
import { useMatches } from "react-router"

/**
 * 라우트가 셸(PageShell)에 넘기는 메타. 데이터 라우터의 `handle` 에 담고
 * 레이아웃이 `useMatches()` 로 읽는다 — 화면 컴포넌트는 자기 셸을 모른다.
 */
export type ShellHandle = {
  /**
   * breadcrumb 한 마디. 매치된 라우트들의 crumb 을 위에서부터 이어 붙여
   * 전체 경로를 만든다. 그래서 라우트 계층과 breadcrumb 이 어긋날 수 없다.
   */
  crumb?: string
  /** 헤더 상단 네비 활성 항목. 그룹 라우트에 한 번 적으면 자식이 물려받는다. */
  activeId?: string
  title?: React.ReactNode
  notice?: React.ReactNode[]
  noticeTitle?: React.ReactNode
  /** 로그인 화면처럼 breadcrumb·페이지 헤더를 감춘다. */
  bare?: boolean
}

export type ShellProps = {
  breadcrumb: string[]
  activeId?: string
  title?: React.ReactNode
  notice?: React.ReactNode[]
  noticeTitle?: React.ReactNode
  bare: boolean
}

/**
 * 매치된 라우트들의 `handle` 을 합쳐 셸 props 를 만든다.
 * crumb 은 이어 붙이고, 나머지는 **가장 안쪽 라우트가 이긴다** —
 * 그룹에 기본값을 두고 개별 화면이 덮어쓸 수 있게 하기 위해서다.
 */
export const useShellProps = (): ShellProps => {
  const matches = useMatches()

  const handles = matches
    .map((match) => match.handle as ShellHandle | undefined)
    .filter((handle): handle is ShellHandle => handle != null)

  const innermost = <K extends keyof ShellHandle>(
    key: K,
  ): ShellHandle[K] | undefined =>
    handles.reduce<ShellHandle[K] | undefined>(
      (picked, handle) => (handle[key] !== undefined ? handle[key] : picked),
      undefined,
    )

  return {
    breadcrumb: handles.flatMap((handle) =>
      handle.crumb == null ? [] : [handle.crumb],
    ),
    activeId: innermost("activeId"),
    title: innermost("title"),
    notice: innermost("notice"),
    noticeTitle: innermost("noticeTitle"),
    bare: innermost("bare") ?? false,
  }
}

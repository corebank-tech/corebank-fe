import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { NoticeBox, NoticeBoxFooter } from "@/shared/ui/notice-box"

type QueryPageLayoutProps = {
  /** 상단 NoticeBox 항목. */
  noticeItems: React.ReactNode[]
  noticeTitle?: string
  /** 하단 [알아두세요] NoticeBoxFooter 항목. */
  footerItems: React.ReactNode[]
  footerTitle?: string
  /** 조회조건·그리드·요약 등 화면 본문. */
  children: React.ReactNode
  /** 점자보기·검색·상세 등 포털 모달. 레이아웃 흐름 밖에 렌더링된다. */
  modals?: React.ReactNode
  className?: string
}

/**
 * 조회·폼 화면 공통 골격: 상단 NoticeBox → 본문 → 하단 NoticeBoxFooter.
 * 모든 조회·폼 화면 하단에 [알아두세요] 안내 박스를 넣는 화면 질감 규칙을
 * prop으로 강제한다 — footerItems를 빠뜨리면 타입 에러가 난다.
 */
export const QueryPageLayout = ({
  noticeItems,
  noticeTitle,
  footerItems,
  footerTitle,
  children,
  modals,
  className,
}: QueryPageLayoutProps) => {
  return (
    <>
      <div className={cn("flex flex-col gap-8", className)}>
        <NoticeBox title={noticeTitle} items={noticeItems} />
        {children}
        <NoticeBoxFooter title={footerTitle} items={footerItems} />
      </div>
      {modals}
    </>
  )
}

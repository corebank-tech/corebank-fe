import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useDisclosure } from "@/shared/lib/hooks/use-disclosure"

type CollapsibleSectionProps = {
  title: React.ReactNode
  children: React.ReactNode
  className?: string
  headerClassName?: string
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

/**
 * 헤더 바(제목 + chevron)를 눌러 여닫는 보더 패널. 조회 화면의 "계좌정보"류
 * 부가 정보 패널처럼, 자체 헤더가 있는 접이식 데이터 블록에 쓴다.
 * [알아두세요] 안내 박스는 시각 정책이 달라 NoticeBoxFooter를 그대로 쓴다.
 */
export const CollapsibleSection = ({
  title,
  children,
  className,
  headerClassName,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
}: CollapsibleSectionProps) => {
  const { open, toggle } = useDisclosure(
    defaultOpen,
    openProp !== undefined && onOpenChange
      ? { open: openProp, onOpenChange }
      : undefined,
  )

  return (
    <section
      className={cn("overflow-hidden border border-border", className)}
      aria-label={typeof title === "string" ? title : undefined}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between bg-surface px-4 py-2.5 text-base font-bold text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          headerClassName,
        )}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-muted transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </section>
  )
}

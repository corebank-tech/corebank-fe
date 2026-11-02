import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

/**
 * 네이티브 `<select>` + 화살표 아이콘.
 *
 * **`className` 은 컨트롤 상자에 걸린다 — 안쪽 `<select>` 가 아니라 래퍼다.**
 * 화살표가 래퍼 기준 `absolute right-3` 이라, 폭 제한이 래퍼에 있어야 상자 오른쪽에
 * 붙는다. 예전에는 `className` 이 `<select>` 로 갔고 래퍼는 항상 `w-full` 이어서,
 * `max-w-40` 을 주면 상자만 줄고 화살표는 행 오른쪽 끝에 홀로 남았다(#153).
 *
 * 그래서 넘기는 값은 **"이 컨트롤이 어디에 얼마만큼 놓이는가"** 다 — `max-w-md`,
 * `h-8 w-[108px]` 같은 것. 안쪽 `<select>` 는 `h-full w-full` 로 래퍼를 채우므로
 * 래퍼에 준 높이·폭이 그대로 상자 크기가 된다.
 *
 * 테두리·배경·패딩처럼 **상자 내부 스타일은 여기서 고정**하고 호출부가 덮지 않는다.
 * 덮어야 할 이유가 생기면 그때 별도 prop 을 두고, `className` 하나를 둘로 가르지
 * 않는다 — 어느 클래스가 어디로 갈지 호출부가 예측할 수 없게 된다.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, invalid, children, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative inline-flex h-10 w-full items-center",
          className,
        )}
      >
        <select
          ref={ref}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-full w-full appearance-none rounded-md border bg-surface-elevated pr-9 pl-3 text-base",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring-soft focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:bg-surface disabled:text-ink-muted",
            invalid ? "border-danger" : "border-border-strong",
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 h-4 w-4 text-ink-muted"
          aria-hidden="true"
        />
      </div>
    )
  },
)
Select.displayName = "Select"

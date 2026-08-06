import * as React from "react"
import { cn } from "@/shared/lib/utils"

/**
 * 아이콘 전용 버튼의 크기·형태 골격만 공통화한다. 색상·보더·hover 톤은
 * 화면마다(헤더 아이콘·페이지네이션 이전/다음·모달 닫기·푸터 맨위로 등)
 * 실제로 달라서 `className`으로 넘긴다 — 억지로 하나의 색상 어휘에 맞추지 않는다.
 */
type IconButtonSize = "sm" | "md" | "lg"
type IconButtonShape = "square" | "circle"

const ICON_BUTTON_SIZE_CLASSES: Record<IconButtonSize, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-10 w-10",
}

const ICON_BUTTON_SHAPE_CLASSES: Record<IconButtonShape, string> = {
  square: "rounded-md",
  circle: "rounded-full",
}

type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: IconButtonSize
  shape?: IconButtonShape
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, size = "md", shape = "square", type, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(
          "inline-flex shrink-0 items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          ICON_BUTTON_SIZE_CLASSES[size],
          ICON_BUTTON_SHAPE_CLASSES[shape],
          className,
        )}
        {...props}
      />
    )
  },
)
IconButton.displayName = "IconButton"

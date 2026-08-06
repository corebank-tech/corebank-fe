import * as React from "react"
import { cn } from "@/shared/lib/utils"

/**
 * 토글 칩(기간 프리셋·빠른 금액·상품 카테고리 필터·최근/자주 쓰는 계좌)이
 * 화면마다 따로 만들어지던 것을 하나로 모은 것이다. `size`는 화면별로 실제
 * 쓰이던 높이·패딩 조합(h-7/h-8/h-9)을, `tone`은 실제 쓰이던 색 조합을 그대로 옮겼다 —
 * 새로운 시각적 스타일을 만들지 않는다. 개별 화면의 폰트 크기가 `size` 기본값과
 * 다르면(예: 기간 프리셋 칩의 text-base) `className`으로 덮어써 원래 값을 유지한다.
 */
type ChipSize = "sm" | "md" | "lg"
type ChipTone = "default" | "active" | "primary" | "primary-tint" | "muted"

const CHIP_SIZE_CLASSES: Record<ChipSize, string> = {
  sm: "h-7 px-2.5 text-xs",
  md: "h-8 px-3 text-base",
  lg: "h-9 px-4 text-base font-bold",
}

const CHIP_TONE_CLASSES: Record<ChipTone, string> = {
  default: "border-border-strong bg-surface-elevated text-ink hover:bg-surface",
  active: "border-ink bg-ink font-bold text-surface-elevated",
  primary: "border-primary bg-primary text-primary-foreground",
  "primary-tint":
    "border-primary bg-primary-tint font-bold text-primary hover:bg-surface-elevated",
  muted: "border-border-strong bg-surface text-ink-muted hover:bg-border",
}

type ChipProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ChipSize
  tone?: ChipTone
}

export const Chip = ({
  className,
  size = "md",
  tone = "default",
  type,
  ...props
}: ChipProps) => {
  return (
    <button
      type={type ?? "button"}
      className={cn(
        "inline-flex items-center justify-center rounded-pill border whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        CHIP_SIZE_CLASSES[size],
        CHIP_TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  )
}

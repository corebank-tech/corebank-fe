import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type SpinnerSize = "sm" | "md" | "lg"

const SPINNER_SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-9 w-9",
}

type SpinnerProps = React.HTMLAttributes<SVGSVGElement> & {
  size?: SpinnerSize
}

/** 로딩 표시 아이콘. `widgets/transfer/result-panel.tsx`의 "처리중" 상태가 첫 사용처다. */
export const Spinner = ({ className, size = "md", ...props }: SpinnerProps) => {
  return (
    <Loader2
      className={cn("animate-spin", SPINNER_SIZE_CLASSES[size], className)}
      strokeWidth={2.5}
      aria-hidden="true"
      {...props}
    />
  )
}

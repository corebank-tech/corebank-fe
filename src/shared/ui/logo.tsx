import { cn } from "@/shared/lib/utils"
import logoMark from "@/shared/assets/logo-mark.png"
import logoWordmark from "@/shared/assets/logo-wordmark.png"

type LogoMarkProps = {
  className?: string
}

export const LogoMark = ({ className }: LogoMarkProps) => {
  return (
    <img
      src={logoMark}
      alt="CoreBank"
      className={cn("h-8 w-8 shrink-0", className)}
    />
  )
}

type LogoProps = {
  className?: string
  markClassName?: string
  wordmarkClassName?: string
}

/**
 * 마크 + 워드마크 전체 로고 락업. 헤더 등 브랜드 노출 영역에서 쓴다.
 */
export const Logo = ({
  className,
  markClassName,
  wordmarkClassName,
}: LogoProps) => {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} />
      <img
        src={logoWordmark}
        alt="CORE BANK"
        className={cn("h-5 w-auto", wordmarkClassName)}
      />
    </span>
  )
}

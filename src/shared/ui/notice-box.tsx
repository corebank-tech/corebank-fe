import { CheckCircle2, ChevronDown, Info } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useDisclosure } from "@/shared/lib/hooks/use-disclosure"

type NoticeBoxProps = {
  title?: React.ReactNode
  items: React.ReactNode[]
  className?: string
}

export const NoticeBox = ({
  title = "안내 및 유의사항",
  items,
  className,
}: NoticeBoxProps) => {
  return (
    <section
      className={cn(
        "rounded-md border border-border bg-primary-tint p-4",
        className,
      )}
      aria-label={typeof title === "string" ? title : "안내"}
    >
      <div className="mb-2 flex items-center gap-2">
        <Info className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <h2 className="text-base font-bold text-ink">{title}</h2>
      </div>
      <ul className="flex flex-col gap-1.5 pl-6">
        {items.map((item, i) => (
          <li
            key={i}
            className="relative text-base leading-relaxed text-ink-muted before:absolute before:top-[9px] before:-left-3 before:h-1 before:w-1 before:rounded-full before:bg-ink-faint"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

type NoticeBoxFooterProps = {
  title?: string
  items: React.ReactNode[]
  className?: string
  defaultOpen?: boolean
}

/** 조회·폼 화면 하단에 배치하는 접이식 [알아두세요] 안내 박스. */
export const NoticeBoxFooter = ({
  title = "알아두세요",
  items,
  className,
  defaultOpen = true,
}: NoticeBoxFooterProps) => {
  const { open, toggle } = useDisclosure(defaultOpen)
  return (
    <section
      className={cn("border border-border p-4", className)}
      aria-label={title}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <h2 className="text-base font-bold text-ink">{title}</h2>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-ink-faint transition-transform",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex gap-1.5 text-xs leading-relaxed text-ink-muted"
            >
              <span aria-hidden="true">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

import * as React from "react"
import { Bookmark } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { cn } from "@/shared/lib/utils"

type SearchPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  /** FormRow rows forming the condition table. */
  children: React.ReactNode
  onSearch?: () => void
  onReset?: () => void
  onSaveCondition?: () => void
  /** Label for the primary action. Defaults to "조회". */
  searchLabel?: string
}

/**
 * Query condition container: a save-condition link (top-right), a bordered
 * FormRow group, and centered [조회] [초기화] actions at the bottom.
 */
export const SearchPanel = ({
  children,
  onSearch,
  onReset,
  onSaveCondition,
  searchLabel = "조회",
  className,
  ...props
}: SearchPanelProps) => {
  return (
    <div className={cn("mb-6", className)} {...props}>
      <div className="mb-2 flex items-center justify-end">
        <button
          type="button"
          onClick={onSaveCondition}
          className="inline-flex items-center gap-1 text-base text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          조회조건저장
        </button>
      </div>

      <div>{children}</div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <Button
          variant="primary"
          size="md"
          className="min-w-[100px]"
          onClick={onSearch}
        >
          {searchLabel}
        </Button>
        <Button
          variant="secondary"
          size="md"
          className="min-w-[100px]"
          onClick={onReset}
        >
          초기화
        </Button>
      </div>
    </div>
  )
}

import * as React from "react"

/** 접이식 섹션·패널의 열림 상태를 다룬다. 비제어(내부 state) 또는 제어(open/onOpenChange) 둘 다 지원한다. */
export function useDisclosure(
  defaultOpen = false,
  controlled?: { open: boolean; onOpenChange: (open: boolean) => void },
) {
  const [openState, setOpenState] = React.useState(defaultOpen)
  const open = controlled?.open ?? openState

  const toggle = React.useCallback(() => {
    const next = !open
    controlled?.onOpenChange(next)
    if (!controlled) setOpenState(next)
  }, [open, controlled])

  return { open, toggle }
}

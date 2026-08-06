import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { GridSearchModal } from "@/shared/ui/grid-search-modal"
import { Button } from "@/shared/ui/button"

const GridSearchModalDemo = () => {
  const [open, setOpen] = React.useState(false)
  const [applied, setApplied] = React.useState<{
    fieldKey: string
    keyword: string
  } | null>(null)

  return (
    <div className="flex flex-col items-start gap-3">
      <Button onClick={() => setOpen(true)}>검색 열기</Button>
      {applied && (
        <p className="text-base text-ink-muted">
          검색조건: {applied.fieldKey} / {applied.keyword || "(전체)"}
        </p>
      )}
      <GridSearchModal
        open={open}
        onClose={() => setOpen(false)}
        fields={[
          { key: "alias", label: "계좌명" },
          { key: "accountNo", label: "계좌번호" },
        ]}
        onApply={(fieldKey, keyword) => setApplied({ fieldKey, keyword })}
      />
    </div>
  )
}

const meta = {
  title: "shared/ui/GridSearchModal",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GridSearchModalDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => <GridSearchModalDemo />,
}

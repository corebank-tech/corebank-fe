import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { GridToolbar } from "@/widgets/query/grid-toolbar"
import { formatDate, formatDateTime } from "@/shared/lib/format"
import { addMonths } from "@/shared/lib/date"
import { MOCK_NOW, MOCK_TODAY } from "@/shared/config/mock-clock"

type GridToolbarDemoProps = React.ComponentProps<typeof GridToolbar>

const GridToolbarDemo = (props: GridToolbarDemoProps) => {
  const [pageSize, setPageSize] = React.useState(props.pageSize)
  return (
    <div className="w-240">
      <GridToolbar
        {...props}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

const meta = {
  title: "widgets/query/GridToolbar",
  component: GridToolbarDemo,
  args: {
    totalCount: 42,
    pageSize: 10,
    periodLabel: `${formatDate(addMonths(MOCK_TODAY, -1))} ~ ${formatDate(MOCK_TODAY)}`,
    baseTimeLabel: formatDateTime(MOCK_NOW),
  },
} satisfies Meta<typeof GridToolbarDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutPeriod: Story = {
  args: { periodLabel: undefined, totalCount: 7 },
}

import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { GridToolbar } from "@/widgets/query/grid-toolbar"
import { formatDate, formatDateTime } from "@/shared/lib/format"
import { addMonths } from "@/shared/lib/date"
import { getNow, getToday } from "@/shared/config/clock"

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
    periodLabel: `${formatDate(addMonths(getToday(), -1))} ~ ${formatDate(getToday())}`,
    baseTimeLabel: formatDateTime(getNow()),
  },
} satisfies Meta<typeof GridToolbarDemo>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithoutPeriod: Story = {
  args: { periodLabel: undefined, totalCount: 7 },
}

/**
 * 서버 페이징 화면(B-03·E-04·E-05·G-04·G-05)이 넘기는 조합. 서버가 페이지 크기를
 * 화이트리스트로 막아 "전체"를 요청할 수 없어 선택지를 내린 상태다.
 * 자세한 배경은 `showAllOption` prop 주석 참고.
 */
export const WithoutAllOption: Story = {
  args: { showAllOption: false },
}

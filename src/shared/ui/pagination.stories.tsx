import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Pagination } from "@/shared/ui/pagination"

type PaginationDemoProps = {
  totalPages: number
  initialPage?: number
}

const PaginationDemo = ({
  totalPages,
  initialPage = 1,
}: PaginationDemoProps) => {
  const [page, setPage] = React.useState(initialPage)
  return (
    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
  )
}

const meta = {
  title: "shared/ui/Pagination",
  parameters: { layout: "padded" },
} satisfies Meta<typeof PaginationDemo>

export default meta
type Story = StoryObj<typeof meta>

export const MultiplePages: Story = {
  render: () => <PaginationDemo totalPages={24} />,
}

export const SinglePage: Story = {
  render: () => <PaginationDemo totalPages={1} />,
}

export const FirstPage: Story = {
  name: "첫 페이지 (이전 묶음 비활성화)",
  render: () => <PaginationDemo totalPages={24} initialPage={1} />,
}

export const LastPage: Story = {
  name: "마지막 페이지 (다음 묶음 비활성화)",
  render: () => <PaginationDemo totalPages={24} initialPage={24} />,
}

export const BlockBoundary: Story = {
  name: "블록 경계 (10페이지 묶음 전환)",
  render: () => <PaginationDemo totalPages={35} initialPage={10} />,
  parameters: {
    docs: {
      description: {
        story:
          "기본 blockSize=10 기준 마지막 페이지(10)에서 [다음 페이지 묶음]을 누르면 11~20 블록으로 전환된다.",
      },
    },
  },
}

export const ManyPages: Story = {
  name: "대량 페이지 (여러 블록 넘김)",
  render: () => <PaginationDemo totalPages={250} initialPage={125} />,
}

export const NoRender: Story = {
  name: "결과 0건 (렌더링 안 함)",
  render: () => <PaginationDemo totalPages={0} />,
  parameters: {
    docs: {
      description: {
        story:
          "totalPages가 0 이하이면 Pagination은 null을 반환한다. 아래가 빈 화면인 것이 정상 동작이다.",
      },
    },
  },
}

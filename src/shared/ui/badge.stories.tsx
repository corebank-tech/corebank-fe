import type { Meta, StoryObj } from "@storybook/react-vite"
import { Badge } from "@/shared/ui/badge"

const meta = {
  title: "shared/ui/Badge",
  component: Badge,
  args: { children: "정상" },
  parameters: {
    docs: {
      description: {
        component:
          "상태를 나타내는 색 톤(variant) 축. 화면별 상태값 → variant 매핑은 entities/*/lib/status-badge.ts(계좌·이체·예약·자동이체·상품 카테고리 등)에서 관리하며, 화면에 매핑 표를 다시 만들지 않는다.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "neutral", "success", "danger", "warning"],
      description:
        "상태 톤. 화면별 상태값 → variant 매핑은 entities/*/lib/status-badge.ts를 따른다.",
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: "primary" },
  parameters: {
    docs: {
      description: {
        story:
          "특별한 상태 의미 없이 구분만 필요한 기본 강조 톤. getProductCategoryBadgeVariant가 정기예금 카테고리에 쓴다.",
      },
    },
  },
}
export const Neutral: Story = {
  args: { variant: "neutral", children: "해지" },
  parameters: {
    docs: {
      description: {
        story:
          "종료된 중립 상태에 쓴다. getReservationStatusBadgeVariant의 예약이체 취소, getAutoTransferStatusBadgeVariant의 자동이체 종료가 이 톤을 쓴다.",
      },
    },
  },
}
export const Success: Story = {
  args: { variant: "success" },
  parameters: {
    docs: {
      description: {
        story:
          "정상 처리된 상태에 쓴다. 계좌 정상, 이체 정상, 예약 완료, 자동이체 정상, 정기적금 카테고리 등 대부분의 status-badge.ts 매핑이 이 톤을 기본으로 쓴다.",
      },
    },
  },
}
export const Danger: Story = {
  args: { variant: "danger", children: "실패" },
  parameters: {
    docs: {
      description: {
        story:
          "오류·실패·해지 상태에 쓴다. 계좌 해지, 이체 오류, 예약 실패, 자동이체 오류·해지가 이 톤을 쓴다.",
      },
    },
  },
}
export const Warning: Story = {
  args: { variant: "warning", children: "대기" },
  parameters: {
    docs: {
      description: {
        story:
          "대기·처리 중 상태에 쓴다. 계좌 거래정지, 이체 처리중, 예약 대기가 이 톤을 쓴다.",
      },
    },
  },
}

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Badge variant="primary">정상</Badge>
      <Badge variant="neutral">해지</Badge>
      <Badge variant="success">완료</Badge>
      <Badge variant="danger">실패</Badge>
      <Badge variant="warning">대기</Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "5개 variant를 한 화면에 나열해 톤 간 대비를 비교한다.",
      },
    },
  },
}

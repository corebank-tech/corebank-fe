import type { Meta, StoryObj } from "@storybook/react-vite"
import { Select } from "@/shared/ui/select"

const meta = {
  title: "shared/ui/Select",
  component: Select,
  parameters: {
    docs: {
      description: {
        component:
          "정해진 옵션 중 하나를 고르는 드롭다운. 조회 조건의 구분값처럼 선택지가 고정된 값에 쓴다.",
      },
    },
  },
  argTypes: {
    invalid: {
      control: "boolean",
      description: "검증 실패 상태. 보더를 danger 톤으로 바꾼다.",
    },
  },
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

const Options = () => (
  <>
    <option value="all">전체</option>
    <option value="deposit">입금</option>
    <option value="withdraw">출금</option>
  </>
)

export const Default: Story = {
  render: (args) => (
    <Select {...args}>
      <Options />
    </Select>
  ),
  parameters: {
    docs: {
      description: { story: "옵션이 선택 가능한 기본 상태." },
    },
  },
}

export const Invalid: Story = {
  args: { invalid: true },
  render: (args) => (
    <Select {...args}>
      <Options />
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "폼 검증 실패 시 쓴다. 필수 항목을 고르지 않고 제출했을 때 등 — 에러 메시지는 화면에 하드코딩하지 않는다(REQ-CMN-008).",
      },
    },
  },
}

export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <Select {...args}>
      <Options />
    </Select>
  ),
  parameters: {
    docs: {
      description: {
        story: "조건 미충족 등으로 값을 바꿀 수 없을 때 쓴다.",
      },
    },
  },
}

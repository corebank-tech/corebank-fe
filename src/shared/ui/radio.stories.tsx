import type { Meta, StoryObj } from "@storybook/react-vite"
import { Radio } from "@/shared/ui/radio"

const meta = {
  title: "shared/ui/Radio",
  component: Radio,
  args: { name: "period", label: "1개월" },
  parameters: {
    docs: {
      description: {
        component:
          "같은 name으로 묶인 여러 옵션 중 하나만 고를 수 있는 컨트롤. 기간·조회 구분처럼 상호 배타적인 선택지에 쓴다.",
      },
    },
  },
  argTypes: {
    label: {
      control: "text",
      description: "라디오 오른쪽에 표시되는 라벨.",
    },
  },
} satisfies Meta<typeof Radio>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: "선택되지 않은 기본 상태." },
    },
  },
}
export const Checked: Story = {
  args: { defaultChecked: true },
  parameters: {
    docs: {
      description: { story: "선택된 상태. 안쪽 점과 primary 보더로 표시한다." },
    },
  },
}
export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story: "조건 미충족 등으로 해당 옵션을 고를 수 없을 때 쓴다.",
      },
    },
  },
}

export const Group: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Radio name="period-group" label="1개월" defaultChecked />
      <Radio name="period-group" label="3개월" />
      <Radio name="period-group" label="6개월" />
      <Radio name="period-group" label="12개월" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "실제 사용 형태 — 같은 name을 공유하는 여러 Radio를 나열해 하나만 선택되도록 묶는다.",
      },
    },
  },
}

import type { Meta, StoryObj } from "@storybook/react-vite"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"

const meta = {
  title: "shared/ui/FormRow",
  component: FormRow,
  parameters: { layout: "padded" },
  args: { label: "받는분 계좌번호" },
  argTypes: {
    required: {
      control: "boolean",
      description: "라벨 앞에 [필수] 배지를 붙인다.",
    },
    labelWidth: {
      control: "number",
      description: "라벨 컬럼 고정 폭(px). 기본 160.",
    },
  },
} satisfies Meta<typeof FormRow>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="w-160">
      <FormRow {...args}>
        <Input placeholder="계좌번호를 입력하세요" />
      </FormRow>
    </div>
  ),
}

export const Required: Story = {
  args: { required: true },
  render: (args) => (
    <div className="w-160">
      <FormRow {...args}>
        <Input placeholder="계좌번호를 입력하세요" />
      </FormRow>
    </div>
  ),
}

export const Stacked: Story = {
  render: () => (
    <div className="w-160">
      <FormRow label="받는분 계좌번호" required>
        <Input placeholder="계좌번호를 입력하세요" />
      </FormRow>
      <FormRow label="이체 금액" required>
        <Input placeholder="0" />
      </FormRow>
      <FormRow label="받는분 메모">
        <Input placeholder="메모를 입력하세요" />
      </FormRow>
    </div>
  ),
}

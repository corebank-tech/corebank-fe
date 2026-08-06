import type { Meta, StoryObj } from "@storybook/react-vite"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"

const meta = {
  title: "shared/ui/FormSection",
  component: FormSection,
  parameters: { layout: "padded" },
  args: { title: "이체 정보" },
} satisfies Meta<typeof FormSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="w-160">
      <FormSection {...args}>
        <FormRow label="받는분 계좌번호" required>
          <Input placeholder="계좌번호를 입력하세요" />
        </FormRow>
        <FormRow label="이체 금액" required>
          <Input placeholder="0" />
        </FormRow>
      </FormSection>
    </div>
  ),
}

export const WithAction: Story = {
  args: { action: <Button size="sm">계좌 조회</Button> },
  render: (args) => (
    <div className="w-160">
      <FormSection {...args}>
        <FormRow label="받는분 계좌번호" required>
          <Input placeholder="계좌번호를 입력하세요" />
        </FormRow>
      </FormSection>
    </div>
  ),
}

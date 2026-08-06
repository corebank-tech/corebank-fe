import type { Meta, StoryObj } from "@storybook/react-vite"
import { TermsAgreement } from "@/widgets/terms-agreement"
import { SIGNUP_TERMS } from "@/entities/auth"

const meta = {
  title: "widgets/TermsAgreement",
  component: TermsAgreement,
  parameters: { layout: "padded" },
  args: { terms: SIGNUP_TERMS },
} satisfies Meta<typeof TermsAgreement>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="w-240">
      <TermsAgreement {...args} />
    </div>
  ),
}

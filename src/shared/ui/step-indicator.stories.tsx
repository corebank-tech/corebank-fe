import type { Meta, StoryObj } from "@storybook/react-vite"
import { StepIndicator } from "@/shared/ui/step-indicator"

const STEPS = ["정보입력", "정보확인 및 인증", "완료"]

const meta = {
  title: "shared/ui/StepIndicator",
  component: StepIndicator,
  args: { steps: STEPS },
  parameters: { layout: "padded" },
} satisfies Meta<typeof StepIndicator>

export default meta
type Story = StoryObj<typeof meta>

export const FirstStep: Story = { args: { currentStep: 1 } }
export const SecondStep: Story = { args: { currentStep: 2 } }
export const LastStep: Story = { args: { currentStep: 3 } }

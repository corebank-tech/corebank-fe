import type { Meta, StoryObj } from "@storybook/react-vite"
import { StepLayout } from "@/shared/ui/step-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { MOCK_PAYEE_NAME, MOCK_PAYEE_ACCOUNTS } from "@/entities/transfer"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"

const STEPS = ["정보입력", "정보확인 및 인증", "완료"]
const DEMO_PAYEE_ACCOUNT_NO = MOCK_PAYEE_ACCOUNTS[0].accountNo

const meta = {
  title: "shared/ui/StepLayout",
  component: StepLayout,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StepLayout>

export default meta
type Story = StoryObj<typeof meta>

export const InputStep: Story = {
  args: {
    steps: STEPS,
    currentStep: 1,
    title: "즉시이체",
    notice: [
      "1회 이체한도는 5,000,000원입니다.",
      "타행이체는 영업일 09:00~23:30에만 가능합니다.",
    ],
    footer: (
      <>
        <Button variant="secondary">취소</Button>
        <Button>다음</Button>
      </>
    ),
    children: (
      <FormSection title="이체 정보">
        <FormRow label="받는분 계좌번호" required>
          <Input placeholder="계좌번호를 입력하세요" />
        </FormRow>
        <FormRow label="이체 금액" required>
          <Input placeholder="0" />
        </FormRow>
      </FormSection>
    ),
  },
}

export const ConfirmStep: Story = {
  args: {
    steps: STEPS,
    currentStep: 2,
    title: "즉시이체",
    footer: (
      <>
        <Button variant="secondary">취소</Button>
        <Button>이체하기</Button>
      </>
    ),
    children: (
      <ConfirmSummary
        columns={[
          { label: "받는분", value: MOCK_PAYEE_NAME },
          {
            label: "받는분 계좌번호",
            value: formatAccountNo(DEMO_PAYEE_ACCOUNT_NO),
          },
          {
            label: "이체금액(원)",
            value: formatAmount(500_000, { suffix: false }),
            emphasis: true,
          },
        ]}
      />
    ),
  },
}

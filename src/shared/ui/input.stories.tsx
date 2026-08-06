import type { Meta, StoryObj } from "@storybook/react-vite"
import { Input } from "@/shared/ui/input"

const DEMO_ACCOUNT_NO = "110-234-567890"

const meta = {
  title: "shared/ui/Input",
  component: Input,
  args: { placeholder: "계좌번호를 입력하세요" },
  parameters: {
    docs: {
      description: {
        component:
          "텍스트를 입력받는 기본 필드. React Hook Form + Zod로 검증하며, invalid prop으로 검증 실패 상태를 표시한다.",
      },
    },
  },
  argTypes: {
    invalid: {
      control: "boolean",
      description: "검증 실패 상태. 보더·포커스 링을 danger 톤으로 바꾼다.",
    },
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  parameters: {
    docs: {
      description: { story: "값이 없는 빈 상태. placeholder만 표시된다." },
    },
  },
}
export const WithValue: Story = {
  args: { defaultValue: DEMO_ACCOUNT_NO },
  parameters: {
    docs: {
      description: { story: "값이 채워진 상태." },
    },
  },
}
export const Invalid: Story = {
  args: { invalid: true, defaultValue: DEMO_ACCOUNT_NO.slice(0, 7) },
  parameters: {
    docs: {
      description: {
        story:
          "폼 검증 실패 시 쓴다. 에러 메시지는 서버가 준 ApiError.message 또는 Zod 검증 메시지를 그대로 쓰고, 화면에 하드코딩하지 않는다(REQ-CMN-008).",
      },
    },
  },
}
export const Disabled: Story = {
  args: { disabled: true, defaultValue: DEMO_ACCOUNT_NO },
  parameters: {
    docs: {
      description: {
        story: "조회 결과 필드처럼 값을 수정할 수 없을 때 쓴다.",
      },
    },
  },
}

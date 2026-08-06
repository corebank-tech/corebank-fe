import type { Meta, StoryObj } from "@storybook/react-vite"
import { Alert } from "@/shared/ui/alert"

const PLACEHOLDER_TEXT = "예시 안내 문구가 표시되는 영역입니다."

const meta = {
  title: "shared/ui/Alert",
  component: Alert,
  args: { children: PLACEHOLDER_TEXT },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "안내 강조 톤(variant) 축. 실 화면에서는 성공·실패 결과 안내에 success·danger만 쓴다 — info·warning은 design-system/primitive-gallery 카탈로그 화면에만 등장하며 실 업무 화면에서는 쓰지 않는다.",
      },
    },
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["info", "success", "warning", "danger"],
      description:
        "안내 톤. 실 화면에서는 success·danger만 쓴다(폼 검증 안내).",
    },
    title: {
      control: "text",
    },
  },
} satisfies Meta<typeof Alert>

export default meta
type Story = StoryObj<typeof meta>

export const Info: Story = {
  args: { variant: "info", title: "안내" },
  parameters: {
    docs: {
      description: {
        story:
          "정보 전달용 톤. 카탈로그 완전성을 위해 남겨둔 축으로, 실 화면에서는 사용하지 않는다.",
      },
    },
  },
}
export const Success: Story = {
  args: {
    variant: "success",
    title: "완료",
    children: "이체가 완료되었습니다.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "처리가 정상 완료됐을 때 쓴다. 아이디 찾기(a07) 조회 결과, 비밀번호 재설정(a08) 완료, 마이페이지(f01) 정보·비밀번호 변경, 계좌 별칭·해지 순서·출금계좌·비밀번호 변경 화면의 성공 안내가 이 톤을 쓴다.",
      },
    },
  },
}
export const Warning: Story = {
  args: {
    variant: "warning",
    title: "주의",
    children: PLACEHOLDER_TEXT,
  },
  parameters: {
    docs: {
      description: {
        story:
          "주의가 필요하지만 오류는 아닌 상태를 나타낸다. 카탈로그 완전성을 위해 남겨둔 축으로, 실 화면에서는 사용하지 않는다.",
      },
    },
  },
}
export const Danger: Story = {
  args: {
    variant: "danger",
    title: "오류",
    children: "비밀번호가 일치하지 않습니다.",
  },
  parameters: {
    docs: {
      description: {
        story:
          "폼 검증 실패 등 오류 상황에 쓴다. 계좌 비밀번호 변경(b04)의 거래정지 계좌 안내가 이 톤을 쓴다.",
      },
    },
  },
}

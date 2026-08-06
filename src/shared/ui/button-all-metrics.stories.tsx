import type { Meta, StoryObj } from "@storybook/react-vite"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
] as const
const BUTTON_SIZES = ["sm", "md", "lg"] as const

type ButtonMatrixProps = {
  disabled?: boolean
}

const ButtonMatrix = ({ disabled }: ButtonMatrixProps) => {
  return (
    <table className="border-collapse">
      <thead>
        <tr>
          <th className="px-6 py-4" />
          {BUTTON_SIZES.map((size) => (
            <th
              key={size}
              className="px-6 py-4 text-left text-xs text-ink-faint"
            >
              {size}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {BUTTON_VARIANTS.map((variant) => (
          <tr key={variant}>
            <th className="px-6 py-4 text-left text-xs text-ink-faint">
              {variant}
            </th>
            {BUTTON_SIZES.map((size) => (
              <td key={size} className="px-6 py-4">
                <Button variant={variant} size={size} disabled={disabled}>
                  {PLACEHOLDER_LABEL}
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const meta = {
  title: "shared/ui/Button/All Metrics",
  component: ButtonMatrix,
  parameters: {
    docs: {
      description: {
        component:
          "variant × size 5×3 조합을 한 화면에서 비교한다. 3번째 축(status)은 정적인 표로 굳히지 않고 Controls 패널의 disabled 토글로 확인한다 — 그리드 전체가 함께 비활성 상태로 다시 렌더된다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "그리드 전체를 비활성 상태로 전환한다.",
    },
  },
} satisfies Meta<typeof ButtonMatrix>

export default meta
type Story = StoryObj<typeof meta>

export const AllVariants: Story = {
  name: "전체 조합",
  args: { disabled: false },
  parameters: {
    docs: {
      description: {
        story:
          "기본 상태의 전체 조합. Controls에서 disabled를 켜면 아래 그리드가 통째로 비활성 상태로 바뀐다.",
      },
    },
  },
}

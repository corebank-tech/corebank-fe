import type { Meta, StoryObj } from "@storybook/react-vite"
import { Chip } from "@/shared/ui/chip"

const PLACEHOLDER_LABEL = "코어뱅크"

const CHIP_TONES = [
  "default",
  "active",
  "primary",
  "primary-tint",
  "muted",
] as const
const CHIP_SIZES = ["sm", "md", "lg"] as const

type ChipMatrixProps = {
  disabled?: boolean
}

const ChipMatrix = ({ disabled }: ChipMatrixProps) => {
  return (
    <table className="border-collapse">
      <thead>
        <tr>
          <th className="px-6 py-4" />
          {CHIP_SIZES.map((size) => (
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
        {CHIP_TONES.map((tone) => (
          <tr key={tone}>
            <th className="px-6 py-4 text-left text-xs text-ink-faint">
              {tone}
            </th>
            {CHIP_SIZES.map((size) => (
              <td key={size} className="px-6 py-4">
                <Chip tone={tone} size={size} disabled={disabled}>
                  {PLACEHOLDER_LABEL}
                </Chip>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const meta = {
  title: "shared/ui/Chip/All Metrics",
  component: ChipMatrix,
  parameters: {
    docs: {
      description: {
        component:
          "tone × size 5×3 조합을 한 화면에서 비교한다. 3번째 축(status)은 정적인 표로 굳히지 않고 Controls 패널의 disabled 토글로 확인한다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "그리드 전체를 비활성 상태로 전환한다.",
    },
  },
} satisfies Meta<typeof ChipMatrix>

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

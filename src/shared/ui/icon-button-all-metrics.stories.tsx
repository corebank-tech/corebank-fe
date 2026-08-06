import type { Meta, StoryObj } from "@storybook/react-vite"
import { X } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"

const ICON_BUTTON_SIZES = ["sm", "md", "lg"] as const
const ICON_BUTTON_SHAPES = ["square", "circle"] as const

type IconButtonMatrixProps = {
  disabled?: boolean
}

const IconButtonMatrix = ({ disabled }: IconButtonMatrixProps) => {
  return (
    <table className="border-collapse">
      <thead>
        <tr>
          <th className="px-6 py-4" />
          {ICON_BUTTON_SHAPES.map((shape) => (
            <th
              key={shape}
              className="px-6 py-4 text-left text-xs text-ink-faint"
            >
              {shape}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ICON_BUTTON_SIZES.map((size) => (
          <tr key={size}>
            <th className="px-6 py-4 text-left text-xs text-ink-faint">
              {size}
            </th>
            {ICON_BUTTON_SHAPES.map((shape) => (
              <td key={shape} className="px-6 py-4">
                <IconButton
                  size={size}
                  shape={shape}
                  disabled={disabled}
                  aria-label="닫기"
                  className="border border-border-strong text-ink-muted hover:bg-surface"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const meta = {
  title: "shared/ui/IconButton/All Metrics",
  component: IconButtonMatrix,
  parameters: {
    docs: {
      description: {
        component:
          "size × shape 3×2 조합을 한 화면에서 비교한다. 3번째 축(status)은 정적인 표로 굳히지 않고 Controls 패널의 disabled 토글로 확인한다 — 그리드 전체가 함께 비활성 상태로 다시 렌더된다. 단 이 그리드의 className에는 disabled 스타일이 없어(Status 스토리 참고) 토글을 켜도 시각적으로는 동일하게 보인다.",
      },
    },
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "그리드 전체를 비활성 상태로 전환한다.",
    },
  },
} satisfies Meta<typeof IconButtonMatrix>

export default meta
type Story = StoryObj<typeof meta>

export const AllVariants: Story = {
  name: "전체 조합",
  args: { disabled: false },
  parameters: {
    docs: {
      description: {
        story:
          "기본 상태의 전체 조합. Controls에서 disabled를 켜면 클릭은 막히지만(색은 그대로) 아래 그리드 전체에 disabled 속성이 전달된다.",
      },
    },
  },
}

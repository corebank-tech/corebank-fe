import type { Meta, StoryObj } from "@storybook/react-vite"
import { Checkbox } from "@/shared/ui/checkbox"

const CHECKED_VALUES = [false, true] as const
const DISABLED_VALUES = [false, true] as const

const CheckboxMatrix = () => {
  return (
    <table className="border-collapse">
      <thead>
        <tr>
          <th className="px-6 py-4" />
          {DISABLED_VALUES.map((disabled) => (
            <th
              key={String(disabled)}
              className="px-6 py-4 text-left text-xs text-ink-faint"
            >
              {disabled ? "disabled" : "enabled"}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {CHECKED_VALUES.map((checked) => (
          <tr key={String(checked)}>
            <th className="px-6 py-4 text-left text-xs text-ink-faint">
              {checked ? "checked" : "unchecked"}
            </th>
            {DISABLED_VALUES.map((disabled) => (
              <td key={String(disabled)} className="px-6 py-4">
                <Checkbox
                  key={`${checked}-${disabled}`}
                  defaultChecked={checked}
                  disabled={disabled}
                  aria-label={`${checked ? "checked" : "unchecked"}-${disabled ? "disabled" : "enabled"}`}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const meta = {
  title: "shared/ui/Checkbox/All Metrics",
  component: CheckboxMatrix,
  parameters: {
    docs: {
      description: {
        component:
          "checked × disabled 2×2 전체 조합. 실 화면에서는 이 중 checked×enabled·unchecked×enabled·unchecked×disabled(필수 약관 잠금) 조합만 쓰고 checked×disabled 조합은 실사용처가 없지만, 카탈로그 완전성을 위해 남겨둔다. 현재 구현엔 disabled 전용 시각 스타일이 없어 같은 checked 값의 두 칸(enabled/disabled)이 동일하게 보인다 — Checkbox/Status 스토리 참고.",
      },
    },
  },
} satisfies Meta<typeof CheckboxMatrix>

export default meta
type Story = StoryObj<typeof meta>

export const AllCombinations: Story = {
  name: "전체 조합",
}

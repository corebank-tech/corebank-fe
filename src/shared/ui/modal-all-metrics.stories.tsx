import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"

const PLACEHOLDER_LABEL = "코어뱅크"

const MODAL_TONES = ["primary", "danger"] as const
const MODAL_SIZES = ["sm", "md", "lg"] as const

const ModalMatrix = () => {
  const [openKey, setOpenKey] = React.useState<string | null>(null)

  return (
    <table className="border-collapse">
      <thead>
        <tr>
          <th className="px-6 py-4" />
          {MODAL_SIZES.map((size) => (
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
        {MODAL_TONES.map((tone) => (
          <tr key={tone}>
            <th className="px-6 py-4 text-left text-xs text-ink-faint">
              {tone}
            </th>
            {MODAL_SIZES.map((size) => {
              const key = `${tone}-${size}`
              return (
                <td key={size} className="px-6 py-4">
                  <Button size="sm" onClick={() => setOpenKey(key)}>
                    {PLACEHOLDER_LABEL}
                  </Button>
                  <Modal
                    open={openKey === key}
                    onClose={() => setOpenKey(null)}
                    title={PLACEHOLDER_LABEL}
                    tone={tone}
                    size={size}
                    footer={
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => setOpenKey(null)}
                        >
                          취소
                        </Button>
                        <Button onClick={() => setOpenKey(null)}>확인</Button>
                      </>
                    }
                  >
                    <p className="text-base text-ink">{PLACEHOLDER_LABEL}</p>
                  </Modal>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const meta = {
  title: "shared/ui/Modal/All Metrics",
  component: ModalMatrix,
  parameters: {
    docs: {
      description: {
        component:
          "tone × size 2×3 조합을 한 화면에서 비교한다. 모달은 한 번에 하나만 열 수 있어 Button/Chip과 달리 정적 그리드 대신 조합별 트리거 버튼 그리드로 표시한다 — 버튼을 눌러 해당 조합의 모달을 확인한다.",
      },
    },
  },
} satisfies Meta<typeof ModalMatrix>

export default meta
type Story = StoryObj<typeof meta>

export const AllVariants: Story = {
  name: "전체 조합",
  parameters: {
    docs: {
      description: {
        story:
          "버튼 6개가 각각 tone×size 조합 하나에 대응한다. 클릭하면 그 조합의 모달이 열린다.",
      },
    },
  },
}

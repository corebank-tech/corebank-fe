import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { TermMonthsField, JoinAmountField } from "@/pages/product/fields"

const meta = {
  title: "pages/product/JoinFields",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const TermMonthsFieldDemo = () => {
  const [value, setValue] = React.useState<number | null>(12)
  return <TermMonthsField value={value} onChange={setValue} min={6} max={36} />
}

export const TermMonths: Story = {
  render: () => <TermMonthsFieldDemo />,
}

const JoinAmountFieldDemo = () => {
  const [value, setValue] = React.useState<number | null>(5_000_000)
  return (
    <JoinAmountField
      value={value}
      onChange={setValue}
      min={100_000}
      max={500_000_000}
      withdrawable={12_000_000}
    />
  )
}

export const JoinAmount: Story = {
  render: () => <JoinAmountFieldDemo />,
}

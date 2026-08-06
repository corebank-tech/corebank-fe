import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  AccountNumberField,
  AccountPasswordField,
  AmountField,
  DayOfMonthField,
  MemoField,
  TransferCycleField,
  TransferDateField,
  TransferEndDateField,
  type TransferCycleMonths,
  WithdrawAccountField,
} from "@/widgets/transfer/transfer-fields"
import { FormRow } from "@/shared/ui/form-row"
import {
  MOCK_PAYEE_ACCOUNTS,
  MOCK_TRANSFER_ACCOUNTS,
  MOCK_TRANSFER_LIMITS,
} from "@/entities/transfer"
import { MOCK_TODAY } from "@/shared/config/mock-clock"

const WithdrawAccountFieldDemo = () => {
  const [value, setValue] = React.useState(MOCK_TRANSFER_ACCOUNTS[0]?.accountNo)
  return (
    <FormRow label="출금계좌">
      <WithdrawAccountField
        options={MOCK_TRANSFER_ACCOUNTS}
        value={value}
        onChange={setValue}
      />
    </FormRow>
  )
}

const AccountPasswordFieldDemo = () => {
  const [value, setValue] = React.useState("")
  return (
    <FormRow label="계좌비밀번호">
      <AccountPasswordField value={value} onChange={setValue} />
    </FormRow>
  )
}

const AccountNumberFieldDemo = () => {
  const [value, setValue] = React.useState(MOCK_PAYEE_ACCOUNTS[0].accountNo)
  return (
    <FormRow label="받는분 계좌번호">
      <AccountNumberField
        value={value}
        onChange={setValue}
        confirmed
        holderName={MOCK_PAYEE_ACCOUNTS[0].payeeName}
      />
    </FormRow>
  )
}

const AccountNumberFieldErrorDemo = () => {
  const [value, setValue] = React.useState("999999999999")
  return (
    <FormRow label="받는분 계좌번호">
      <AccountNumberField
        value={value}
        onChange={setValue}
        error="존재하지 않는 계좌입니다. 계좌번호를 다시 확인하세요."
      />
    </FormRow>
  )
}

const AmountFieldDemo = () => {
  const [value, setValue] = React.useState<number | null>(500_000)
  return (
    <FormRow label="이체금액">
      <AmountField
        value={value}
        onChange={setValue}
        perTransferLimit={MOCK_TRANSFER_LIMITS.perTransfer}
        dailyRemaining={
          MOCK_TRANSFER_LIMITS.perDay - MOCK_TRANSFER_LIMITS.usedToday
        }
        fullAmount={MOCK_TRANSFER_ACCOUNTS[0]?.withdrawable}
      />
    </FormRow>
  )
}

const MemoFieldDemo = () => {
  const [value, setValue] = React.useState("생활비")
  return (
    <FormRow label="받는통장 표시">
      <MemoField value={value} onChange={setValue} placeholder="예) 생활비" />
    </FormRow>
  )
}

const TransferDateFieldDemo = () => {
  const [value, setValue] = React.useState("2026-07-24")
  return (
    <FormRow label="예약일">
      <TransferDateField value={value} onChange={setValue} today={MOCK_TODAY} />
    </FormRow>
  )
}

const TransferCycleFieldDemo = () => {
  const [value, setValue] = React.useState<TransferCycleMonths>(1)
  return (
    <FormRow label="이체주기">
      <TransferCycleField value={value} onChange={setValue} />
    </FormRow>
  )
}

const DayOfMonthFieldDemo = () => {
  const [value, setValue] = React.useState(25)
  return (
    <FormRow label="이체지정일">
      <DayOfMonthField value={value} onChange={setValue} />
    </FormRow>
  )
}

const TransferEndDateFieldDemo = () => {
  const [value, setValue] = React.useState("2027-07-24")
  return (
    <FormRow label="이체종료일">
      <TransferEndDateField
        value={value}
        onChange={setValue}
        startDate="2026-07-24"
      />
    </FormRow>
  )
}

const meta = {
  title: "widgets/transfer/TransferFields",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const WithdrawAccount: Story = {
  render: () => (
    <div className="w-200">
      <WithdrawAccountFieldDemo />
    </div>
  ),
}

export const AccountPassword: Story = {
  render: () => (
    <div className="w-200">
      <AccountPasswordFieldDemo />
    </div>
  ),
}

export const AccountNumber: Story = {
  render: () => (
    <div className="w-200">
      <AccountNumberFieldDemo />
    </div>
  ),
}

export const AccountNumberError: Story = {
  render: () => (
    <div className="w-200">
      <AccountNumberFieldErrorDemo />
    </div>
  ),
}

export const Amount: Story = {
  render: () => (
    <div className="w-200">
      <AmountFieldDemo />
    </div>
  ),
}

export const Memo: Story = {
  render: () => (
    <div className="w-200">
      <MemoFieldDemo />
    </div>
  ),
}

export const TransferDate: Story = {
  render: () => (
    <div className="w-200">
      <TransferDateFieldDemo />
    </div>
  ),
}

export const TransferCycle: Story = {
  render: () => (
    <div className="w-200">
      <TransferCycleFieldDemo />
    </div>
  ),
}

export const DayOfMonth: Story = {
  render: () => (
    <div className="w-200">
      <DayOfMonthFieldDemo />
    </div>
  ),
}

export const TransferEndDate: Story = {
  render: () => (
    <div className="w-200">
      <TransferEndDateFieldDemo />
    </div>
  ),
}

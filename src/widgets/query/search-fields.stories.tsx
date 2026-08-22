import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import {
  AccountSelectField,
  KeywordField,
  PeriodField,
  type PeriodPreset,
  RadioRowField,
  type RadioRowOption,
} from "@/widgets/query/search-fields"
import { FormRow } from "@/shared/ui/form-row"
import { MOCK_TRANSFER_ACCOUNTS } from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { addDays } from "@/shared/lib/date"

const CONTENT_OPTIONS: RadioRowOption[] = [
  { label: "전체", value: "all" },
  { label: "입금", value: "deposit" },
  { label: "출금", value: "withdraw" },
]

const AccountSelectFieldDemo = () => {
  const [value, setValue] = React.useState(MOCK_TRANSFER_ACCOUNTS[0]?.accountNo)
  return (
    <FormRow label="조회계좌번호" htmlFor="story-account-select">
      <AccountSelectField
        id="story-account-select"
        options={MOCK_TRANSFER_ACCOUNTS}
        value={value}
        onChange={setValue}
      />
    </FormRow>
  )
}

const PeriodFieldDemo = () => {
  const [range, setRange] = React.useState({
    start: addDays(getToday(), -59),
    end: getToday(),
  })
  return (
    <FormRow label="조회기간">
      <PeriodField
        start={range.start}
        end={range.end}
        onChange={setRange}
        today={getToday()}
      />
    </FormRow>
  )
}

/** E-04처럼 미래 건을 다루는 화면이 넘기는 프리셋. */
const FUTURE_PRESETS: PeriodPreset[] = [
  { id: "today", label: "오늘", startOffset: 0, endOffset: 0 },
  { id: "1m", label: "1개월", startOffset: -30, endOffset: 0 },
  { id: "1m-ahead", label: "1개월 후", startOffset: 0, endOffset: 30 },
  { id: "3m-ahead", label: "3개월 후", startOffset: 0, endOffset: 90 },
]

const PeriodFieldFuturePresetsDemo = () => {
  const [range, setRange] = React.useState({
    start: addDays(getToday(), -60),
    end: addDays(getToday(), 60),
  })
  return (
    <FormRow label="조회기간">
      <PeriodField
        start={range.start}
        end={range.end}
        onChange={setRange}
        today={getToday()}
        presets={FUTURE_PRESETS}
      />
    </FormRow>
  )
}

const RadioRowFieldDemo = () => {
  const [value, setValue] = React.useState("all")
  return (
    <FormRow label="조회내용">
      <RadioRowField
        name="story-radio-row"
        options={CONTENT_OPTIONS}
        value={value}
        onChange={setValue}
      />
    </FormRow>
  )
}

const KeywordFieldDemo = () => {
  const [value, setValue] = React.useState("")
  return (
    <FormRow label="적요검색" htmlFor="story-keyword">
      <KeywordField id="story-keyword" value={value} onChange={setValue} />
    </FormRow>
  )
}

const meta = {
  title: "widgets/query/SearchFields",
  parameters: { layout: "padded" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AccountSelect: Story = {
  render: () => (
    <div className="w-200">
      <AccountSelectFieldDemo />
    </div>
  ),
}

export const Period: Story = {
  render: () => (
    <div className="w-200">
      <PeriodFieldDemo />
    </div>
  ),
}

export const PeriodFuturePresets: Story = {
  render: () => (
    <div className="w-200">
      <PeriodFieldFuturePresetsDemo />
    </div>
  ),
}

export const RadioRow: Story = {
  render: () => (
    <div className="w-200">
      <RadioRowFieldDemo />
    </div>
  ),
}

export const Keyword: Story = {
  render: () => (
    <div className="w-200">
      <KeywordFieldDemo />
    </div>
  ),
}

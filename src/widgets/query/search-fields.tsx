import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Radio } from "@/shared/ui/radio"
import { Chip } from "@/shared/ui/chip"
import { formatAccountNo, formatAmount } from "@/shared/lib/format"
import { addDays, parseISO, toISO } from "@/shared/lib/date"
import { QUERY_MAX_RANGE_DAYS } from "@/shared/config/policy"
import type { AccountOption } from "@/shared/types/account"
import { checkPeriodRange } from "@/entities/transaction"

/* ------------------------------------------------------------------ */
/* AccountSelectField                                                  */
/* ------------------------------------------------------------------ */

type AccountSelectOption = Pick<
  AccountOption,
  "alias" | "accountNo" | "balance"
>

type AccountSelectFieldProps = {
  id?: string
  options: AccountSelectOption[]
  value?: string
  onChange?: (accountNo: string) => void
}

export const AccountSelectField = ({
  id,
  options,
  value,
  onChange,
}: AccountSelectFieldProps) => {
  return (
    <Select
      id={id}
      className="max-w-md"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.accountNo} value={o.accountNo}>
          {`${o.alias} / ${formatAccountNo(o.accountNo)} / ${formatAmount(o.balance)}`}
        </option>
      ))}
    </Select>
  )
}

/* ------------------------------------------------------------------ */
/* PeriodField                                                         */
/* ------------------------------------------------------------------ */

/**
 * 기간 프리셋 칩 하나. 오프셋은 `today` 기준 일수이고 음수가 과거다.
 * 방향을 오프셋으로 들고 있어야 미래 건을 다루는 화면(E-04 예약이체 조회)이
 * 자기 프리셋을 넘길 수 있다.
 */
export type PeriodPreset = {
  id: string
  label: string
  startOffset: number
  endOffset: number
}

/** REQ-INQR-009: 조회기간 프리셋(오늘·1주일·1개월·3개월·6개월·1년). 전부 과거 방향이다. */
const PAST_PERIOD_PRESETS: PeriodPreset[] = [
  { id: "today", label: "오늘", startOffset: 0, endOffset: 0 },
  { id: "1w", label: "1주일", startOffset: -7, endOffset: 0 },
  { id: "1m", label: "1개월", startOffset: -30, endOffset: 0 },
  { id: "3m", label: "3개월", startOffset: -90, endOffset: 0 },
  { id: "6m", label: "6개월", startOffset: -182, endOffset: 0 },
  { id: "1y", label: "1년", startOffset: -QUERY_MAX_RANGE_DAYS, endOffset: 0 },
]

type PeriodFieldProps = {
  start: string
  end: string
  onChange: (range: { start: string; end: string }) => void
  /** Anchor "today" for chip presets, ISO yyyy-mm-dd. */
  today: string
  /** 기본은 REQ-INQR-009의 과거 방향 프리셋. 미래 건을 다루는 화면은 직접 넘긴다. */
  presets?: PeriodPreset[]
  /**
   * 조회기간 한도(일). **시작일 소급 한도와 기간 폭 한도를 겸한다** —
   * `checkPeriodRange`가 이 값 하나로 둘 다 잰다(REQ-INQR-010의 적용기준 열은
   * 시작일 기준, 인수기준 열은 폭 기준이다). 한쪽만 다른 화면이 생기면 prop을
   * 둘로 갈라야 한다.
   *
   * 기본은 POL-021(거래내역 조회 최대 1년). 다른 규칙을 따르는 화면은 자기 상수를
   * 넘긴다 — 여기서 고정하면 화면의 조회 차단 기준과 입력칸 표시가 갈라진다.
   */
  maxPeriodDays?: number
}

export const PeriodField = ({
  start,
  end,
  onChange,
  today,
  presets = PAST_PERIOD_PRESETS,
  maxPeriodDays = QUERY_MAX_RANGE_DAYS,
}: PeriodFieldProps) => {
  const applyPreset = (preset: PeriodPreset) => {
    onChange({
      start: addDays(today, preset.startOffset),
      end: addDays(today, preset.endOffset),
    })
  }

  const stepEnd = (unit: "year" | "month", delta: number) => {
    const d = parseISO(end)
    if (unit === "year") d.setFullYear(d.getFullYear() + delta)
    else d.setMonth(d.getMonth() + delta)
    onChange({ start, end: toISO(d) })
  }

  const activePreset = React.useMemo(
    () =>
      presets.find(
        (p) =>
          addDays(today, p.startOffset) === start &&
          addDays(today, p.endOffset) === end,
      )?.id ?? null,
    [presets, start, end, today],
  )

  const { incomplete, reversed, overLimit } = checkPeriodRange(
    start,
    end,
    today,
    maxPeriodDays,
  )
  // 한도는 화면마다 다를 수 있으므로 안내 문구도 넘겨받은 값에서 만든다.
  const limitLabel =
    maxPeriodDays % 365 === 0
      ? `${maxPeriodDays / 365}년`
      : `${maxPeriodDays}일`
  // JSX 텍스트로 두면 prettier가 표현식 앞뒤에서 줄을 바꾸며 공백을 지운다.
  const overLimitMessage = `조회기간은 최대 ${limitLabel} 이내여야 하고, 시작일도 오늘로부터 ${limitLabel} 이내여야 합니다. 기간을 다시 선택하세요.`

  const stepperGroup =
    "inline-flex items-stretch overflow-hidden rounded-md border border-border-strong"
  const stepper =
    "inline-flex h-8 w-7 items-center justify-center bg-surface-elevated text-ink-muted hover:bg-surface focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1">
          {presets.map((preset) => {
            const active = activePreset === preset.id
            return (
              <Chip
                key={preset.id}
                tone={active ? "active" : "default"}
                onClick={() => applyPreset(preset)}
                aria-pressed={active}
                className="text-base leading-[1.5]"
              >
                {preset.label}
              </Chip>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="조회 시작일"
            value={start}
            invalid={incomplete || overLimit || reversed}
            onChange={(e) => onChange({ start: e.target.value, end })}
            className="w-[150px]"
          />
          <span className="text-ink-muted" aria-hidden="true">
            ~
          </span>
          <Input
            type="date"
            aria-label="조회 종료일"
            value={end}
            invalid={incomplete || overLimit || reversed}
            onChange={(e) => onChange({ start, end: e.target.value })}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <div className={stepperGroup}>
            <button
              type="button"
              className={stepper}
              onClick={() => stepEnd("year", -1)}
              aria-label="종료일 1년 전"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="flex items-center border-x border-border-strong bg-surface px-2 text-base leading-[1.5] font-bold text-ink">
              년
            </span>
            <button
              type="button"
              className={stepper}
              onClick={() => stepEnd("year", 1)}
              aria-label="종료일 1년 후"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className={stepperGroup}>
            <button
              type="button"
              className={stepper}
              onClick={() => stepEnd("month", -1)}
              aria-label="종료일 1개월 전"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <span className="flex items-center border-x border-border-strong bg-surface px-2 text-base leading-[1.5] font-bold text-ink">
              월
            </span>
            <button
              type="button"
              className={stepper}
              onClick={() => stepEnd("month", 1)}
              aria-label="종료일 1개월 후"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {incomplete ? (
        <p className="text-xs font-bold text-danger">
          조회 시작일과 종료일을 모두 입력하세요.
        </p>
      ) : reversed ? (
        <p className="text-xs font-bold text-danger">
          종료일이 시작일보다 빠릅니다. 시작일과 종료일을 다시 선택하세요.
        </p>
      ) : overLimit ? (
        <p className="text-xs font-bold text-danger">{overLimitMessage}</p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* RadioRowField                                                       */
/* ------------------------------------------------------------------ */

export type RadioRowOption = {
  label: string
  value: string
}

type RadioRowFieldProps = {
  name: string
  options: RadioRowOption[]
  value: string
  onChange: (value: string) => void
}

export const RadioRowField = ({
  name,
  options,
  value,
  onChange,
}: RadioRowFieldProps) => {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {options.map((o) => (
        <Radio
          key={o.value}
          name={name}
          label={o.label}
          value={o.value}
          checked={value === o.value}
          onChange={() => onChange(o.value)}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* KeywordField                                                        */
/* ------------------------------------------------------------------ */

type KeywordFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const KeywordField = ({
  id,
  value,
  onChange,
  placeholder = "적요 내용을 입력하세요",
}: KeywordFieldProps) => {
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="max-w-xs"
    />
  )
}

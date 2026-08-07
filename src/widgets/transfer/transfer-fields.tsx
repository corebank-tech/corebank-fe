import * as React from "react"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Chip } from "@/shared/ui/chip"
import {
  formatAccountNo,
  formatAmount,
  formatKoreanAmount,
} from "@/shared/lib/format"
import { RESERVATION_MAX_RANGE_DAYS } from "@/shared/config/policy"
import type { AccountOption } from "@/shared/types/account"
import {
  checkAmountLimit,
  checkReservationDateRange,
  checkTransferEndDateRange,
} from "@/entities/transfer"

/* ================================================================== */
/* WithdrawAccountField — 출금계좌 선택                                 */
/* ================================================================== */

type WithdrawAccountFieldProps = {
  id?: string
  options: AccountOption[]
  value?: string
  onChange?: (accountNo: string) => void
  onSelectAccount?: () => void
  onCheckBalance?: () => void
}

export const WithdrawAccountField = ({
  id,
  options,
  value,
  onChange,
  onSelectAccount,
  onCheckBalance,
}: WithdrawAccountFieldProps) => {
  const selected = options.find((o) => o.accountNo === value)
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="max-w-md min-w-0 flex-1">
          <Select
            id={id}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          >
            {options.map((o) => (
              <option key={o.accountNo} value={o.accountNo}>
                {`${o.alias} / ${formatAccountNo(o.accountNo)}`}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="outline" size="md" onClick={onSelectAccount}>
          계좌선택
        </Button>
        <Button variant="secondary" size="md" onClick={onCheckBalance}>
          잔액조회
        </Button>
      </div>
      {selected && (
        <p className="text-base text-ink-muted">
          출금가능금액{" "}
          <span className="font-bold text-ink">
            {formatAmount(selected.withdrawable)}
          </span>
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* AccountPasswordField — 계좌비밀번호 4자리                            */
/* ================================================================== */

type AccountPasswordFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onCheckErrorCount?: () => void
}

export const AccountPasswordField = ({
  id,
  value,
  onChange,
  onCheckErrorCount,
}: AccountPasswordFieldProps) => {
  const refs = React.useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(4, " ").slice(0, 4).split("")

  const setDigit = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, "").slice(-1)
    const chars = value.padEnd(4, " ").split("")
    chars[index] = digit || " "
    const next = chars.join("").replace(/\s+$/g, "")
    onChange(next.trimEnd())
    if (digit && index < 3) refs.current[index + 1]?.focus()
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <div className="flex w-full items-center gap-2">
      <div
        className="flex items-center gap-1.5"
        role="group"
        aria-label="계좌비밀번호 4자리"
      >
        {[0, 1, 2, 3].map((i) => (
          <Input
            key={i}
            id={i === 0 ? id : undefined}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={1}
            aria-label={`계좌비밀번호 ${i + 1}번째 자리`}
            value={digits[i]?.trim() ?? ""}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-11 text-center tracking-widest"
          />
        ))}
      </div>
      <Button variant="secondary" size="md" onClick={onCheckErrorCount}>
        오류횟수 조회
      </Button>
    </div>
  )
}

/* ================================================================== */
/* AccountNumberField — 입금계좌번호 + 계좌확인                         */
/* ================================================================== */

type AccountNumberFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onConfirm?: () => void
  /** Resolved payee name once the number is confirmed. */
  holderName?: string
  confirmed?: boolean
  /** REQ-TRSF-004·007·030: 미존재·해지·거래정지·유형제한·동일계좌 등 조회 오류 안내. */
  error?: string | null
}

export const AccountNumberField = ({
  id,
  value,
  onChange,
  onConfirm,
  holderName,
  confirmed,
  error,
}: AccountNumberFieldProps) => {
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="- 없이 숫자만 입력"
          invalid={!!error}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className="max-w-xs"
        />
        <Button variant="outline" size="md" onClick={onConfirm}>
          계좌확인
        </Button>
      </div>
      {confirmed && holderName && (
        <p className="text-base text-ink-muted">
          예금주명 <span className="font-bold text-ink">{holderName}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* AmountField — 이체금액                                              */
/* ================================================================== */

const QUICK_AMOUNTS = [
  { label: "100만", value: 1_000_000 },
  { label: "50만", value: 500_000 },
  { label: "10만", value: 100_000 },
  { label: "5만", value: 50_000 },
  { label: "3만", value: 30_000 },
  { label: "1만", value: 10_000 },
] as const

type AmountFieldProps = {
  id?: string
  /** Amount in KRW, or null when empty. */
  value: number | null
  onChange: (value: number | null) => void
  /** 1회 이체한도 */
  perTransferLimit: number
  /** 1일 잔여한도 */
  dailyRemaining: number
  /** Amount applied by the 전액 chip (e.g. withdrawable balance). */
  fullAmount?: number
  /**
   * 1일 잔여한도를 함께 검증·표시할지 여부. 예약이체·자동이체는 등록 시점에
   * 1회 한도만 검증하고 1일 한도는 실행 시점에 검증하므로 false로 끈다
   * (REQ-RSV-006, REQ-AUTO-006). 기본값 true(즉시이체).
   */
  showDailyLimit?: boolean
}

export const AmountField = ({
  id,
  value,
  onChange,
  perTransferLimit,
  dailyRemaining,
  fullAmount,
  showDailyLimit = true,
}: AmountFieldProps) => {
  const {
    limit,
    overLimit,
    overPerTransferLimit: overPer,
  } = checkAmountLimit(value, perTransferLimit, dailyRemaining, showDailyLimit)

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="0"
          invalid={overLimit}
          value={value == null ? "" : value.toLocaleString("ko-KR")}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "")
            onChange(digits ? Number(digits) : null)
          }}
          className="max-w-xs text-right"
        />
        <span className="shrink-0 text-base text-ink-muted">원</span>
      </div>

      {value != null && value > 0 && (
        <span className="text-page font-bold text-primary">
          {formatKoreanAmount(value)}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {QUICK_AMOUNTS.map((chip) => (
          <Chip
            key={chip.label}
            onClick={() => onChange(Math.min((value ?? 0) + chip.value, limit))}
          >
            {chip.label}
          </Chip>
        ))}
        {fullAmount != null && (
          <Chip tone="primary-tint" onClick={() => onChange(fullAmount)}>
            전액
          </Chip>
        )}
        <Chip tone="muted" onClick={() => onChange(null)}>
          정정
        </Chip>
      </div>

      <p className="text-2xs text-ink-muted">
        {showDailyLimit
          ? `1회 한도 ${formatAmount(perTransferLimit)} · 1일 잔여한도 ${formatAmount(dailyRemaining)}`
          : `1회 한도 ${formatAmount(perTransferLimit)}`}
      </p>

      {overLimit && (
        <p className="text-xs font-bold text-danger">
          {!showDailyLimit || overPer
            ? `1회 이체한도 ${formatAmount(perTransferLimit)}를 초과했습니다. 금액을 낮춰 다시 입력하세요.`
            : `1일 잔여한도 ${formatAmount(dailyRemaining)}를 초과했습니다. 금액을 낮춰 다시 입력하세요.`}
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* MemoField — 통장 표시내용 (받는분 / 나)                              */
/* ================================================================== */

type MemoFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
}

export const MemoField = ({
  id,
  value,
  onChange,
  placeholder,
  maxLength = 10,
}: MemoFieldProps) => {
  return (
    <div className="flex w-full items-center gap-2">
      <Input
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.slice(0, maxLength))}
        className="max-w-xs"
      />
      <span className="shrink-0 text-xs text-ink-muted">
        {value.length}/{maxLength}
      </span>
    </div>
  )
}

/* ================================================================== */
/* TransferDateField — 예약일 (D+1 ~ D+365)                            */
/* ================================================================== */

type TransferDateFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Anchor "today", ISO yyyy-mm-dd. */
  today: string
  minDays?: number
  maxDays?: number
  /** Range-error message noun, e.g. "예약일" / "이체 시작일". */
  rangeLabel?: string
}

export const TransferDateField = ({
  id,
  value,
  onChange,
  today,
  minDays = 1,
  // POL-018(예약이체)·POL-035(자동이체 시작일) 모두 D+1~D+365로 동일한 값을 쓴다.
  maxDays = RESERVATION_MAX_RANGE_DAYS,
  rangeLabel = "예약일",
}: TransferDateFieldProps) => {
  const { min, max, outOfRange } = checkReservationDateRange(
    today,
    value,
    minDays,
    maxDays,
  )

  return (
    <div className="flex w-full flex-col gap-2">
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        invalid={outOfRange}
        onChange={(e) => onChange(e.target.value)}
        className="w-[180px]"
      />
      {outOfRange && (
        <p className="text-xs font-bold text-danger">
          {rangeLabel}은 내일부터 1년 이내({min.replace(/-/g, ".")} ~{" "}
          {max.replace(/-/g, ".")})에서 선택하세요.
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* TransferCycleField — 이체주기 (1/3/6개월, POL-033)                   */
/* ================================================================== */

export type TransferCycleMonths = 1 | 3 | 6

type TransferCycleFieldProps = {
  id?: string
  value: TransferCycleMonths
  onChange: (value: TransferCycleMonths) => void
}

export const TransferCycleField = ({
  id,
  value,
  onChange,
}: TransferCycleFieldProps) => {
  return (
    <div className="flex w-full flex-col gap-2">
      <Select
        id={id}
        value={value}
        onChange={(e) =>
          onChange(Number(e.target.value) as TransferCycleMonths)
        }
        className="w-[160px]"
      >
        <option value={1}>1개월</option>
        <option value={3}>3개월</option>
        <option value={6}>6개월</option>
      </Select>
      <p className="text-2xs text-ink-muted">
        ※ 이체주기는 1개월·3개월·6개월 중에서만 선택할 수 있습니다.
      </p>
    </div>
  )
}

/* ================================================================== */
/* DayOfMonthField — 이체지정일 (1~31, POL-034)                        */
/* ================================================================== */

type DayOfMonthFieldProps = {
  id?: string
  value: number
  onChange: (value: number) => void
}

export const DayOfMonthField = ({
  id,
  value,
  onChange,
}: DayOfMonthFieldProps) => {
  return (
    <div className="flex w-full flex-col gap-2">
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-[120px]"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}일
          </option>
        ))}
      </Select>
      <p className="text-2xs text-ink-muted">
        ※ 지정일이 해당 월에 없으면(29·30·31일) 그 달의 말일에 실행됩니다.
      </p>
    </div>
  )
}

/* ================================================================== */
/* TransferEndDateField — 이체종료일 (시작일 이후 ~ 시작일+60개월, POL-035) */
/* ================================================================== */

type TransferEndDateFieldProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  /** 이체 시작일 ISO date — 종료일 선택 범위의 기준. */
  startDate: string
  maxMonths?: number
}

export const TransferEndDateField = ({
  id,
  value,
  onChange,
  startDate,
  maxMonths = 60,
}: TransferEndDateFieldProps) => {
  const { min, max, outOfRange } = checkTransferEndDateRange(
    startDate,
    value,
    maxMonths,
  )

  return (
    <div className="flex w-full flex-col gap-2">
      <Input
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        invalid={outOfRange}
        onChange={(e) => onChange(e.target.value)}
        className="w-[180px]"
      />
      {outOfRange && (
        <p className="text-xs font-bold text-danger">
          종료일은 시작일 이후 최대 60개월 이내({min.replace(/-/g, ".")} ~{" "}
          {max.replace(/-/g, ".")})에서 선택하세요.
        </p>
      )}
    </div>
  )
}

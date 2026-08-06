import { Input } from "@/shared/ui/input"
import { formatAmount, formatKoreanAmount } from "@/shared/lib/format"

/* ================================================================== */
/* TermMonthsField — 가입기간(개월)                                    */
/* ================================================================== */

type TermMonthsFieldProps = {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  min: number
  max: number
}

/** REQ-PRDT-006·007: 상품 마스터의 허용 범위 내에서만 가입기간을 입력받는다. */
export const TermMonthsField = ({
  id,
  value,
  onChange,
  min,
  max,
}: TermMonthsFieldProps) => {
  const outOfRange = value != null && (value < min || value > max)

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="0"
          invalid={outOfRange}
          value={value == null ? "" : String(value)}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 3)
            onChange(digits ? Number(digits) : null)
          }}
          className="w-24 text-right tabular-nums"
        />
        <span className="shrink-0 text-base text-ink-muted">개월</span>
      </div>
      <p className="text-2xs text-ink-muted tabular-nums">
        ※ 가입 가능 기간 {min}개월 ~ {max}개월
      </p>
      {outOfRange && (
        <p className="text-xs font-bold text-danger">
          가입기간은 {min}개월 이상 {max}개월 이하로 입력하세요.
        </p>
      )}
    </div>
  )
}

/* ================================================================== */
/* JoinAmountField — 가입금액(일시납입 / 월납입금액)                    */
/* ================================================================== */

type JoinAmountFieldProps = {
  id?: string
  value: number | null
  onChange: (value: number | null) => void
  min: number
  max: number
  /** 정기예금 가입 시 출금계좌의 출금가능금액. 정기적금은 잔액을 검증하지 않으므로 생략한다(REQ-PRDT-008). */
  withdrawable?: number
}

export const JoinAmountField = ({
  id,
  value,
  onChange,
  min,
  max,
  withdrawable,
}: JoinAmountFieldProps) => {
  const belowMin = value != null && value < min
  const aboveMax = value != null && value > max
  const insufficientBalance =
    withdrawable != null && value != null && value > withdrawable
  const invalid = belowMin || aboveMax || insufficientBalance

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          id={id}
          inputMode="numeric"
          placeholder="0"
          invalid={invalid}
          value={value == null ? "" : value.toLocaleString("ko-KR")}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "")
            onChange(digits ? Number(digits) : null)
          }}
          className="max-w-xs text-right tabular-nums"
        />
        <span className="shrink-0 text-base text-ink-muted">원</span>
      </div>

      {value != null && value > 0 && (
        <span className="text-page font-bold text-primary tabular-nums">
          {formatKoreanAmount(value)}
        </span>
      )}

      <p className="text-2xs text-ink-muted tabular-nums">
        ※ 가입 가능 금액 {formatAmount(min)} ~ {formatAmount(max)}
      </p>

      {(belowMin || aboveMax) && (
        <p className="text-xs font-bold text-danger">
          가입금액은 {formatAmount(min)} 이상 {formatAmount(max)} 이하로
          입력하세요.
        </p>
      )}
      {insufficientBalance && (
        <p className="text-xs font-bold text-danger">
          출금계좌의 출금가능금액({formatAmount(withdrawable ?? 0)})이
          부족합니다. 금액을 낮추거나 출금계좌를 변경하세요.
        </p>
      )}
    </div>
  )
}

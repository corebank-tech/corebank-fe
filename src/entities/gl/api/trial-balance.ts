import { keepPreviousData } from "@tanstack/react-query"
import {
  useGetAdminTrialBalance,
  type Row,
  type RowAccountClass,
  type RowNormalBalance,
  type TrialBalanceResponse,
} from "@/shared/api/generated"

/** 계정 5분류(PH-20). 미등록 계정이면 `null` 이다. */
export type GlAccountClass = NonNullable<RowAccountClass>

/** 정상잔액 방향. 미등록 계정이면 `null` 이다. */
export type GlNormalBalance = NonNullable<RowNormalBalance>

/**
 * 시산표 한 행 = 기간 안에서 그 계정이 받은 차변·대변 합계.
 *
 * 미등록 계정(계정과목에 없는 코드)은 `accountName`·`accountClass`·`normalBalance` 가
 * `null` 이다(서버 계약). **빈 문자열이나 추측값으로 채우지 않는다** — 채우면 화면이
 * 미등록을 구분하지 못하고 멀쩡한 계정처럼 그린다(REQ-ADM-024).
 */
export type TrialBalanceRow = {
  accountCode: string
  accountName: string | null
  accountClass: GlAccountClass | null
  normalBalance: GlNormalBalance | null
  debitTotal: number
  creditTotal: number
  /** 이 계정에 걸린 분개 줄 수. 합계가 이상할 때 어디를 볼지 알려준다. */
  entryCount: number
}

export type TrialBalance = {
  fromDate: string
  toDate: string
  rows: TrialBalanceRow[]
  debitGrandTotal: number
  creditGrandTotal: number
  /** 차변 총계 − 대변 총계. 0 이 아니면 장부가 틀렸다. */
  difference: number
  balanced: boolean
  journalEntryCount: number
}

export type TrialBalancePeriod = { start: string; end: string }

const toRow = (row: Row): TrialBalanceRow => ({
  accountCode: row.accountCode ?? "",
  accountName: row.accountName ?? null,
  accountClass: row.accountClass ?? null,
  normalBalance: row.normalBalance ?? null,
  debitTotal: row.debitTotal ?? 0,
  creditTotal: row.creditTotal ?? 0,
  entryCount: row.entryCount ?? 0,
})

/**
 * 응답을 화면 모델로 옮긴다. 생성 타입은 전 필드가 선택이라 화면이 매번 `??` 를 달게
 * 되므로 여기서 한 번 채운다.
 *
 * **`balanced` 는 서버 값을 그대로 쓰지 않는다.** 필드가 빠지면 `?? true` 든 `?? false`
 * 든 추측이 되는데, 이 화면에서 틀린 "일치"는 장부 오류를 숨긴다. 같은 응답의 총계로
 * 다시 판정해 둘이 어긋날 여지를 없앤다 — 서버도 `difference == 0` 으로 정한다.
 */
export const toTrialBalance = (
  response: TrialBalanceResponse,
): TrialBalance => {
  const debitGrandTotal = response.debitGrandTotal ?? 0
  const creditGrandTotal = response.creditGrandTotal ?? 0
  const difference = debitGrandTotal - creditGrandTotal

  return {
    fromDate: response.fromDate ?? "",
    toDate: response.toDate ?? "",
    rows: (response.rows ?? []).map(toRow),
    debitGrandTotal,
    creditGrandTotal,
    difference,
    balanced: difference === 0,
    journalEntryCount: response.journalEntryCount ?? 0,
  }
}

/**
 * ADM-02 시산표 조회(`GET /admin/trial-balance`, PH-28). 권한 `GL_READ`.
 *
 * 기간을 바꿔 다시 조회하는 동안 이전 결과를 유지한다 — 비우면 조회할 때마다 표와
 * 총계가 깜빡인다. 화면에 찍힌 기간은 응답의 `fromDate`·`toDate` 라, 이전 결과가
 * 남아 있는 동안에도 어느 기간의 숫자인지 어긋나지 않는다.
 */
export const useTrialBalanceQuery = (period: TrialBalancePeriod) => {
  const { data, isFetching, isError, error, refetch } = useGetAdminTrialBalance(
    { fromDate: period.start, toDate: period.end },
    { query: { placeholderData: keepPreviousData } },
  )

  return {
    trialBalance: data ? toTrialBalance(data) : undefined,
    isFetching,
    isError,
    error,
    refetch,
  }
}

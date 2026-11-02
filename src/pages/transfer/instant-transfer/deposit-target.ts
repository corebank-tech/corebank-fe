import { fetchPayeeFor } from "@/entities/transfer"
import { ApiError } from "@/shared/api/api-error"
import { formatAccountNo } from "@/shared/lib/format"

/** 당행 선택지 표기. 은행 목록 응답에는 당행이 없다(서버 interbank_transfer_fe_handoff.md §3). */
export const OWN_BANK_LABEL = "CoreBank(당행)"

const DOMESTIC_ACCOUNT_LENGTH = 12
/** 타행 계좌번호 최대 자릿수. 전문 계좌번호 칸 크기다(인계 문서 §4-2). */
const INTERBANK_ACCOUNT_MAX_LENGTH = 16

/**
 * 입금계좌번호 표시. 타행은 은행마다 자리 체계가 달라 숫자를 그대로 둔다 —
 * `formatAccountNo` 의 3-3-나머지 분할은 당행 12자리 체계다.
 */
export const formatDepositAccountNo = (
  payeeBankCode: string | null,
  accountNo: string,
) => (payeeBankCode == null ? formatAccountNo(accountNo) : accountNo)

export type DepositTargetCheck = {
  toConfirmed: boolean
  payeeName: string
  toAccountError: string | null
}

/**
 * 조회 전에 화면에서 거르는 입력 오류. 오류가 없으면 `null` 이다.
 *
 * 당행은 12자리이고 출금계좌와 같으면 안 된다(REQ-TRSF-004·007). 타행은 은행마다 자릿수가
 * 달라 1~16자리만 본다 — 출금계좌는 당행 계좌라 타행 계좌번호와 같을 수 없다.
 */
export const checkDepositAccountNumber = (
  payeeBankCode: string | null,
  accountNo: string,
  fromAccount: string,
): string | null => {
  if (payeeBankCode == null) {
    if (accountNo.length !== DOMESTIC_ACCOUNT_LENGTH) {
      return "입금계좌번호 12자리를 정확히 입력하세요."
    }
    if (accountNo === fromAccount) {
      return "출금계좌와 입금계좌가 동일합니다. 다른 계좌를 입력하세요."
    }
    return null
  }
  if (
    accountNo.length === 0 ||
    accountNo.length > INTERBANK_ACCOUNT_MAX_LENGTH
  ) {
    return "타행 계좌번호는 숫자 1~16자리로 입력하세요."
  }
  return null
}

const PAYEE_LOOKUP_FAILED =
  "입금계좌를 조회하지 못했습니다. 계좌번호를 확인하세요."

/**
 * 입금계좌 확인(REQ-TRSF-004, FE B-8). 입력 오류면 조회하지 않는다. 조회 실패는 서버 문구를
 * 그대로 쓰고(REQ-CMN-008) [다음]을 막는다 — 타행 무응답(`TRF0309`)도 같다(corebank-server#680).
 *
 * 성공 응답이라도 예금주명이 비면 확인으로 치지 않는다. 스펙에서 `payeeName` 은 필수가
 * 아니라, 그대로 두면 받는 분을 보여주지 않은 채 [다음]이 열린다.
 */
export const resolveDepositTarget = async (
  payeeBankCode: string | null,
  accountNo: string,
  fromAccount: string,
): Promise<DepositTargetCheck> => {
  const inputError = checkDepositAccountNumber(
    payeeBankCode,
    accountNo,
    fromAccount,
  )
  if (inputError != null) {
    return { toConfirmed: false, payeeName: "", toAccountError: inputError }
  }
  try {
    const payee = await fetchPayeeFor(payeeBankCode, accountNo)
    if (payee.payeeName.trim() === "") {
      return {
        toConfirmed: false,
        payeeName: "",
        toAccountError: PAYEE_LOOKUP_FAILED,
      }
    }
    return {
      toConfirmed: true,
      payeeName: payee.payeeName,
      toAccountError: null,
    }
  } catch (error) {
    return {
      toConfirmed: false,
      payeeName: "",
      toAccountError:
        error instanceof ApiError ? error.message : PAYEE_LOOKUP_FAILED,
    }
  }
}

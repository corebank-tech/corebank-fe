import { formatAccountNo } from "@/shared/lib/format"
import type {
  DepositTerminationKind,
  DepositTerminationResult,
} from "@/entities/account"

/** 예·적금 목록에서 출발하는 해지 3단계의 공용 스텝 라벨. */
export const TERMINATION_STEPS = ["예상 지급액 확인", "인증 및 해지", "완료"]

export const TERMINATION_LABELS: Record<DepositTerminationKind, string> = {
  maturity: "만기해지",
  early: "중도해지",
}

/** 1단계에서 확인을 마치고 2단계로 넘기는 값. 주소를 직접 열어 이 값이 없으면 1단계부터 다시 한다. */
export type TerminationConfirmedState = {
  confirmed: true
}

/** 2단계 해지 실행 후 3단계로 넘기는 서버 응답. */
export type TerminationCompleteState = {
  result: DepositTerminationResult
}

type DescribableAccount = {
  accountName?: string
  accountNumber?: string
}

/** 계좌명과 계좌번호를 한 줄로 보여 준다. 개요에서 못 찾은 계좌는 "-" 로 둔다. */
export const describeAccount = (
  account: DescribableAccount | undefined,
): string =>
  account == null
    ? "-"
    : `${account.accountName ?? "-"} ${formatAccountNo(account.accountNumber ?? "")}`

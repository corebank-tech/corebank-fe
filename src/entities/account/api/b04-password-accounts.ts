/**
 * B-04 계좌비밀번호 변경 목업 데이터. REQ-ACCT-006·007·008.
 * 계좌비밀번호는 입출금계좌만 보유하므로 예적금 계좌는 포함하지 않는다.
 */

export type PasswordAccount = {
  id: string
  accountNo: string
  alias: string
  balance: number
  withdrawable: number
  status: "정상" | "거래정지"
  /** 누적 오류 횟수. POL-005: 5회 도달 시 거래정지. */
  errorCount: number
  /** 검증용 mock 비밀번호(숫자 4자리). 실제 저장은 salt 포함 단방향 해시(REQ-NFR-005·009). */
  mockPassword: string
}

export const MOCK_PASSWORD_ACCOUNTS: PasswordAccount[] = [
  {
    id: "pw1",
    accountNo: "110632892336",
    alias: "자유입출금",
    balance: 12_340_500,
    withdrawable: 12_340_500,
    status: "정상",
    errorCount: 0,
    mockPassword: "1234",
  },
  {
    id: "pw2",
    accountNo: "302998112233",
    alias: "급여통장",
    balance: 3_860_000,
    withdrawable: 3_860_000,
    status: "정상",
    errorCount: 2,
    mockPassword: "5678",
  },
  {
    id: "pw3",
    accountNo: "255104778910",
    alias: "비상금통장",
    balance: 1_500_000,
    withdrawable: 1_500_000,
    status: "정상",
    errorCount: 0,
    mockPassword: "0000",
  },
]

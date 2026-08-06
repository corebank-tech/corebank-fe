/**
 * B-05 출금계좌관리 목업 데이터. REQ-ACCT-010·011·012.
 * 등록된 출금계좌 / 미등록 계좌 목록을 하나의 배열에서 registered 플래그로 구분한다.
 */

export type WithdrawalAccount = {
  id: string
  accountNo: string
  alias: string
  balance: number
  openedDate: string
  registered: boolean
  /** 검증용 mock 비밀번호(숫자 4자리). 실제 저장은 단방향 해시(REQ-NFR-005). */
  mockPassword: string
}

export const MOCK_WITHDRAWAL_ACCOUNTS: WithdrawalAccount[] = [
  {
    id: "wd1",
    accountNo: "110632892336",
    alias: "자유입출금",
    balance: 12_340_500,
    openedDate: "2021-03-14",
    registered: true,
    mockPassword: "1234",
  },
  {
    id: "wd2",
    accountNo: "302998112233",
    alias: "급여통장",
    balance: 3_860_000,
    openedDate: "2019-11-02",
    registered: true,
    mockPassword: "5678",
  },
  {
    id: "wd3",
    accountNo: "255104778910",
    alias: "비상금통장",
    balance: 1_500_000,
    openedDate: "2023-06-20",
    registered: true,
    mockPassword: "0000",
  },
  {
    id: "wd4",
    accountNo: "110998877665",
    alias: "모임통장",
    balance: 520_000,
    openedDate: "2026-05-02",
    registered: false,
    mockPassword: "2468",
  },
  {
    id: "wd5",
    accountNo: "302411009988",
    alias: "청년우대통장",
    balance: 1_230_000,
    openedDate: "2026-06-18",
    registered: false,
    mockPassword: "1357",
  },
]

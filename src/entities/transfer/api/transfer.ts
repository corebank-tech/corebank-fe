import type { AccountOption } from "@/shared/types/account"

/** Withdrawal accounts available to the signed-in customer. */
export const MOCK_TRANSFER_ACCOUNTS: AccountOption[] = [
  {
    alias: "자유입출금",
    accountNo: "110632892336",
    balance: 12340500,
    withdrawable: 12000000,
  },
  {
    alias: "급여통장",
    accountNo: "302998112233",
    balance: 3860000,
    withdrawable: 3860000,
  },
  {
    alias: "비상금통장",
    accountNo: "255104778910",
    balance: 1500000,
    withdrawable: 1500000,
  },
]

/** MOCK_TRANSFER_ACCOUNTS 계좌비밀번호(4자리) 레지스트리. REQ-TRSF-009 검증용. */
export const MOCK_ACCOUNT_PASSWORDS: Record<string, string> = {
  "110632892336": "1234",
  "302998112233": "2345",
  "255104778910": "3456",
}

/** Transfer limits for the demo customer, in KRW. */
export const MOCK_TRANSFER_LIMITS = {
  /** 1회 이체한도 */
  perTransfer: 1_000_000,
  /** 1일 이체한도 */
  perDay: 5_000_000,
  /** 당일 이미 사용한 이체금액 */
  usedToday: 500_000,
}

/** Resolved payee name for a confirmed deposit account number. */
export const MOCK_PAYEE_NAME = "김민수"

/* ================================================================== */
/* 입금계좌 조회 레지스트리 — REQ-TRSF-004(예금주 조회) · REQ-TRSF-030(계좌유형 제한) */
/* ================================================================== */

export type PayeeAccountStatus = "normal" | "closed" | "suspended"
export type PayeeAccountType =
  "checking" | "savings_installment" | "time_deposit"

export type PayeeAccountRecord = {
  accountNo: string
  payeeName: string
  status: PayeeAccountStatus
  accountType: PayeeAccountType
  /**
   * 예금주 조회는 통과하지만 인증 완료 후 실행 단계에서 시스템 오류로 실패하는
   * 데모 케이스 (REQ-TRSF-019 실패 화면 확인용).
   */
  executionFails?: boolean
}

export const MOCK_PAYEE_ACCOUNTS: PayeeAccountRecord[] = [
  {
    accountNo: "333330730135",
    payeeName: "김민수",
    status: "normal",
    accountType: "checking",
  },
  {
    accountNo: "441205567890",
    payeeName: "이서연",
    status: "normal",
    accountType: "savings_installment",
  },
  {
    accountNo: "219934482201",
    payeeName: "오수빈",
    status: "normal",
    accountType: "checking",
  },
  {
    accountNo: "128877234455",
    payeeName: "장하늘",
    status: "normal",
    accountType: "checking",
  },
  {
    accountNo: "305566778899",
    payeeName: "배도윤",
    status: "normal",
    accountType: "savings_installment",
  },
  {
    accountNo: "552678901234",
    payeeName: "박지훈",
    status: "closed",
    accountType: "checking",
  },
  {
    accountNo: "663789012345",
    payeeName: "최유진",
    status: "suspended",
    accountType: "checking",
  },
  {
    accountNo: "774890123456",
    payeeName: "정다은",
    status: "normal",
    accountType: "time_deposit",
  },
  {
    accountNo: "885901234567",
    payeeName: "한상우",
    status: "normal",
    accountType: "checking",
    executionFails: true,
  },
]

export type PayeeLookupResult = {
  ok: boolean
  payeeName?: string
  accountType?: PayeeAccountType
  executionFails?: boolean
  /** ok가 false일 때 표시할 안내 문구. */
  error?: string
}

/**
 * REQ-TRSF-004 · REQ-TRSF-030: 입금계좌번호로 예금주를 조회한다. 미존재·해지·
 * 거래정지 계좌는 각각 구분된 오류를 반환하고, 정기예금 계좌는 입금 대상에서
 * 제외한다(입출금계좌·정기적금계좌만 허용).
 */
export function lookupPayeeAccount(accountNo: string): PayeeLookupResult {
  const record = MOCK_PAYEE_ACCOUNTS.find((a) => a.accountNo === accountNo)
  if (!record) {
    return {
      ok: false,
      error: "입금계좌를 찾을 수 없습니다. 계좌번호를 다시 확인하세요.",
    }
  }
  if (record.status === "closed") {
    return {
      ok: false,
      error: "해지된 계좌입니다. 다른 입금계좌를 입력하세요.",
    }
  }
  if (record.status === "suspended") {
    return {
      ok: false,
      error: "거래정지된 계좌입니다. 다른 입금계좌를 입력하세요.",
    }
  }
  if (record.accountType === "time_deposit") {
    return {
      ok: false,
      error:
        "정기예금 계좌는 가입 시 일시 납입만 허용되어 입금계좌로 지정할 수 없습니다. 입출금계좌 또는 정기적금계좌를 입력하세요.",
    }
  }
  return {
    ok: true,
    payeeName: record.payeeName,
    accountType: record.accountType,
    executionFails: record.executionFails,
  }
}

/* ================================================================== */
/* 최근 이체계좌 · 자주 쓰는 계좌 — REQ-TRSF-026 · REQ-TRSF-027           */
/* ================================================================== */

export type RecentTransferAccount = {
  accountNo: string
  payeeName: string
  /** 최근 이체 사용 일시. 최신순 정렬 기준. */
  lastUsedAt: string
}

/** 최근 이체에 사용한 입금계좌 5건(최신순). REQ-TRSF-027. */
export const MOCK_RECENT_TRANSFER_ACCOUNTS: RecentTransferAccount[] = [
  {
    accountNo: "333330730135",
    payeeName: "김민수",
    lastUsedAt: "2026-07-29T10:12:00",
  },
  {
    accountNo: "441205567890",
    payeeName: "이서연",
    lastUsedAt: "2026-07-27T15:40:00",
  },
  {
    accountNo: "219934482201",
    payeeName: "오수빈",
    lastUsedAt: "2026-07-24T09:05:00",
  },
  {
    accountNo: "128877234455",
    payeeName: "장하늘",
    lastUsedAt: "2026-07-20T18:22:00",
  },
  {
    accountNo: "305566778899",
    payeeName: "배도윤",
    lastUsedAt: "2026-07-18T11:47:00",
  },
]

export type FrequentTransferAccount = {
  accountNo: string
  payeeName: string
  nickname?: string
}

/** 자주 쓰는 계좌 최대 등록 건수. REQ-TRSF-026. */
export const MOCK_FREQUENT_ACCOUNTS_MAX = 20

/** 자주 쓰는 계좌 초기 등록 목록. REQ-TRSF-026. */
export const MOCK_FREQUENT_TRANSFER_ACCOUNTS: FrequentTransferAccount[] = [
  { accountNo: "333330730135", payeeName: "김민수", nickname: "단골 거래처" },
  { accountNo: "219934482201", payeeName: "오수빈", nickname: "가족" },
]

/* ================================================================== */
/* 이체 결과 — REQ-TRSF-018 · REQ-TRSF-019 · REQ-TRSF-028               */
/* ================================================================== */

/** One completed instant-transfer used to fill the result summary grid. */
export type TransferResultRow = {
  /** 'YYYYMMDD + 채널코드(2자리) + 일련번호(10자리)' 형식의 거래번호(REQ-TRSF-028). 실패 건은 "-". */
  transactionId: string
  processedAt: string
  fromAccountNo: string
  toAccountNo: string
  payeeName: string
  amount: number
  fee: number
  memo: string
  /** 이체 후 출금계좌 예상잔액. 실패 건은 처리 전 잔액과 동일하다. */
  balanceAfter: number
}

export const MOCK_TRANSFER_RESULT: TransferResultRow = {
  transactionId: "20260723019876543210",
  processedAt: "2026-07-23T08:57:34",
  fromAccountNo: "110632892336",
  toAccountNo: "333330730135",
  payeeName: MOCK_PAYEE_NAME,
  amount: 500_000,
  fee: 0,
  memo: "-",
  balanceAfter: 11_500_000,
}

const CHANNEL_CODE = "01" // 인터넷뱅킹

/** REQ-TRSF-028: 'YYYYMMDD + 채널코드(2자리) + 일련번호(10자리)' 형식으로 거래번호를 채번한다. */
export function generateTransactionId(processedAt: string): string {
  const d = new Date(processedAt)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const serial = String(Math.floor(Math.random() * 1e10)).padStart(10, "0")
  return `${y}${m}${day}${CHANNEL_CODE}${serial}`
}

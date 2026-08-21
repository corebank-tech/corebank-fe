import type {
  JoinWithdrawAccount,
  ProductJoinMaster,
} from "@/entities/product/model/types"

/**
 * 취급 상품은 정기예금·정기적금 2종뿐이다(POL-029).
 * 키는 실제 서버 productId(entities/product/api/products.ts의 MOCK_PRODUCTS와 동일 id·순서)와
 * 맞춘 숫자다 — 문자열 키(P001 등)를 쓰면 C-01/C-02에서 넘어오는 숫자 productId와
 * 어긋나 모든 상품이 첫 상품으로 폴백되는 버그가 생긴다.
 */
export const MOCK_JOIN_PRODUCTS: Record<number, ProductJoinMaster> = {
  1: {
    id: 1,
    category: "정기예금",
    name: "코어 정기예금",
    rate: 3.85,
    minTermMonths: 6,
    maxTermMonths: 36,
    minAmount: 100_000,
    maxAmount: 500_000_000,
    mockNewAccountNo: "110774213980",
  },
  2: {
    id: 2,
    category: "정기적금",
    name: "코어 자유적금",
    rate: 4.2,
    minTermMonths: 12,
    maxTermMonths: 36,
    minAmount: 10_000,
    maxAmount: 3_000_000,
    mockNewAccountNo: "110774298452",
  },
  3: {
    id: 3,
    category: "정기예금",
    name: "코어 목돈예금",
    rate: 4.05,
    minTermMonths: 12,
    maxTermMonths: 60,
    minAmount: 1_000_000,
    maxAmount: 1_000_000_000,
    mockNewAccountNo: "110774355612",
  },
  4: {
    id: 4,
    category: "정기적금",
    name: "코어 정기적금",
    rate: 4.35,
    minTermMonths: 6,
    maxTermMonths: 24,
    minAmount: 50_000,
    maxAmount: 2_000_000,
    mockNewAccountNo: "110774412789",
  },
  5: {
    id: 5,
    category: "정기예금",
    name: "코어 단기예금",
    rate: 3.4,
    minTermMonths: 1,
    maxTermMonths: 12,
    minAmount: 500_000,
    maxAmount: 300_000_000,
    mockNewAccountNo: "110774467031",
  },
  6: {
    id: 6,
    category: "정기적금",
    name: "코어 목표적금",
    rate: 4.5,
    minTermMonths: 12,
    maxTermMonths: 36,
    minAmount: 30_000,
    maxAmount: 5_000_000,
    mockNewAccountNo: "110774523894",
  },
}

/** 상품가입 출금계좌 후보. 이체 도메인 계좌 목록과 별개로 계좌비밀번호(mockPassword)를 포함한다. */
export const MOCK_JOIN_ACCOUNTS: JoinWithdrawAccount[] = [
  {
    alias: "자유입출금",
    accountNo: "110632892336",
    balance: 12340500,
    withdrawable: 12000000,
    mockPassword: "1234",
  },
  {
    alias: "급여통장",
    accountNo: "302998112233",
    balance: 3860000,
    withdrawable: 3860000,
    mockPassword: "1234",
  },
]

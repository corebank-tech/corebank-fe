import type {
  JoinWithdrawAccount,
  ProductJoinMaster,
} from "@/entities/product/model/types"
import type { TermItem } from "@/shared/types/term"
import { MOCK_TODAY } from "@/shared/config/mock-clock"

/** 취급 상품은 정기예금·정기적금 2종뿐이다(POL-029). */
export const MOCK_JOIN_PRODUCTS: Record<string, ProductJoinMaster> = {
  P001: {
    id: "P001",
    category: "정기예금",
    name: "코어 정기예금",
    rate: 3.85,
    minTermMonths: 6,
    maxTermMonths: 36,
    minAmount: 100_000,
    maxAmount: 500_000_000,
    mockNewAccountNo: "110774213980",
  },
  P002: {
    id: "P002",
    category: "정기적금",
    name: "코어 자유적금",
    rate: 4.2,
    minTermMonths: 12,
    maxTermMonths: 36,
    minAmount: 10_000,
    maxAmount: 3_000_000,
    mockNewAccountNo: "110774298452",
  },
  P003: {
    id: "P003",
    category: "정기예금",
    name: "코어 목돈예금",
    rate: 4.05,
    minTermMonths: 12,
    maxTermMonths: 60,
    minAmount: 1_000_000,
    maxAmount: 1_000_000_000,
    mockNewAccountNo: "110774355612",
  },
  P004: {
    id: "P004",
    category: "정기적금",
    name: "코어 정기적금",
    rate: 4.35,
    minTermMonths: 6,
    maxTermMonths: 24,
    minAmount: 50_000,
    maxAmount: 2_000_000,
    mockNewAccountNo: "110774412789",
  },
  P005: {
    id: "P005",
    category: "정기예금",
    name: "코어 단기예금",
    rate: 3.4,
    minTermMonths: 1,
    maxTermMonths: 12,
    minAmount: 500_000,
    maxAmount: 300_000_000,
    mockNewAccountNo: "110774467031",
  },
  P006: {
    id: "P006",
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

/** 가입일 앵커. 다른 화면(BASE_TIME 등)과 같은 mock 기준시각을 공유한다. */
export const JOIN_DATE = MOCK_TODAY

/** 상품가입·회원가입 약관동의 항목. required=true 인 항목이 모두 체크되어야 다음 단계로 진행할 수 있다. */
export const MOCK_JOIN_TERMS: TermItem[] = [
  {
    id: "term-service",
    required: true,
    title: "예금거래 기본약관",
    question: "예금거래 기본약관을 확인하였으며 이에 동의합니다.",
    body: "제1조(적용범위) 이 약관은 CoreBank와 예금주 사이의 예금거래에 적용됩니다.\n제2조(실명거래) 예금주는 실명으로 거래하여야 하며, 실명확인 절차에 협조하여야 합니다.\n제3조(입금) 예금주가 창구 또는 전자적 장치를 통해 입금한 자금은 은행이 확인한 시점에 예금으로 성립합니다.\n제4조(지급) 은행은 예금주의 지급청구에 따라 예금을 지급하며, 지급 시 본인 여부를 확인합니다.\n제5조(이자) 이자는 약정한 이율과 방식에 따라 계산하여 지급합니다.",
  },
  {
    id: "term-deposit-detail",
    required: true,
    title: "예금상품 상세약관",
    question: "가입하려는 예금상품의 상세약관을 확인하였으며 이에 동의합니다.",
    body: "제1조(상품내용) 이 약관은 정기예금 및 정기적금 상품의 가입기간, 이율, 이자지급방식에 관한 사항을 정합니다.\n제2조(가입기간) 가입기간은 상품별로 정한 범위 내에서 선택할 수 있습니다.\n제3조(중도해지) 만기 전 해지 시 중도해지이율이 적용되며, 약정이율보다 낮은 이율이 적용됩니다.\n제4조(자동해지) 만기일에 별도 지시가 없으면 원리금은 지정한 출금계좌로 입금됩니다.",
  },
  {
    id: "term-privacy",
    required: true,
    title: "개인정보 수집·이용 동의",
    question: "개인정보의 수집 및 이용 목적을 확인하였으며 이에 동의합니다.",
    body: "1. 수집항목: 성명, 생년월일, 연락처, 계좌정보\n2. 수집·이용 목적: 예금상품 가입 및 계약 이행, 본인확인, 금융거래 관련 안내\n3. 보유·이용 기간: 거래 종료 후 관련 법령에서 정한 기간까지 보관합니다.\n4. 동의를 거부할 권리가 있으나, 거부 시 상품 가입이 제한됩니다.",
  },
  {
    id: "term-marketing",
    required: false,
    title: "마케팅 정보 수신 동의",
    question: "상품·이벤트 안내를 위한 마케팅 정보 수신에 동의합니다.",
    body: "1. 수신내용: 신규 상품, 금리 우대, 이벤트 등 혜택 안내\n2. 수신방법: 문자메시지, 전자우편, 앱 알림\n3. 이 동의는 선택사항이며, 동의하지 않아도 상품 가입에는 영향이 없습니다.\n4. 수신 동의는 언제든지 철회할 수 있습니다.",
  },
]

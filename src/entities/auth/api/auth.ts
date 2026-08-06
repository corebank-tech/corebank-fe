/**
 * 회원가입(A-02~A-06) · 아이디 찾기(A-07) · 비밀번호 재설정(A-08) 목업 데이터.
 * 실제 인증서·SMS·메일 발송 없이 화면 표시형(Mock)으로만 동작한다.
 */
import type { TermItem } from "@/shared/types/term"

export type VerifyAccount = {
  accountNo: string
  ownerName: string
  /** YYMMDD 6자리 */
  birth: string
  accountPassword: string
  errorCount: number
  status: "정상" | "거래정지"
}

/** REQ-AUTH-005·006·007: 회원가입 2단계 본인확인 대상 계좌(미가입 상태). */
export const MOCK_SIGNUP_ACCOUNTS: VerifyAccount[] = [
  {
    accountNo: "110550051877",
    ownerName: "김민준",
    birth: "950314",
    accountPassword: "1234",
    errorCount: 0,
    status: "정상",
  },
  {
    accountNo: "302118834021",
    ownerName: "이서연",
    birth: "881122",
    accountPassword: "5678",
    errorCount: 3,
    status: "정상",
  },
]

/** REQ-AUTH-009: 아이디 중복확인 대상. */
export const MOCK_EXISTING_USER_IDS = ["corebank1", "hello2024", "testuser01"]

/** REQ-AUTH-016: 이메일 중복 가입 제한 대상. */
export const MOCK_EXISTING_EMAILS = ["already@corebank.example.com"]

export type Member = VerifyAccount & {
  memberId: string
  email: string
  loginPassword: string
}

/** REQ-AUTH-032·033: 아이디 찾기·비밀번호 재설정 대상 기가입 회원. */
export const MOCK_MEMBERS: Member[] = [
  {
    accountNo: "110632892336",
    ownerName: "홍길동",
    birth: "900101",
    accountPassword: "1234",
    errorCount: 0,
    status: "정상",
    memberId: "honggildong",
    email: "hong@corebank.example.com",
    loginPassword: "Passw0rd!",
  },
  {
    accountNo: "302998112233",
    ownerName: "박서준",
    birth: "930615",
    accountPassword: "0000",
    errorCount: 0,
    status: "정상",
    memberId: "seojunpark",
    email: "seojun@corebank.example.com",
    loginPassword: "Corebank1!",
  },
]

/** REQ-AUTH-003·004: 회원가입 1단계 약관(필수 2종). */
export const SIGNUP_TERMS: TermItem[] = [
  {
    id: "service",
    required: true,
    title: "서비스 이용약관",
    question: "서비스 이용약관에 동의합니다.",
    body: `제1조(목적)\n이 약관은 CoreBank(이하 "회사")가 제공하는 인터넷뱅킹 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.\n\n제2조(회원가입)\n회원가입은 이용자가 약관 내용에 동의하고 회사가 정한 절차에 따라 가입을 신청한 후, 회사가 이를 승낙함으로써 성립합니다.\n\n제3조(서비스 이용)\n회사는 연중무휴, 1일 24시간 서비스 제공을 원칙으로 합니다. 다만 시스템 점검 등 필요한 경우 서비스 제공을 일시 중단할 수 있습니다.\n\n제4조(회원의 의무)\n회원은 아이디와 비밀번호를 선량한 관리자의 주의로 관리해야 하며, 제3자에게 이용하게 해서는 안 됩니다.`,
  },
  {
    id: "privacy",
    required: true,
    title: "개인정보 수집·이용 동의서",
    question: "개인정보 수집·이용에 동의합니다.",
    body: `1. 수집 항목\n성명, 생년월일, 아이디, 비밀번호, 이메일, 휴대폰번호, 계좌정보\n\n2. 수집·이용 목적\n회원 식별 및 본인 확인, 인터넷뱅킹 서비스 제공, 금융거래 처리\n\n3. 보유·이용 기간\n회원 탈퇴 시까지 보유하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.\n\n4. 동의 거부 권리\n귀하는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으며, 동의 거부 시 회원가입이 제한될 수 있습니다.`,
  },
]

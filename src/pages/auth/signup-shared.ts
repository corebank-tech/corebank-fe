export const SIGNUP_STEPS = [
  "약관동의",
  "본인확인",
  "정보입력",
  "입력확인",
  "가입완료",
]

export type SignupData = {
  name: string
  birth: string
  phone: string
  email: string
  userId: string
  password: string
}

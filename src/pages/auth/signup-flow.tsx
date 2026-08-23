import * as React from "react"
import { useSearchParams } from "react-router"
import { A02Terms } from "@/pages/auth/a02-terms"
import { A03Verify } from "@/pages/auth/a03-verify"
import { A04Info } from "@/pages/auth/a04-info"
import { A05Confirm } from "@/pages/auth/a05-confirm"
import { A06Complete } from "@/pages/auth/a06-complete"
import type { SignupAuthState, SignupData } from "@/pages/auth/signup-shared"

const EMPTY_DATA: SignupData = {
  name: "",
  birth: "",
  phone: "",
  email: "",
  userId: "",
  password: "",
  passwordConfirm: "",
}

/**
 * 회원가입 1~5단계(A-02~A-06) 컨테이너. REQ-CMN-026: 입력값은 컨테이너가 보유해
 * [이전]/[정보수정]으로 되돌아가도 유지된다. 각 단계 화면은 자신의 body만 구현한다.
 */
export const SignupFlow = () => {
  const [searchParams] = useSearchParams()
  const initialStep = Number(searchParams.get("step") ?? "1")
  const [step, setStep] = React.useState(
    Number.isInteger(initialStep) && initialStep >= 1 && initialStep <= 5
      ? initialStep
      : 1,
  )
  const [data, setData] = React.useState<SignupData>(EMPTY_DATA)

  const [auth, setAuth] = React.useState<SignupAuthState>({})

  const patchAuth = (partial: Partial<SignupAuthState>) =>
    setAuth((prev) => ({ ...prev, ...partial }))

  const patch = (partial: Partial<SignupData>) =>
    setData((prev) => ({ ...prev, ...partial }))

  switch (step) {
    case 1:
      return (
        <A02Terms
          onNext={(termsAuthToken) => {
            patchAuth({ termsAuthToken })
            setStep(2)
          }}
        />
      )
    case 2:
      return (
        <A03Verify
          onVerified={(name, birth, accountAuthToken) => {
            patch({ name, birth })
            patchAuth({ accountAuthToken })
            setStep(3)
          }}
        />
      )
    case 3:
      return (
        <A04Info
          data={data}
          auth={auth}
          onChange={patch}
          onAuthChange={patchAuth}
          onNext={(tempSignupToken) => {
            // validate 성공으로 1회성 인증 증빙은 서버에서 소비되므로 제거한다.
            // 정보수정 시 ID·이메일 변경 여부를 판단하는 checkedUserId/verifiedEmail은 유지한다.
            patchAuth({
              tempSignupToken,
              termsAuthToken: undefined,
              accountAuthToken: undefined,
              userIdCheckToken: undefined,
              emailVerificationId: undefined,
              emailVerificationToken: undefined,
            })
            setStep(4)
          }}
        />
      )
    case 4:
      return (
        <A05Confirm
          tempSignupToken={auth.tempSignupToken}
          onEdit={() => setStep(3)}
          onComplete={() => {
            patch({
              password: "",
              passwordConfirm: "",
            })

            setAuth({})
            setStep(5)
          }}
        />
      )
    case 5:
    default:
      return <A06Complete name={data.name} />
  }
}

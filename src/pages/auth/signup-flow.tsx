import * as React from "react"
import { useSearchParams } from "react-router"
import { A02Terms } from "@/pages/auth/a02-terms"
import { A03Verify } from "@/pages/auth/a03-verify"
import { A04Info } from "@/pages/auth/a04-info"
import { A05Confirm } from "@/pages/auth/a05-confirm"
import { A06Complete } from "@/pages/auth/a06-complete"
import type { SignupData } from "@/pages/auth/signup-shared"

const EMPTY_DATA: SignupData = {
  name: "",
  birth: "",
  phone: "",
  email: "",
  userId: "",
  password: "",
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

  const patch = (partial: Partial<SignupData>) =>
    setData((prev) => ({ ...prev, ...partial }))

  switch (step) {
    case 1:
      return <A02Terms onNext={() => setStep(2)} />
    case 2:
      return (
        <A03Verify
          onVerified={(name, birth) => {
            patch({ name, birth })
            setStep(3)
          }}
        />
      )
    case 3:
      return <A04Info data={data} onChange={patch} onNext={() => setStep(4)} />
    case 4:
      return (
        <A05Confirm
          data={data}
          onEdit={() => setStep(3)}
          onComplete={() => setStep(5)}
        />
      )
    case 5:
    default:
      return <A06Complete name={data.name} />
  }
}

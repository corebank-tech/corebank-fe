import { useEffect, useState, type ReactNode } from "react"
import { ArrowRight, CheckCircle2, FileText, Pause, Play } from "lucide-react"
import { useNavigate } from "react-router"
import { SERIES_CSS } from "@/pages/demo-objection/chart-colors"
import { beginFromSubmit } from "@/pages/demo-objection/live-queue"
import { CLAUSE_LABEL, type Clause } from "@/pages/demo-objection/model"
import { SCENARIOS } from "@/pages/demo-objection/scenarios"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Radio } from "@/shared/ui/radio"
import { StepLayout } from "@/shared/ui/step-layout"
import { AppHeader, BreadcrumbBar, Footer } from "@/widgets/shell"

/**
 * 고객 비대면 이의제기 신청(PLAN D34, PA-21 화면 원본). 코어뱅크 인터넷뱅킹 셸과 단계형 화면
 * (상품 가입 흐름과 같은 StepLayout)을 그대로 쓴다. 신청서 항목은 법정 별지 제4호서식이다.
 * 세션 훅이 없는 위젯만 써서 시연 배포본(세션 없음)에서도 뜬다.
 * 명의인 A 의 입력이 미리 채워진 채 천천히 자동으로 넘어가고, 제출하면 담당자 대기열에 바로 도착한다.
 */

const A = SCENARIOS[0]

const STEPS = ["지급정지 계좌", "신청서 작성", "서류 첨부", "확인", "접수 완료"]
/** 단계별 머무는 시간(ms). 발표자가 설명할 시간을 둔다 */
const HOLD = [6000, 15000, 10000, 7000, 0]
const NARRATION = [
  "피해자 B의 피해구제 신청으로 명의인 A의 계좌 전부가 지급정지됐습니다.",
  "A가 인터넷뱅킹에서 법정 서식 항목 그대로 신청서를 씁니다.",
  "신분증 사본과 증빙 서류를 첨부합니다.",
  "기재 내용을 확인하고 제출합니다.",
  "접수되면 AI 분석이 자동으로 시작됩니다.",
]

const REASON = [
  ...A.statement.text,
  ...(A.statement.injectionLine ? [A.statement.injectionLine] : []),
].join("\n")

export const ApplyPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(true)
  const last = STEPS.length - 1

  useEffect(() => {
    if (!playing || step >= last) return
    const t = window.setTimeout(() => setStep((s) => s + 1), HOLD[step])
    return () => window.clearTimeout(t)
  }, [playing, step, last])

  const next = () => setStep((s) => Math.min(last, s + 1))
  const toStaff = () => {
    beginFromSubmit()
    navigate("/demo/objection")
  }

  const footer: ReactNode =
    step === last ? null : (
      <Button variant="primary" size="lg" className="min-w-40" onClick={next}>
        {["이의제기 신청", "다음", "다음", "제출"][step]}
      </Button>
    )

  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <style>{SERIES_CSS}</style>
      <AppHeader loggedIn customerName="김○○" remainingSeconds={598} />
      <main className="flex-1">
        <div className="mx-auto w-320 px-4 py-10">
          <BreadcrumbBar
            trail={["개인", "고객센터", "금융사기 피해", "지급정지 이의제기"]}
          />
          <div key={step} className="demo-scene">
            <StepLayout
              steps={STEPS}
              currentStep={step + 1}
              title="지급정지 이의제기 신청"
              notice={NOTICE[step]}
              footer={footer}
            >
              {step === 0 && <AccountStep />}
              {step === 1 && <FormStep />}
              {step === 2 && <AttachStep />}
              {step === 3 && <ConfirmStep />}
              {step === 4 && <DoneStep />}
            </StepLayout>
          </div>
        </div>
      </main>
      <Footer />

      {/* 발표자 조작: 화면 오른쪽 아래에 고정 */}
      <div className="fixed right-6 bottom-6 z-40 w-[380px] border-t-4 border-[var(--demo-series-2)] bg-surface-elevated p-4 shadow-pop">
        <p className="text-xs font-bold text-[var(--demo-series-2)]">
          시연: 고객 화면 (명의인 A) {step + 1}/{STEPS.length}
        </p>
        <p className="mt-1 min-h-12 text-base font-bold text-ink">
          {NARRATION[step]}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPlaying((p) => !p)}
            disabled={step >= last}
          >
            {playing ? (
              <Pause className="h-4 w-4" aria-hidden />
            ) : (
              <Play className="h-4 w-4" aria-hidden />
            )}
            {playing ? "멈춤" : "자동"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={next}
            disabled={step >= last}
          >
            다음
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            disabled={step < last}
            onClick={toStaff}
          >
            담당자 화면 <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </div>
  )
}

const NOTICE: (string[] | undefined)[] = [
  [
    "정당한 거래로 받은 돈이면 이의제기를 신청할 수 있습니다.",
    "신청 기한: 채권소멸 공고일부터 2개월 안",
  ],
  ["이의제기 사유는 구체적으로 적어 주십시오."],
  [
    "물품 거래: 사업자등록증, 거래상대방 대화내역, 계약서나 세금계산서나 거래명세서 중 1개",
    "PDF, JPG, PNG 파일만, 파일당 10MB까지 올릴 수 있습니다.",
  ],
  undefined,
  undefined,
]

/* ---------- 단계별 본문 ---------- */

const Value = ({ children }: { children: ReactNode }) => (
  <span className="text-base text-ink">{children}</span>
)

const AccountStep = () => (
  <FormSection title="지급정지된 계좌" className="mb-0">
    <div className="border-t border-border">
      <FormRow label="계좌">
        <Value>입출금 {A.caseInfo.account}</Value>
      </FormRow>
      <FormRow label="지급정지일">
        <Value>2026.11.03</Value>
      </FormRow>
      <FormRow label="지급정지 사유">
        <Value>{A.caseInfo.trigger}</Value>
      </FormRow>
      <FormRow label="상태">
        <span className="text-base font-bold text-danger">전부 지급정지</span>
      </FormRow>
    </div>
  </FormSection>
)

/** 사유를 한 글자씩 입력하는 모습 */
const useTyping = (text: string, ms: number) => {
  const [n, setN] = useState(0)
  useEffect(() => {
    const step = Math.max(20, ms / text.length)
    const id = window.setInterval(
      () => setN((v) => (v >= text.length ? v : v + 1)),
      step,
    )
    return () => window.clearInterval(id)
  }, [text, ms])
  return text.slice(0, n)
}

const FormStep = () => {
  const typed = useTyping(REASON, 9000)
  return (
    <>
      <FormSection title="신청인">
        <div className="grid grid-cols-2 border-t border-border">
          <FormRow label="성명">
            <Value>김○○</Value>
          </FormRow>
          <FormRow label="생년월일">
            <Value>1990.**.**</Value>
          </FormRow>
          <FormRow label="휴대전화번호">
            <Value>010-****-4821</Value>
          </FormRow>
          <FormRow label="전자우편주소">
            <Value>k***@example.com</Value>
          </FormRow>
        </div>
      </FormSection>
      <FormSection title="지급정지 계좌">
        <div className="grid grid-cols-2 border-t border-border">
          <FormRow label="금융회사">
            <Value>코어뱅크</Value>
          </FormRow>
          <FormRow label="예금종별">
            <Value>보통예금</Value>
          </FormRow>
          <FormRow label="계좌번호">
            <Value>{A.caseInfo.account}</Value>
          </FormRow>
          <FormRow label="명의인">
            <Value>김○○</Value>
          </FormRow>
        </div>
      </FormSection>
      <FormSection title="이의제기 사유" className="mb-0">
        <div className="border-t border-border">
          <FormRow label="사유 구분" required>
            <div className="flex flex-wrap gap-6 py-1">
              {([1, 2, 3] as Clause[]).map((c) => (
                <Radio
                  key={c}
                  name="clause"
                  label={CLAUSE_LABEL[c]}
                  checked={c === A.clause}
                  readOnly
                />
              ))}
            </div>
          </FormRow>
          <FormRow label="사유" required>
            <div className="my-1 min-h-[132px] w-full border border-primary bg-surface-elevated px-3 py-2 text-base leading-relaxed whitespace-pre-wrap text-ink">
              {typed}
              <span className="demo-pulse">|</span>
            </div>
          </FormRow>
        </div>
      </FormSection>
    </>
  )
}

const UPLOADS = [
  {
    kind: "신분증 사본",
    file: "신분증_사본.jpg",
    size: "0.4MB",
    src: "/demo-objection/id-masked-a.png",
  },
  {
    kind: "증빙 자료",
    file: "물품매매계약서.jpg",
    size: "1.8MB",
    src: "/demo-objection/contract-a.png",
  },
]

const AttachStep = () => {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setPct((v) => Math.min(100, v + 2)), 90)
    return () => window.clearInterval(id)
  }, [])
  return (
    <FormSection title="첨부 서류" className="mb-0">
      <div className="border-t border-border">
        {UPLOADS.map((u, i) => {
          const p = Math.max(0, Math.min(100, (pct - i * 40) * 1.7))
          return (
            <FormRow key={u.kind} label={u.kind} required>
              <div className="flex w-full items-center gap-4 py-2">
                <img
                  src={u.src}
                  alt=""
                  className="h-16 w-14 shrink-0 border border-border object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-base text-ink">
                    <FileText className="h-4 w-4" aria-hidden />
                    {u.file}
                    <span className="text-xs text-ink-muted">{u.size}</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full max-w-[420px] bg-border">
                    <div
                      className="h-1.5 bg-primary transition-all"
                      style={{ width: `${p}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm w-20 text-right text-ink-muted">
                  {p >= 100 ? "첨부 완료" : p > 0 ? "올리는 중" : "대기"}
                </span>
              </div>
            </FormRow>
          )
        })}
      </div>
    </FormSection>
  )
}

const ConfirmStep = () => (
  <>
    <FormSection title="신청 내용 확인">
      <div className="border-t border-border">
        <FormRow label="지급정지 계좌">
          <Value>코어뱅크 {A.caseInfo.account}</Value>
        </FormRow>
        <FormRow label="사유 구분">
          <Value>{CLAUSE_LABEL[A.clause]}</Value>
        </FormRow>
        <FormRow label="첨부">
          <Value>신분증 사본, 물품 매매 계약서</Value>
        </FormRow>
      </div>
    </FormSection>
    <Checkbox
      label="기재 내용과 첨부 서류가 사실과 같음을 확인합니다."
      checked
      readOnly
    />
  </>
)

const DoneStep = () => (
  <div className="flex flex-col items-center py-8 text-center">
    <CheckCircle2 className="h-14 w-14 text-success" aria-hidden />
    <p className="mt-3 text-h2 font-bold text-ink">
      이의제기 신청이 접수되었습니다
    </p>
    <p className="mt-1 text-base text-ink-muted">
      접수번호 {A.caseInfo.caseNo}
    </p>
    <div className="mt-6 w-full max-w-[640px] border border-border bg-surface px-6 py-4 text-left text-base leading-relaxed text-ink">
      <p>서류 접수 후 3영업일 안에 접수 문자를 보내드립니다.</p>
      <p>서류 보완이 필요하면 문자로 알려드립니다.</p>
    </div>
  </div>
)

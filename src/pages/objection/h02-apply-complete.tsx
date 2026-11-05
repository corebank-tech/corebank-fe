import * as React from "react"
import { CheckCircle2 } from "lucide-react"

/**
 * 4단계 접수 완료. 단계가 바뀌며 처음 그려지므로 제목으로 초점을 옮겨 화면 읽기
 * 프로그램이 결과부터 읽게 한다.
 */
export const ApplyComplete = ({ objectionId }: { objectionId: number }) => {
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div className="flex flex-col items-center py-8 text-center">
      <CheckCircle2 className="h-14 w-14 text-success" aria-hidden="true" />
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-h2 font-bold text-ink focus:outline-none"
      >
        이의제기 신청이 접수되었습니다
      </h2>
      <p className="mt-1 text-base text-ink-muted">
        접수 번호 <span className="font-bold text-ink">{objectionId}</span>
      </p>
      <div className="mt-6 w-full max-w-160 border border-border bg-surface px-6 py-4 text-left">
        <h3 className="text-base font-bold text-ink">다음 절차</h3>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-base leading-relaxed text-ink">
          <li>등록된 휴대전화로 접수 문자를 보내 드립니다.</li>
          <li>
            담당자가 신청서와 서류가 모두 갖춰졌는지 확인합니다. 빠진 서류가
            있으면 보완을 요청하고 문자로 알려 드립니다.
          </li>
          <li>
            소명 자료가 모두 갖춰진 날부터 5영업일 안에 심사 결과를 알려
            드립니다.
          </li>
          <li>
            진행 상황과 보완 요청은 지급정지 이의제기 화면에서 확인할 수
            있습니다.
          </li>
        </ol>
      </div>
    </div>
  )
}

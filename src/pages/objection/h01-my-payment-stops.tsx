import { Link } from "react-router"
import {
  SUPPLEMENT_REQUESTED,
  useMyPaymentStops,
  type MyPaymentStop,
} from "@/entities/payment-stop"
import { getToday } from "@/shared/config/clock"
import { cn } from "@/shared/lib/utils"
import { EmptyState } from "@/shared/ui/empty-state"
import { FormRow } from "@/shared/ui/form-row"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import {
  CaseInfoRows,
  CasesLoadError,
  LoadingCases,
  StatusBadge,
  SupplementRequestNotice,
} from "@/pages/objection/objection-case-parts"
import {
  applyPathOf,
  isDeadlinePassed,
  supplementPathOf,
} from "@/pages/objection/objection-shared"

/**
 * H-01 지급정지 이의제기(고객 채널, 계획 PA-21). 화면 ID 는 고객 채널 담당과 정하기 전
 * 임시 값이다(PH-14).
 *
 * 금융사기 피해구제 신청으로 지급정지된 내 계좌의 사건마다 이의제기 상태를 보이고,
 * 할 수 있는 일(신청, 보완 제출)로 보낸다.
 */

const LINK_BUTTON =
  "inline-flex h-10 items-center justify-center rounded-md border px-4 text-base font-bold whitespace-nowrap focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none"

const CaseAction = ({
  item,
  today,
}: {
  item: MyPaymentStop
  today: string
}) => {
  if (item.objectionStatus === SUPPLEMENT_REQUESTED) {
    return (
      <Link
        to={supplementPathOf(item.caseId)}
        className={cn(
          LINK_BUTTON,
          "border-primary bg-primary text-primary-foreground hover:opacity-90",
        )}
        aria-label={`${item.accountNumberMasked} 보완 서류 제출`}
      >
        보완 서류 제출
      </Link>
    )
  }
  if (item.objectionId != null) return null
  if (isDeadlinePassed(item, today)) {
    return (
      <span className="text-base text-ink-muted">
        신청 기한이 지나 신청할 수 없습니다.
      </span>
    )
  }
  return (
    <Link
      to={applyPathOf(item.caseId)}
      className={cn(
        LINK_BUTTON,
        "border-primary bg-primary text-primary-foreground hover:opacity-90",
      )}
      aria-label={`${item.accountNumberMasked} 이의제기 신청`}
    >
      이의제기 신청
    </Link>
  )
}

const CaseCard = ({ item, today }: { item: MyPaymentStop; today: string }) => {
  const titleId = `my-case-${item.caseId}-title`
  return (
    <section
      aria-labelledby={titleId}
      className="border border-border bg-surface-elevated p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-h2 font-bold text-ink">
          지급정지 계좌 {item.accountNumberMasked}
        </h2>
        <StatusBadge item={item} />
      </div>
      <CaseInfoRows item={item} />
      {item.objectionId != null && (
        <FormRow label="이의제기 접수 번호" className="border-t-0">
          <span className="text-base text-ink">{item.objectionId}</span>
        </FormRow>
      )}
      <div className="mt-3 flex flex-col gap-3">
        <SupplementRequestNotice item={item} />
        <div className="flex justify-end">
          <CaseAction item={item} today={today} />
        </div>
      </div>
    </section>
  )
}

export const H01MyPaymentStops = () => {
  const { cases, isPending, isError, error, refetch } = useMyPaymentStops()
  const today = getToday()

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <LoadingCases />
      ) : isError ? (
        <CasesLoadError error={error} onRetry={() => void refetch()} />
      ) : cases && cases.length > 0 ? (
        <>
          <p className="text-base text-ink-muted">
            <span className="font-bold text-ink">[총 {cases.length}건]</span>{" "}
            금융사기 피해구제 신청으로 지급정지된 계좌입니다.
          </p>
          {cases.map((item) => (
            <CaseCard key={item.caseId} item={item} today={today} />
          ))}
        </>
      ) : (
        <div className="border border-border bg-surface-elevated">
          <EmptyState
            message="지급정지된 계좌가 없습니다."
            description="이의제기는 금융사기 피해구제 신청으로 지급정지된 계좌만 신청할 수 있습니다."
          />
        </div>
      )}

      <NoticeBoxFooter
        items={[
          "피해구제 신청으로 지급정지된 돈이 정당하게 받은 돈이면 이의제기를 신청할 수 있습니다.",
          "이의제기는 사건마다 한 번 신청합니다. 신청 기한이 지나면 신청할 수 없습니다.",
          "신분증 사본은 꼭 첨부해야 합니다. 증빙 서류는 PDF, PNG, JPG 파일로 올립니다.",
          "소명 자료가 모두 갖춰진 날부터 5영업일 안에 심사 결과를 알려 드립니다.",
        ]}
      />
    </div>
  )
}

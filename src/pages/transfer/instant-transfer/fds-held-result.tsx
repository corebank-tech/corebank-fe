import { Clock3, ShieldAlert } from "lucide-react"
import { formatAmount, formatDateTime } from "@/shared/lib/format"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { LabelValueRow } from "@/shared/ui/label-value-row"
import { Panel } from "@/shared/ui/panel"

export type FdsHeldResultView = {
  withdrawalAccountNumber: string
  recipientBankName: string
  recipientAccountNumber: string
  recipientName: string
  amount: number
  requestedAt: string
}

type FdsHeldResultProps = {
  result: FdsHeldResultView
  onConfirm: () => void
  onGoToTransferMenu: () => void
}

/**
 * 즉시이체의 서버 HELD 결과를 보여 줄 고객용 표시 컴포넌트.
 *
 * TODO(#225-follow-up): 즉시이체 API의 확정된 HELD 응답을 view model로
 * 변환한 뒤 D-03 결과 분기에 연결한다. 이 컴포넌트는 직접 API를 알지 않는다.
 */
export const FdsHeldResult = ({
  result,
  onConfirm,
  onGoToTransferMenu,
}: FdsHeldResultProps) => (
  <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
    <Panel className="border-t-4 border-t-warning">
      <div className="flex flex-col items-center px-6 py-8 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-warning-tint text-warning">
          <ShieldAlert size={30} aria-hidden="true" />
        </span>
        <Badge variant="warning">HELD</Badge>
        <h2 className="mt-3 text-page font-bold text-ink">
          이체가 보류되었습니다.
        </h2>
        <p className="mt-2 max-w-xl text-base leading-7 text-ink-muted">
          고객님의 자산을 보호하기 위해 이체를 즉시 실행하지 않고 확인 중입니다.
          확인 결과는 등록된 연락처로 안내해 드리겠습니다.
        </p>
      </div>

      <div className="border-t border-border">
        <LabelValueRow
          label="출금계좌"
          value={result.withdrawalAccountNumber}
        />
        <LabelValueRow
          label="입금계좌"
          value={`${result.recipientBankName} ${result.recipientAccountNumber}`}
        />
        <LabelValueRow label="수취인" value={result.recipientName} />
        <LabelValueRow label="요청금액" value={formatAmount(result.amount)} />
        <LabelValueRow
          label="요청일시"
          value={formatDateTime(result.requestedAt)}
        />
        <LabelValueRow
          label="처리상태"
          value={<Badge variant="warning">보류</Badge>}
        />
      </div>
    </Panel>

    <div className="flex items-start gap-3 border border-border bg-surface px-4 py-3 text-base text-ink-muted">
      <Clock3
        className="mt-0.5 shrink-0 text-primary"
        size={19}
        aria-hidden="true"
      />
      <p>
        확인 중에는 같은 이체를 다시 요청하지 마세요. 다른 이체는
        이체결과조회에서 처리 상태를 확인해 주세요.
      </p>
    </div>

    <div className="flex justify-center gap-2">
      <Button variant="secondary" size="lg" onClick={onGoToTransferMenu}>
        이체 메뉴
      </Button>
      <Button size="lg" onClick={onConfirm}>
        확인
      </Button>
    </div>
  </div>
)

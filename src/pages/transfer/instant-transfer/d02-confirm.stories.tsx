import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { InstantTransferStep2 } from "@/pages/transfer/instant-transfer/d02-confirm"
import { TRANSFER_STEPS } from "@/pages/transfer/transfer-steps"
import {
  MOCK_PAYEE_ACCOUNTS,
  MOCK_TRANSFER_ACCOUNTS,
} from "@/entities/transfer"
import {
  formatAccountNo,
  formatAmount,
  formatDateTime,
  maskName,
} from "@/shared/lib/format"
import { MOCK_NOW } from "@/shared/config/mock-clock"
import { WithAuthenticatedPage } from "../../../../.storybook/decorators/page-providers"

const FROM_ACCOUNT = MOCK_TRANSFER_ACCOUNTS[0]
const TO_PAYEE = MOCK_PAYEE_ACCOUNTS[0]
const TO_ACCOUNT_NO = TO_PAYEE.accountNo
const PAYEE_NAME = TO_PAYEE.payeeName
const AMOUNT = 500_000

const meta = {
  title: "pages/D-02 즉시이체 · 정보확인 및 인증",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "당행이체"]}
    >
      <InstantTransferStep2
        steps={TRANSFER_STEPS}
        scheduledAt={
          <span className="tabular-nums">{formatDateTime(MOCK_NOW)}</span>
        }
        fromAccount={
          <span className="tabular-nums">
            {FROM_ACCOUNT.alias} {formatAccountNo(FROM_ACCOUNT.accountNo)}
          </span>
        }
        toAccount={
          <span className="tabular-nums">{formatAccountNo(TO_ACCOUNT_NO)}</span>
        }
        payeeName={maskName(PAYEE_NAME)}
        amount={formatAmount(AMOUNT, { suffix: false })}
        fee={formatAmount(0, { suffix: false })}
        balanceAfter={formatAmount(FROM_ACCOUNT.withdrawable - AMOUNT, {
          suffix: false,
        })}
        payeeMemo="-"
        myMemo="-"
        onPrev={() => {}}
        onSubmit={() => {}}
      />
    </PageShell>
  ),
} satisfies Meta<typeof InstantTransferStep2>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** 이체 실행 직전 계좌비밀번호 검증 실패 시 노출되는 오류(REQ-TRSF-009). */
export const WithAuthError: Story = {
  render: () => (
    <PageShell
      activeId="transfer"
      breadcrumb={["이체", "즉시이체", "당행이체"]}
    >
      <InstantTransferStep2
        steps={TRANSFER_STEPS}
        scheduledAt={
          <span className="tabular-nums">{formatDateTime(MOCK_NOW)}</span>
        }
        fromAccount={
          <span className="tabular-nums">
            {FROM_ACCOUNT.alias} {formatAccountNo(FROM_ACCOUNT.accountNo)}
          </span>
        }
        toAccount={
          <span className="tabular-nums">{formatAccountNo(TO_ACCOUNT_NO)}</span>
        }
        payeeName={maskName(PAYEE_NAME)}
        amount={formatAmount(AMOUNT, { suffix: false })}
        fee={formatAmount(0, { suffix: false })}
        balanceAfter={formatAmount(FROM_ACCOUNT.withdrawable - AMOUNT, {
          suffix: false,
        })}
        payeeMemo="-"
        myMemo="-"
        authError="계좌비밀번호가 일치하지 않습니다. 이전 단계에서 계좌비밀번호를 다시 확인하세요."
        onPrev={() => {}}
        onSubmit={() => {}}
      />
    </PageShell>
  ),
}

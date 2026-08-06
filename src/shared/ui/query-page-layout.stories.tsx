import type { Meta, StoryObj } from "@storybook/react-vite"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { SummaryRow } from "@/shared/ui/summary-row"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"
import {
  MOCK_OVERVIEW_ACCOUNTS,
  type OverviewAccount,
} from "@/entities/account"

const CHECKING_ACCOUNTS = MOCK_OVERVIEW_ACCOUNTS.filter(
  (account) => account.group === "checking",
)
const CHECKING_TOTAL_BALANCE = CHECKING_ACCOUNTS.reduce(
  (sum, account) => sum + account.balance,
  0,
)

const columns: DataGridColumn<OverviewAccount>[] = [
  { key: "alias", header: "계좌명", width: 160 },
  {
    key: "accountNo",
    header: "계좌번호",
    width: 160,
    render: (row) => (
      <span className="tabular-nums">{formatAccountNo(row.accountNo)}</span>
    ),
  },
  {
    key: "openedDate",
    header: "신규일",
    align: "center",
    width: 110,
    render: (row) => (
      <span className="tabular-nums">{formatDate(row.openedDate)}</span>
    ),
  },
  {
    key: "balance",
    header: "잔액",
    align: "right",
    width: 130,
    render: (row) => formatAmount(row.balance),
  },
]

const meta = {
  title: "shared/ui/QueryPageLayout",
  component: QueryPageLayout,
  parameters: { layout: "padded" },
} satisfies Meta<typeof QueryPageLayout>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    noticeItems: [
      "계좌 잔액은 조회 시점 기준으로 표시되며 실제 거래 처리 결과와 다를 수 있습니다.",
      "예금·적금계좌는 최근거래일 대신 만기일이 표시됩니다.",
    ],
    footerItems: [
      "계좌명은 별명이 등록된 경우 별명을 우선 표시합니다(REQ-ACCT-013).",
      "계좌목록은 CSV 파일로 저장할 수 있으며, 파일에는 마스킹된 계좌번호가 사용됩니다(REQ-INQR-015).",
    ],
    children: (
      <FormSection title="입출금계좌">
        <DataGrid
          columns={columns}
          rows={CHECKING_ACCOUNTS}
          rowKey={(row) => row.id}
        />
        <SummaryRow
          className="mt-3"
          items={[
            { label: "총잔액", value: formatAmount(CHECKING_TOTAL_BALANCE) },
          ]}
        />
      </FormSection>
    ),
  },
}

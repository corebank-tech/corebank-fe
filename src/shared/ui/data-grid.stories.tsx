import type { Meta, StoryObj } from "@storybook/react-vite"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"
import {
  MOCK_OVERVIEW_ACCOUNTS,
  type OverviewAccount,
} from "@/entities/account"

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
    sortable: true,
    sortValue: (row) => row.balance,
    render: (row) => formatAmount(row.balance),
  },
]

const meta = {
  title: "shared/ui/DataGrid",
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Populated: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      rows={MOCK_OVERVIEW_ACCOUNTS}
      rowKey={(row) => row.id}
    />
  ),
}

export const Loading: Story = {
  render: () => (
    <DataGrid columns={columns} rows={[]} loading skeletonRows={4} />
  ),
}

export const Empty: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      rows={[]}
      emptyMessage="보유한 계좌가 없습니다."
    />
  ),
}

export const Selectable: Story = {
  render: () => (
    <DataGrid
      columns={columns}
      rows={MOCK_OVERVIEW_ACCOUNTS}
      rowKey={(row) => row.id}
      selectable
    />
  ),
}

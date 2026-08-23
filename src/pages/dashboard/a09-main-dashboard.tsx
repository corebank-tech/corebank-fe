import * as React from "react"
import { useNavigate } from "react-router"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { SummaryRow } from "@/shared/ui/summary-row"
import { EmptyState } from "@/shared/ui/empty-state"
import { AccessStatusPanel } from "@/pages/dashboard/access-status-panel"
import {
  BankingShortcuts,
  type ShortcutLink,
} from "@/pages/dashboard/banking-shortcuts"
import { NotificationSummary } from "@/pages/dashboard/notification-summary"
import {
  MOCK_DASHBOARD_ACCOUNTS,
  MOCK_NOTIFICATIONS,
  useLoginStatusQuery,
  type DashboardAccount,
  type NotificationItem,
} from "@/entities/dashboard"
import { formatAccountNo, formatAmount, formatDate } from "@/shared/lib/format"

const ACCOUNT_COLUMN_WIDTHS = {
  alias: 140,
  accountNo: 160,
  openedDate: 120,
  lastTxDate: 120,
  balance: 150,
  actions: 150,
} as const

/** alias~balance 폭 합(actions 제외). SummaryRow 라벨폭을 컬럼 경계에 맞춰 정렬한다. */
const SUMMARY_LABEL_WIDTH =
  ACCOUNT_COLUMN_WIDTHS.alias +
  ACCOUNT_COLUMN_WIDTHS.accountNo +
  ACCOUNT_COLUMN_WIDTHS.openedDate +
  ACCOUNT_COLUMN_WIDTHS.lastTxDate +
  ACCOUNT_COLUMN_WIDTHS.balance

type A09MainDashboardProps = {
  customerName?: string
  accounts?: DashboardAccount[]
  notifications?: NotificationItem[]
  shortcuts?: ShortcutLink[]
  onInquiry?: (accountId: string) => void
  onTransfer?: (accountId: string) => void
  onBrowseProducts?: () => void
  onSelectShortcut?: (id: string) => void
  onOpenInbox?: () => void
}

export const A09MainDashboard = ({
  customerName = "홍길동",
  accounts = MOCK_DASHBOARD_ACCOUNTS,
  notifications = MOCK_NOTIFICATIONS,
  shortcuts,
  onInquiry,
  onTransfer,
  onBrowseProducts,
  onSelectShortcut,
  onOpenInbox,
}: A09MainDashboardProps) => {
  const navigate = useNavigate()
  const loginStatus = useLoginStatusQuery()

  const totalBalance = React.useMemo(
    () => accounts.reduce((sum, a) => sum + a.balance, 0),
    [accounts],
  )

  const handleInquiry =
    onInquiry ??
    ((accountId: string) => {
      const account = accounts.find((a) => a.id === accountId)
      navigate(account ? `/inquiry?account=${account.accountNo}` : "/inquiry")
    })
  const handleTransfer =
    onTransfer ??
    ((accountId: string) => {
      const account = accounts.find((a) => a.id === accountId)
      navigate(
        account
          ? `/instant-transfer?from=${account.accountNo}`
          : "/instant-transfer",
      )
    })
  const handleBrowseProducts = onBrowseProducts ?? (() => navigate("/products"))
  const handleOpenInbox = onOpenInbox ?? (() => navigate("/notifications"))

  const columns: DataGridColumn<DashboardAccount>[] = [
    {
      key: "alias",
      header: "계좌명",
      align: "left",
      width: ACCOUNT_COLUMN_WIDTHS.alias,
    },
    {
      key: "accountNo",
      header: "계좌번호",
      align: "left",
      width: ACCOUNT_COLUMN_WIDTHS.accountNo,
      render: (r) => <span>{formatAccountNo(r.accountNo)}</span>,
    },
    {
      key: "openedDate",
      header: "신규일",
      align: "center",
      width: ACCOUNT_COLUMN_WIDTHS.openedDate,
      render: (r) => <span>{formatDate(r.openedDate)}</span>,
    },
    {
      key: "lastTxDate",
      header: "최근거래일",
      align: "center",
      width: ACCOUNT_COLUMN_WIDTHS.lastTxDate,
      render: (r) => <span>{formatDate(r.lastTxDate)}</span>,
    },
    {
      key: "balance",
      header: "잔액(원)",
      align: "right",
      width: ACCOUNT_COLUMN_WIDTHS.balance,
      sortable: true,
      sortValue: (r) => r.balance,
      render: (r) => formatAmount(r.balance, { suffix: false }),
    },
    {
      key: "actions",
      header: "업무",
      align: "center",
      width: ACCOUNT_COLUMN_WIDTHS.actions,
      render: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleInquiry(r.id)}
          >
            조회
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleTransfer(r.id)}
          >
            이체
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* [1] 인사 영역 + 접속현황 */}
      <div className="flex items-stretch gap-9">
        <div className="flex w-2/3 flex-col justify-center border border-border bg-surface-elevated px-8 py-9">
          <p className="text-h2 font-bold text-ink">
            {customerName} 고객님, 안녕하세요.
          </p>
          <p className="mt-2 text-base text-pretty text-ink-muted">
            오늘도 CoreBank를 이용해 주셔서 감사합니다. 자주 쓰는 업무는 아래
            바로가기에서 바로 시작할 수 있습니다.
          </p>
        </div>
        <div className="w-1/3">
          <AccessStatusPanel
            status={loginStatus.data}
            isLoading={loginStatus.isPending}
            isError={loginStatus.isError}
          />
        </div>
      </div>

      {/* [2] 대표계좌 요약 */}
      <div className="border border-border bg-surface-elevated p-6">
        <FormSection title="대표계좌" className="mb-0">
          {accounts.length === 0 ? (
            <div className="border-t-2 border-b border-border border-t-navy">
              <EmptyState
                message="등록된 계좌가 없습니다."
                description="상품을 둘러보고 첫 계좌를 개설해 보세요."
                action={
                  <Button variant="primary" onClick={handleBrowseProducts}>
                    상품 둘러보기
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-base font-bold text-ink-muted">
                    기본 입출금계좌 · {accounts[0].alias}
                  </span>
                  <span className="text-base font-bold text-ink-muted">
                    {formatAccountNo(accounts[0].accountNo)}
                  </span>
                </div>
                <span className="text-h2 font-value text-ink">
                  {formatAmount(accounts[0].balance)}
                </span>
              </div>
              <DataGrid
                columns={columns}
                rows={accounts}
                rowKey={(r) => r.id}
              />
              <SummaryRow
                className="mt-3"
                labelWidth={SUMMARY_LABEL_WIDTH}
                items={[
                  { label: "총 잔액", value: formatAmount(totalBalance) },
                ]}
              />
            </>
          )}
        </FormSection>
      </div>

      {/* [3] 업무 바로가기 */}
      <BankingShortcuts
        links={shortcuts ?? DEFAULT_SHORTCUTS}
        onSelect={onSelectShortcut}
      />

      {/* [4] 미읽음 알림 */}
      <NotificationSummary
        items={notifications}
        onOpenInbox={handleOpenInbox}
      />
    </div>
  )
}

/** REQ-CMN-024: 주요 업무 바로가기는 전체계좌조회·즉시이체·상품몰·이체결과조회 4개로 고정한다. */
const DEFAULT_SHORTCUTS: ShortcutLink[] = [
  { id: "accounts", label: "전체계좌조회", href: "/accounts" },
  { id: "transfer", label: "즉시이체", href: "/instant-transfer" },
  { id: "products", label: "상품몰", href: "/products" },
  { id: "transfer-history", label: "이체결과조회", href: "/transfer/history" },
]

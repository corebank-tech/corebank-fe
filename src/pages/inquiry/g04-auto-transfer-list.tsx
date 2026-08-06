import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Select } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { GridToolbar, RadioRowField, SearchPanel } from "@/widgets/query"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal } from "@/entities/auth"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import { downloadCsv } from "@/shared/lib/csv"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
  maskName,
} from "@/shared/lib/format"
import {
  MOCK_AUTO_TRANSFERS,
  getAutoTransferStatusBadgeVariant,
  AUTO_TRANSFER_CYCLE_LABEL as CYCLE_LABEL,
  type AutoTransferRow,
} from "@/entities/transfer"
import {
  MOCK_NOW as BASE_TIME,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"
import { G04AutoTransferEditFlow } from "@/pages/inquiry/g04-auto-transfer-edit-flow"

const STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "정상", value: "정상" },
  { label: "해지", value: "해지" },
]

const FROM_ACCOUNTS = Array.from(
  new Map(
    MOCK_AUTO_TRANSFERS.map((r) => [r.fromAccountNo, r.fromAlias]),
  ).entries(),
)

/** REQ-AUTO-011: 다음 실행 예정일 전일까지만 해지 가능, 당일은 해지 불가. */
const isTerminable = (row: AutoTransferRow): boolean => {
  return (
    row.status === "정상" &&
    row.nextExecDate != null &&
    row.nextExecDate > TODAY
  )
}

export const G04AutoTransferList = () => {
  const [rows, setRows] = React.useState(MOCK_AUTO_TRANSFERS)
  const [fromAccount, setFromAccount] = React.useState("all")
  const [status, setStatus] = React.useState("all")
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [gridKey, setGridKey] = React.useState(0)
  const [terminateConfirmOpen, setTerminateConfirmOpen] = React.useState(false)
  const [terminateOtpOpen, setTerminateOtpOpen] = React.useState(false)
  const [blockedOpen, setBlockedOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<AutoTransferRow | null>(
    null,
  )
  const [savedOpen, setSavedOpen] = React.useState(false)
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    return rows.filter((r) => {
      if (fromAccount !== "all" && r.fromAccountNo !== fromAccount) return false
      if (status !== "all" && r.status !== status) return false
      return true
    })
  }, [rows, fromAccount, status])

  const size = pageSize === "all" ? filtered.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size)

  const selectedRows = rows.filter((r) => selectedIds.includes(r.id))

  const handleReset = () => {
    setFromAccount("all")
    setStatus("all")
    setPage(1)
  }

  const handleTerminateClick = () => {
    if (selectedRows.length === 0) return
    if (selectedRows.some((r) => !isTerminable(r))) {
      setBlockedOpen(true)
      return
    }
    setTerminateConfirmOpen(true)
  }

  /** REQ-AUTO-011: 해지 확인 후 OTP 인증을 거쳐야 실제로 해지된다. */
  const handleConfirmTerminate = () => {
    setTerminateConfirmOpen(false)
    setTerminateOtpOpen(true)
  }

  const handleTerminateOtpConfirm = () => {
    setRows((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id)
          ? { ...r, status: "해지" as const, nextExecDate: undefined }
          : r,
      ),
    )
    setTerminateOtpOpen(false)
    setSelectedIds([])
    setGridKey((k) => k + 1)
  }

  const openEdit = (row: AutoTransferRow) => {
    setEditTarget(row)
  }

  const handleEditSave = (updatedRow: AutoTransferRow) => {
    setRows((prev) =>
      prev.map((row) => (row.id === updatedRow.id ? updatedRow : row)),
    )
  }

  const exportHeaders = [
    "출금계좌",
    "입금계좌",
    "예금주",
    "이체금액",
    "이체기간",
    "이체지정일",
    "이체주기",
    "표시내용",
    "상태",
  ]
  const exportRows = filtered.map((r) => [
    `${r.fromAlias} ${maskAccountNo(r.fromAccountNo)}`,
    maskAccountNo(r.toAccountNo),
    maskName(r.payeeName),
    formatAmount(r.amount),
    `${formatDate(r.startDate)} ~ ${formatDate(r.endDate)}`,
    `매월 ${r.dayOfMonth}일`,
    CYCLE_LABEL[r.cycleMonths],
    r.memo,
    r.status,
  ])

  const columns: DataGridColumn<AutoTransferRow>[] = [
    {
      key: "toAccountNo",
      header: "입금계좌",
      width: 150,
      render: (r) => (
        <span className="tabular-nums">{formatAccountNo(r.toAccountNo)}</span>
      ),
    },
    {
      key: "payeeName",
      header: "예금주",
      align: "center",
      width: 90,
      render: (r) => maskName(r.payeeName),
    },
    {
      key: "amount",
      header: "이체금액",
      align: "right",
      width: 120,
      render: (r) => formatAmount(r.amount),
    },
    {
      key: "period",
      header: "이체기간",
      width: 200,
      render: (r) => (
        <span className="tabular-nums">
          {formatDate(r.startDate)} ~ {formatDate(r.endDate)}
        </span>
      ),
    },
    {
      key: "dayOfMonth",
      header: "이체지정일",
      align: "center",
      width: 90,
      render: (r) => `매월 ${r.dayOfMonth}일`,
    },
    {
      key: "cycleMonths",
      header: "이체주기",
      align: "center",
      width: 90,
      render: (r) => CYCLE_LABEL[r.cycleMonths],
    },
    { key: "memo", header: "표시내용", align: "left" },
    {
      key: "status",
      header: "상태",
      align: "center",
      width: 80,
      render: (r) => (
        <Badge variant={getAutoTransferStatusBadgeVariant(r.status)}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "변경",
      align: "center",
      width: 90,
      render: (r) =>
        r.status === "정상" ? (
          <Button variant="secondary" size="sm" onClick={() => openEdit(r)}>
            변경
          </Button>
        ) : (
          <span className="text-ink-faint">-</span>
        ),
    },
  ]

  return (
    <QueryPageLayout
      noticeItems={[
        "정상 상태이고 다음 실행 예정일 전일까지인 건만 해지할 수 있습니다.",
        "출금계좌, 입금계좌, 이체지정일은 변경할 수 없으며 해지 후 재등록해야 합니다.",
        "이체주기를 변경하면 다음 실행 예정일이 직전 실행 예정일 기준으로 다시 계산됩니다.",
      ]}
      footerItems={[
        "이체지정일이 해당 월에 없는 경우(29~31일) 그 달의 말일에 실행됩니다(POL-034).",
        "해지는 다음 실행 예정일 전일까지만 가능합니다(REQ-AUTO-011).",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={terminateConfirmOpen}
            onClose={() => setTerminateConfirmOpen(false)}
            onConfirm={handleConfirmTerminate}
            title="자동이체 해지"
            messages={[
              "선택한 자동이체를 해지합니다.",
              "해지 후에는 이후 회차가 실행되지 않으며, 확인을 누르면 OTP 인증으로 이어집니다.",
            ]}
            confirmLabel="해지하기"
            cancelLabel="닫기"
            items={selectedRows.map((r) => ({
              label: `매월 ${r.dayOfMonth}일`,
              value: `${r.fromAlias} → ${maskName(r.payeeName)} / ${formatAmount(r.amount)}`,
            }))}
          />

          <ErrorDialog
            open={blockedOpen}
            onClose={() => setBlockedOpen(false)}
            title="해지 불가"
            messages={[
              "정상 상태이고 다음 실행 예정일 전일까지인 건만 해지할 수 있습니다.",
              "실행 예정일 당일이거나 이미 종료·해지된 건은 선택에서 제외하세요.",
            ]}
          />

          {editTarget && (
            <G04AutoTransferEditFlow
              key={editTarget.id}
              target={editTarget}
              onClose={() => setEditTarget(null)}
              onSave={handleEditSave}
            />
          )}

          <OtpModal
            open={terminateOtpOpen}
            onClose={() => setTerminateOtpOpen(false)}
            onConfirm={handleTerminateOtpConfirm}
            guide="자동이체 해지를 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
          />

          <AlertDialog
            open={savedOpen}
            onClose={() => setSavedOpen(false)}
            messages={["조회조건이 저장되었습니다."]}
          />

          <TextViewModal
            open={brailleOpen}
            onClose={() => setBrailleOpen(false)}
            title="자동이체 조회 점자보기"
            headers={exportHeaders}
            rows={exportRows}
          />
        </>
      }
    >
      <FormSection title="조회조건">
        <SearchPanel
          onReset={handleReset}
          onSearch={() => setPage(1)}
          onSaveCondition={() => setSavedOpen(true)}
        >
          <FormRow label="출금계좌번호" htmlFor="g04-from">
            <Select
              id="g04-from"
              className="max-w-md"
              value={fromAccount}
              onChange={(e) => setFromAccount(e.target.value)}
            >
              <option value="all">전체</option>
              {FROM_ACCOUNTS.map(([accountNo, alias]) => (
                <option key={accountNo} value={accountNo}>
                  {`${alias} / ${formatAccountNo(accountNo)}`}
                </option>
              ))}
            </Select>
          </FormRow>
          <FormRow label="조회구분">
            <RadioRowField
              name="g04-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </FormRow>
        </SearchPanel>
      </FormSection>

      <FormSection
        title="자동이체 목록"
        className="mb-0"
        action={
          <Button
            variant="danger"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={handleTerminateClick}
          >
            선택 해지
          </Button>
        }
      >
        <GridToolbar
          totalCount={filtered.length}
          pageSize={pageSize}
          onPageSizeChange={(s) => {
            setPageSize(s)
            setPage(1)
          }}
          baseTimeLabel={formatDateTime(BASE_TIME)}
          onPrint={() => window.print()}
          onBrailleView={() => setBrailleOpen(true)}
          onSaveFile={() =>
            downloadCsv(`자동이체조회_${TODAY}.csv`, exportHeaders, exportRows)
          }
        />

        <DataGrid
          key={gridKey}
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          selectable
          onSelectionChange={setSelectedIds}
          emptyMessage="조회된 자동이체가 없습니다."
        />

        <Pagination
          page={safePage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </FormSection>
    </QueryPageLayout>
  )
}

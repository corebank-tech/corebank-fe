import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import {
  GridToolbar,
  PeriodField,
  RadioRowField,
  SearchPanel,
} from "@/widgets/query"
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
  MOCK_RESERVATIONS,
  getReservationStatusBadgeVariant,
  type ReservationRow,
} from "@/entities/transfer"
import {
  MOCK_NOW as BASE_TIME,
  MOCK_TODAY as TODAY,
} from "@/shared/config/mock-clock"

const STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "대기", value: "대기" },
  { label: "완료", value: "완료" },
  { label: "실패", value: "실패" },
  { label: "취소", value: "취소" },
]

/** REQ-RSV-008: 이체 예정일 전일 23:59:59까지 취소 가능, 당일은 취소 불가. */
const isCancelable = (row: ReservationRow): boolean => {
  return row.status === "대기" && row.scheduledDate > TODAY
}

export const E04ReservationList = () => {
  const [rows, setRows] = React.useState(MOCK_RESERVATIONS)
  const [status, setStatus] = React.useState("all")
  const [period, setPeriod] = React.useState({
    start: "2026-06-23",
    end: "2026-08-23",
  })
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [gridKey, setGridKey] = React.useState(0)
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [blockedOpen, setBlockedOpen] = React.useState(false)
  const [savedOpen, setSavedOpen] = React.useState(false)
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    const next = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false
      if (r.scheduledDate < period.start || r.scheduledDate > period.end)
        return false
      return true
    })
    const waiting = next
      .filter((r) => r.status === "대기")
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    const others = next
      .filter((r) => r.status !== "대기")
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
    return [...waiting, ...others]
  }, [rows, status, period])

  const size = pageSize === "all" ? filtered.length || 1 : pageSize
  const totalPages = Math.max(1, Math.ceil(filtered.length / size))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size)

  const selectedRows = rows.filter((r) => selectedIds.includes(r.id))

  const handleReset = () => {
    setStatus("all")
    setPeriod({ start: "2026-06-23", end: "2026-08-23" })
    setPage(1)
  }

  const handleCancelClick = () => {
    if (selectedRows.length === 0) return
    if (selectedRows.some((r) => !isCancelable(r))) {
      setBlockedOpen(true)
      return
    }
    setConfirmOpen(true)
  }

  /** REQ-RSV-008: 취소 확인 후 OTP 인증을 거쳐야 실제로 취소된다. */
  const handleConfirmCancel = () => {
    setConfirmOpen(false)
    setOtpOpen(true)
  }

  const handleOtpConfirm = () => {
    setRows((prev) =>
      prev.map((r) =>
        selectedIds.includes(r.id) ? { ...r, status: "취소" as const } : r,
      ),
    )
    setOtpOpen(false)
    setSelectedIds([])
    setGridKey((k) => k + 1)
  }

  const exportHeaders = [
    "상태",
    "이체예정일자",
    "출금계좌",
    "입금계좌",
    "예금주",
    "이체금액",
    "표시내용",
    "등록일시",
  ]
  const exportRows = filtered.map((r) => [
    r.status,
    formatDate(r.scheduledDate),
    `${r.fromAlias} ${maskAccountNo(r.fromAccountNo)}`,
    maskAccountNo(r.toAccountNo),
    maskName(r.payeeName),
    formatAmount(r.amount),
    r.memo,
    formatDateTime(r.registeredAt),
  ])

  const columns: DataGridColumn<ReservationRow>[] = [
    {
      key: "status",
      header: "상태",
      align: "center",
      width: 80,
      render: (r) => (
        <Badge variant={getReservationStatusBadgeVariant(r.status)}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "scheduledDate",
      header: "이체예정일자",
      align: "center",
      width: 120,
      sortable: true,
      sortValue: (r) => r.scheduledDate,
      render: (r) => <span>{formatDate(r.scheduledDate)}</span>,
    },
    {
      key: "fromAccountNo",
      header: "출금계좌",
      width: 170,
      render: (r) => (
        <span className="whitespace-nowrap">
          {r.fromAlias} <span className="text-ink-faint">/</span>{" "}
          <span>{formatAccountNo(r.fromAccountNo)}</span>
        </span>
      ),
    },
    {
      key: "toAccountNo",
      header: "입금계좌",
      width: 150,
      render: (r) => <span>{formatAccountNo(r.toAccountNo)}</span>,
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
    { key: "memo", header: "표시내용", align: "left" },
    {
      key: "registeredAt",
      header: "등록일시",
      width: 150,
      render: (r) => <span>{formatDateTime(r.registeredAt)}</span>,
    },
  ]

  return (
    <QueryPageLayout
      noticeItems={[
        "대기 상태이고 이체 예정일 전일 23:59:59까지인 건만 취소할 수 있습니다.",
        "이체 예정일 당일에는 취소할 수 없습니다.",
        "대기 건은 이체 예정일이 빠른 순으로 정렬됩니다.",
      ]}
      footerItems={[
        "예약이체는 이체 예정일 전일 23:59:59까지 취소할 수 있으며, 이체 예정일 당일에는 취소할 수 없습니다(REQ-RSV-008).",
        "예약이체는 매일 00:10에 실행되며 실행 실패 시 재시도되지 않습니다(POL-019·020).",
      ]}
      modals={
        <>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={handleConfirmCancel}
            title="예약이체 취소"
            messages={[
              "선택한 예약이체를 취소합니다.",
              "취소 후에는 되돌릴 수 없으며, 확인을 누르면 OTP 인증으로 이어집니다.",
            ]}
            confirmLabel="취소하기"
            cancelLabel="닫기"
            items={selectedRows.map((r) => ({
              label: formatDate(r.scheduledDate),
              value: `${r.fromAlias} → ${maskName(r.payeeName)} / ${formatAmount(r.amount)}`,
            }))}
          />

          <OtpModal
            open={otpOpen}
            onClose={() => setOtpOpen(false)}
            onConfirm={handleOtpConfirm}
            guide="예약이체 취소를 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
          />

          <ErrorDialog
            open={blockedOpen}
            onClose={() => setBlockedOpen(false)}
            title="취소 불가"
            messages={[
              "대기 상태이고 이체 예정일 전일까지인 건만 취소할 수 있습니다.",
              "이체 예정일 당일이거나 이미 처리된 건은 선택에서 제외하세요.",
            ]}
          />

          <AlertDialog
            open={savedOpen}
            onClose={() => setSavedOpen(false)}
            messages={["조회조건이 저장되었습니다."]}
          />

          <TextViewModal
            open={brailleOpen}
            onClose={() => setBrailleOpen(false)}
            title="예약이체 조회 점자보기"
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
          <FormRow label="상태">
            <RadioRowField
              name="e04-status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
          </FormRow>
          <FormRow label="이체예정일 기간">
            <PeriodField
              start={period.start}
              end={period.end}
              onChange={setPeriod}
              today={TODAY}
            />
          </FormRow>
        </SearchPanel>
      </FormSection>

      <FormSection
        title="예약이체 목록"
        className="mb-0"
        action={
          <Button
            variant="danger"
            size="sm"
            disabled={selectedIds.length === 0}
            onClick={handleCancelClick}
          >
            선택 취소
          </Button>
        }
      >
        <p className="mb-2 text-2xs text-ink-faint">
          ※ 대기 상태이고 이체 예정일 전일까지인 건만 선택할 수 있습니다.
        </p>

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
            downloadCsv(`예약이체조회_${TODAY}.csv`, exportHeaders, exportRows)
          }
          saveFileLabel="예약이체조회"
        />

        <DataGrid
          key={gridKey}
          columns={columns}
          rows={pageRows}
          rowKey={(r) => r.id}
          selectable
          onSelectionChange={setSelectedIds}
          emptyMessage="조회된 예약이체가 없습니다."
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

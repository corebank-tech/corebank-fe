import * as React from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import {
  GridToolbar,
  PeriodField,
  RadioRowField,
  SavedConditionAlert,
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
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import {
  formatAccountNo,
  formatAmount,
  formatDate,
  formatDateTime,
  maskAccountNo,
  maskName,
} from "@/shared/lib/format"
import {
  getReservationStatusBadgeVariant,
  toReservationRow,
  type ReservationRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { addMonths } from "@/shared/lib/date"
import { checkPeriodRange } from "@/entities/transaction"
import { QUERY_MAX_RANGE_DAYS as MAX_RANGE_DAYS } from "@/shared/config/policy"
import {
  useSearchScheduledTransfers,
  useCancelScheduledTransfer,
} from "@/shared/api/generated/scheduled-transfer-controller/scheduled-transfer-controller"
import type { PageResponseScheduledTransferListItemResponse } from "@/shared/api/generated/model"
import { ApiError } from "@/shared/api/api-error"

const STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "대기", value: "대기" },
  { label: "완료", value: "완료" },
  { label: "실패", value: "실패" },
  { label: "취소", value: "취소" },
]

const STATUS_TO_API: Record<string, string | undefined> = {
  all: undefined,
  대기: "WAITING",
  완료: "SUCCESS",
  실패: "FAILED",
  취소: "CANCELED",
}

/** 서버가 정렬 파라미터를 제공하지 않아, 현재 페이지 안에서만 대기 건을 우선 정렬한다. */
const sortWaitingFirst = (rows: ReservationRow[]): ReservationRow[] => {
  const waiting = rows
    .filter((r) => r.status === "대기")
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
  const others = rows
    .filter((r) => r.status !== "대기")
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate))
  return [...waiting, ...others]
}

// TODO: 계좌비밀번호(POST /accounts/{id}/password/verify)·OTP(POST /otp/issue, /otp/verify)
// 실제 발급 API가 연동되면 그 결과 토큰으로 교체한다. scheduledtransfer 도메인의 토큰
// 검증이 아직 mock(빈 값만 아니면 통과)이라 지금은 임시 문자열을 쓴다.
const TEMP_AUTH_TOKEN = "temp-auth-token"

/**
 * 예약이체는 미래 일자 건이라 형제 조회화면처럼 종료일을 오늘로 둘 수 없다.
 * 오늘을 가운데 두고 앞뒤 2개월을 기본 창으로 잡는다 — 최근 처리된 건과
 * 등록해 둔 예정 건이 같이 보인다.
 *
 * 조회화면 4개가 쓰는 POL-021(기본 1개월)과 값도 방향도 다르다. 이 화면의 기본
 * 기간을 정한 요구사항은 없으므로(REQ-RSV-007) 상수를 공유하지 않고 로컬로 둔다.
 */
const DEFAULT_PERIOD_MONTHS = 2

const defaultCondition = () => {
  const today = getToday()
  return {
    status: "all",
    period: {
      start: addMonths(today, -DEFAULT_PERIOD_MONTHS),
      end: addMonths(today, DEFAULT_PERIOD_MONTHS),
    },
  }
}

export const E04ReservationList = () => {
  const TODAY = getToday()
  // 입력 중인 조회조건과 실제로 조회에 쓰인 조건을 분리한다. 쿼리 키가 입력 state에
  // 바로 물려 있으면 라디오·날짜를 건드릴 때마다 요청이 나가고 "조회" 버튼이 무의미해진다.
  const [applied, setApplied] = React.useState(defaultCondition)
  const [status, setStatus] = React.useState(applied.status)
  const [period, setPeriod] = React.useState(applied.period)
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [blockedOpen, setBlockedOpen] = React.useState(false)
  const [cancelErrorMessage, setCancelErrorMessage] = React.useState<
    string | null
  >(null)
  const [periodAlertMessage, setPeriodAlertMessage] = React.useState<
    string | null
  >(null)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const { data, dataUpdatedAt, isFetching, isError, refetch } =
    useSearchScheduledTransfers(
      {
        status: STATUS_TO_API[applied.status],
        fromDate: applied.period.start,
        toDate: applied.period.end,
        page: page - 1,
        size: pageSize === "all" ? 1000 : pageSize,
      },
      // 페이지·조회조건을 바꾸면 새 쿼리 키라 data가 undefined로 떨어진다. 결과가
      // 올 때까지 이전 응답을 유지해서 조회조건 폼과 페이지네이션이 화면째로
      // 사라졌다 돌아오지 않게 한다.
      { query: { placeholderData: keepPreviousData } },
    )

  // orval이 생성한 타입은 스펙에 적힌 공통 응답 봉투(ApiResponse<T>) 그대로다.
  // customFetch가 런타임에는 이미 봉투를 벗겨 data만 돌려주므로, 실제 형태로 다시 맞춰준다.
  const pageData = data as unknown as
    PageResponseScheduledTransferListItemResponse | undefined
  const pageRows = sortWaitingFirst(
    (pageData?.items ?? []).map(toReservationRow),
  )
  const totalCount = pageData?.totalCount ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)

  // 취소·재조회로 결과가 줄면 totalPages만 작아지고 page는 그대로라, 요청은 범위
  // 밖 페이지를 계속 보내면서 빈 목록이 뜬다. 렌더 중 보정하면 React가 커밋 전에
  // 다시 렌더해서 같은 패스에서 올바른 페이지로 요청이 나간다.
  if (page > totalPages) setPage(totalPages)

  const selectedRows = pageRows.filter((r) => selectedIds.includes(r.id))

  const cancelMutation = useCancelScheduledTransfer({
    request: {
      headers: {
        "Account-Password-Auth-Token": TEMP_AUTH_TOKEN,
        "Otp-Auth-Token": TEMP_AUTH_TOKEN,
      },
    },
  })

  const clearSelection = () => setSelectedIds([])

  const handleReset = () => {
    clearSelection()
    const next = defaultCondition()
    setStatus(next.status)
    setPeriod(next.period)
    setApplied(next)
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const handleSearch = () => {
    // date 입력을 비우면 값이 ""로 들어오고 daysBetween이 NaN을 낸다. NaN은 어떤
    // 비교에도 false라 checkPeriodRange를 그대로 통과해 fromDate= 로 요청이 나간다.
    if (!period.start || !period.end) {
      setPeriodAlertMessage("조회 시작일과 종료일을 모두 입력하세요.")
      return
    }
    /** REQ-INQR-009: 종료일이 시작일보다 빠르거나 기간이 1년을 넘으면 조회를 거부한다. */
    const { reversed, overLimit } = checkPeriodRange(
      period.start,
      period.end,
      MAX_RANGE_DAYS,
    )
    if (reversed) {
      setPeriodAlertMessage(
        "종료일이 시작일보다 빠릅니다. 조회기간을 다시 지정하세요.",
      )
      return
    }
    if (overLimit) {
      setPeriodAlertMessage("조회기간은 최대 1년 이내로 지정할 수 있습니다.")
      return
    }

    clearSelection()
    const sameCondition =
      applied.status === status &&
      applied.period.start === period.start &&
      applied.period.end === period.end
    setApplied({ status, period })
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
    // 조건도 페이지도 그대로면 쿼리 키가 같아 요청이 나가지 않는다. 조회를 누른
    // 이상 최신 상태를 보여줘야 하므로 명시적으로 다시 부른다.
    if (sameCondition && page === 1) refetch()
  }

  const handleCancelClick = () => {
    if (selectedRows.length === 0) return
    if (selectedRows.some((r) => !r.cancelable)) {
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

  const handleOtpConfirm = async () => {
    setOtpOpen(false)
    // allSettled를 쓰는 이유: Promise.all은 첫 실패에서 즉시 reject하므로 아직
    // 응답을 기다리는 취소 요청이 남은 채로 재조회가 나간다. 그러면 나중에
    // 성공한 건이 반영되기 전의 목록을 받아 "일부만 성공했을 수 있으니 최신
    // 상태를 다시 불러온다"는 의도가 그대로 깨진다.
    const results = await Promise.allSettled(
      selectedRows.map((r) =>
        cancelMutation.mutateAsync({ scheduledTransferId: Number(r.id) }),
      ),
    )
    clearSelection()

    const failed = results.find((r) => r.status === "rejected")
    const refreshed = await refetch()

    // 취소 실패 사유가 우선이다. 재조회까지 실패하면 React Query가 직전 성공
    // 응답을 그대로 들고 있어서 방금 취소한 건이 여전히 "대기"로 보이는데,
    // 목록이 비어 있지 않으니 그리드의 빈 목록 안내로도 드러나지 않는다.
    if (failed) {
      const reason = failed.reason
      setCancelErrorMessage(
        reason instanceof ApiError
          ? reason.message
          : "예약이체 취소에 실패했습니다.",
      )
    } else if (refreshed.isError) {
      setCancelErrorMessage(
        "취소 결과를 다시 불러오지 못했습니다. 목록을 다시 조회해 주세요.",
      )
    }
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
  // 서버 페이지네이션이라 현재 페이지에 보이는 건만 내보낸다.
  const exportRows = pageRows.map((r) => [
    r.status,
    formatDate(r.scheduledDate),
    `${r.fromAlias ?? ""} ${maskAccountNo(r.fromAccountNo)}`,
    maskAccountNo(r.toAccountNo),
    maskName(r.payeeName),
    formatAmount(r.amount),
    r.memo ?? "-",
    r.registeredAt ? formatDateTime(r.registeredAt) : "-",
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
          {r.fromAlias ?? ""} <span className="text-ink-faint">/</span>{" "}
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
    {
      key: "memo",
      header: "표시내용",
      align: "left",
      render: (r) => <span>{r.memo ?? "-"}</span>,
    },
    {
      key: "registeredAt",
      header: "등록일시",
      width: 150,
      render: (r) => (
        <span>{r.registeredAt ? formatDateTime(r.registeredAt) : "-"}</span>
      ),
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
              value: `${r.fromAlias ?? formatAccountNo(r.fromAccountNo)} → ${maskName(r.payeeName)} / ${formatAmount(r.amount)}`,
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
            open={periodAlertMessage != null}
            onClose={() => setPeriodAlertMessage(null)}
            messages={periodAlertMessage ? [periodAlertMessage] : []}
          />

          <ErrorDialog
            open={cancelErrorMessage != null}
            onClose={() => setCancelErrorMessage(null)}
            title="예약이체 취소 실패"
            messages={cancelErrorMessage ? [cancelErrorMessage] : []}
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
          onSearch={handleSearch}
          onSaveCondition={savedCondition.save}
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
            disabled={selectedRows.length === 0 || cancelMutation.isPending}
            onClick={handleCancelClick}
          >
            선택 취소
          </Button>
        }
      >
        <p className="mb-2 text-2xs text-ink-faint">
          ※ 대기 상태이고 이체 예정일 전일까지인 건만 선택할 수 있습니다.
        </p>

        {/* TODO: GridToolbar의 "검색" 버튼(그리드 내 텍스트 검색)이 onSearch 미전달로
            동작하지 않는다. 상단 조회조건의 "조회" 버튼과는 별개 기능이다. */}
        <GridToolbar
          totalCount={totalCount}
          pageSize={pageSize}
          onPageSizeChange={(s) => {
            clearSelection()
            setPageSize(s)
            setPage(1)
          }}
          baseTimeLabel={
            dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt)) : undefined
          }
          onPrint={() => window.print()}
          onBrailleView={() => setBrailleOpen(true)}
          onSaveFile={() => {
            downloadCsv(`예약이체조회_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="예약이체조회"
        />

        <DataGrid
          columns={columns}
          rows={pageRows}
          loading={isFetching}
          rowKey={(r) => r.id}
          selectable
          selectedKeys={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage={
            isError
              ? "예약이체 목록을 불러오지 못했습니다."
              : "조회된 예약이체가 없습니다."
          }
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={(p) => {
            clearSelection()
            setPage(p)
          }}
        />

        <SavedConditionAlert open={savedCondition.saved} className="mt-2" />
        <SavedConditionAlert
          open={downloadComplete.saved}
          message="파일이 저장되었습니다."
          className="mt-2"
        />
      </FormSection>
    </QueryPageLayout>
  )
}

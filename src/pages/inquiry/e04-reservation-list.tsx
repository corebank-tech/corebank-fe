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
  type PeriodPreset,
  RadioRowField,
  SavedConditionAlert,
  SearchPanel,
} from "@/widgets/query"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal, OtpTransactionType } from "@/entities/auth"
import { ErrorDialog } from "@/shared/ui/error-dialog"
import { AlertDialog } from "@/shared/ui/alert-dialog"
import { TextViewModal } from "@/shared/ui/text-view-modal"
import { downloadCsv } from "@/shared/lib/csv"
import { useSavedConditionAlert } from "@/shared/lib/hooks/use-saved-condition-alert"
import { formatAmount, formatDate, formatDateTime } from "@/shared/lib/format"
import {
  getReservationStatusBadgeVariant,
  toReservationRow,
  type ReservationRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { addMonths } from "@/shared/lib/date"
import { checkPeriodRange } from "@/entities/transaction"
import { QUERY_DEFAULT_PAGE_SIZE } from "@/shared/config/policy"
import { useQueryBaseTime } from "@/shared/lib/hooks/use-base-time"
import {
  useScheduledTransfers,
  cancelScheduledTransfer,
} from "@/entities/transfer"
import { ApiError, toErrorMessage } from "@/shared/api/api-error"

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

// TODO: 계좌비밀번호(POST /accounts/{id}/password/verify) 실제 발급 API가
// 연동되면 그 결과 토큰으로 교체한다. OTP는 실제 토큰으로 교체했다.
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

/**
 * 조회기간 한도. 시작일 소급 한도와 기간 폭 한도를 겸한다(`checkPeriodRange`).
 * 값은 POL-021(거래내역 조회 최대 1년)과 같지만 별개 규칙이라 상수를 공유하지 않는다 —
 * 예약이체 조회 기간을 정한 POL·REQ가 없고(REQ-RSV-007), `policy.ts`는 POL 수치의
 * 단일 출처라 번호 없는 값을 넣지 않는다.
 */
const MAX_PERIOD_DAYS = 365

/**
 * 이 화면의 조회 대상은 미래 일자 예약건이다. 공용 프리셋은 전부 종료일을 오늘로
 * 맞추는 과거 방향이라, 아무 칩이나 누르면 대기 건이 통째로 사라진다. 과거 방향
 * 셋(완료·실패·취소 건 확인)과 미래 방향 셋(대기 건 확인)을 함께 둔다.
 */
const PERIOD_PRESETS: PeriodPreset[] = [
  { id: "today", label: "오늘", startOffset: 0, endOffset: 0 },
  { id: "1m", label: "1개월", startOffset: -30, endOffset: 0 },
  { id: "3m", label: "3개월", startOffset: -90, endOffset: 0 },
  { id: "1m-ahead", label: "1개월 후", startOffset: 0, endOffset: 30 },
  { id: "3m-ahead", label: "3개월 후", startOffset: 0, endOffset: 90 },
  { id: "6m-ahead", label: "6개월 후", startOffset: 0, endOffset: 182 },
]

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
  const [pageSize, setPageSize] = React.useState<number | "all">(
    QUERY_DEFAULT_PAGE_SIZE,
  )
  const [page, setPage] = React.useState(1)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [otpOpen, setOtpOpen] = React.useState(false)
  const [blockedOpen, setBlockedOpen] = React.useState(false)
  const [multiSelectBlockedOpen, setMultiSelectBlockedOpen] =
    React.useState(false)
  // OTP 토큰은 발급 시점의 scheduledTransferId 에 묶인다. selectedRows 는 조회
  // 결과에서 파생돼 재조회가 끼면 바뀌므로, 발급 직전의 대상을 잡아둔다.
  const [cancelTarget, setCancelTarget] = React.useState<ReservationRow | null>(
    null,
  )
  const [cancelErrorMessage, setCancelErrorMessage] = React.useState<
    string | null
  >(null)
  const [periodAlertMessage, setPeriodAlertMessage] = React.useState<
    string | null
  >(null)
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  // 툴바에서 "전체 보기"를 내렸으므로(showAllOption={false}) "all"은 도달하지
  // 않는다. 타입을 좁히기 위한 분기다.
  const size = pageSize === "all" ? QUERY_DEFAULT_PAGE_SIZE : pageSize
  const {
    data,
    dataUpdatedAt,
    isPlaceholderData,
    isFetching,
    isError,
    error,
    refetch,
  } = useScheduledTransfers(
    {
      status: STATUS_TO_API[applied.status],
      fromDate: applied.period.start,
      toDate: applied.period.end,
      page: page - 1,
      size,
    },
    // 페이지·조회조건을 바꾸면 새 쿼리 키라 data가 undefined로 떨어진다. 결과가
    // 올 때까지 이전 응답을 유지해서 조회조건 폼과 페이지네이션이 화면째로
    // 사라졌다 돌아오지 않게 한다.
    { query: { placeholderData: keepPreviousData } },
  )
  const baseTime = useQueryBaseTime({ dataUpdatedAt, isPlaceholderData })

  const pageData = data
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

  // 훅이 아닌 raw 함수를 호출하므로 mutation의 isPending을 쓸 수 없어 직접 든다.
  const [isCancelling, setIsCancelling] = React.useState(false)

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
    /** 빈 입력·역전 기간·한도를 넘는 기간은 조회를 거부한다. */
    const { incomplete, reversed, overLimit } = checkPeriodRange(
      period.start,
      period.end,
      TODAY,
      MAX_PERIOD_DAYS,
    )
    // 비워두면 daysBetween이 NaN을 내고 NaN은 어떤 비교에도 false라, 막지 않으면
    // fromDate= 로 요청이 나간다.
    if (incomplete) {
      setPeriodAlertMessage("조회 시작일과 종료일을 모두 입력하세요.")
      return
    }
    if (reversed) {
      setPeriodAlertMessage(
        "종료일이 시작일보다 빠릅니다. 조회기간을 다시 지정하세요.",
      )
      return
    }
    if (overLimit) {
      setPeriodAlertMessage(
        "조회기간은 최대 1년 이내여야 하고, 시작일도 오늘로부터 1년 이내여야 합니다.",
      )
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
    // OTP 인증 토큰은 scheduledTransferId 하나에 묶여 발급되고 1회만 소비된다
    // (otp_integration_guide.md). 여러 건을 한 번의 인증으로 취소하면 토큰에 묶인
    // 건만 처리되고 나머지는 OTP0102로 실패하므로, 한 건씩만 받는다.
    if (selectedRows.length > 1) {
      setMultiSelectBlockedOpen(true)
      return
    }
    setConfirmOpen(true)
  }

  /** REQ-RSV-008: 취소 확인 후 OTP 인증을 거쳐야 실제로 취소된다. */
  const handleConfirmCancel = () => {
    setConfirmOpen(false)
    setCancelTarget(selectedRows[0] ?? null)
    setOtpOpen(true)
  }

  const handleOtpConfirm = async (otpAuthToken: string) => {
    if (isCancelling) return
    setOtpOpen(false)
    // 발급 시점에 잡아둔 대상이다. 여기서 selectedRows 를 다시 읽으면 토큰이 묶인
    // 건과 실행 대상이 갈릴 수 있다.
    const target = cancelTarget
    if (!target) return
    setIsCancelling(true)
    try {
      // 실패해도 선택을 비우고 재조회한다 — 실패 사유만 띄우고 목록을 그대로 두면
      // 화면이 요청 전 상태를 계속 보여준다. 그래서 예외를 잡아 값으로 옮긴다.
      const failed = await cancelScheduledTransfer(Number(target.id), {
        headers: {
          "Account-Password-Auth-Token": TEMP_AUTH_TOKEN,
          "Otp-Auth-Token": otpAuthToken,
        },
      }).then(
        () => null,
        (error: unknown) => error,
      )
      clearSelection()

      const refreshed = await refetch()

      // 취소 실패 사유가 우선이다. 재조회까지 실패하면 React Query가 직전 성공
      // 응답을 그대로 들고 있어서 방금 취소한 건이 여전히 "대기"로 보이는데,
      // 목록이 비어 있지 않으니 그리드의 빈 목록 안내로도 드러나지 않는다.
      if (failed) {
        setCancelErrorMessage(
          failed instanceof ApiError
            ? failed.message
            : "예약이체 취소에 실패했습니다.",
        )
      } else if (refreshed.isError) {
        setCancelErrorMessage(
          "취소 결과를 다시 불러오지 못했습니다. 목록을 다시 조회해 주세요.",
        )
      }
    } finally {
      setIsCancelling(false)
      setCancelTarget(null)
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
    `${r.fromAlias ?? ""} ${r.fromAccountNo}`,
    r.toAccountNo,
    r.payeeName,
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
          <span>{r.fromAccountNo}</span>
        </span>
      ),
    },
    {
      key: "toAccountNo",
      header: "입금계좌",
      width: 150,
      render: (r) => <span>{r.toAccountNo}</span>,
    },
    {
      key: "payeeName",
      header: "예금주",
      align: "center",
      width: 90,
      render: (r) => r.payeeName,
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
        "OTP 인증은 한 건에만 유효하므로 취소는 한 건씩 진행합니다.",
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
              value: `${r.fromAlias ?? r.fromAccountNo} → ${r.payeeName} / ${formatAmount(r.amount)}`,
            }))}
          />

          <OtpModal
            open={otpOpen}
            onClose={() => {
              setOtpOpen(false)
              setCancelTarget(null)
            }}
            onConfirm={handleOtpConfirm}
            guide="예약이체 취소를 위해 OTP를 발급한 뒤 화면에 표시된 6자리 번호를 입력하세요."
            // otp_integration_guide.md의 취소 계약은 건당 scheduledTransferId
            // 하나다. 진입 가드가 다건 선택을 막고, 대상은 발급 직전에 잡아둔다.
            transaction={{
              type: OtpTransactionType.SCHEDULED_TRANSFER,
              data: { scheduledTransferId: Number(cancelTarget?.id ?? 0) },
            }}
          />

          <ErrorDialog
            open={multiSelectBlockedOpen}
            onClose={() => setMultiSelectBlockedOpen(false)}
            title="취소는 한 건씩 가능합니다"
            messages={[
              "OTP 인증은 예약이체 한 건에만 유효합니다.",
              "취소할 건을 하나만 선택한 뒤 다시 시도하세요.",
            ]}
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
              presets={PERIOD_PRESETS}
              maxPeriodDays={MAX_PERIOD_DAYS}
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
            disabled={selectedRows.length === 0 || isCancelling}
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
          // POL-022의 "전체"는 서버 지원 전까지 임시로 내린다 — 근거는
          // GridToolbar의 showAllOption 주석(#46).
          showAllOption={false}
          totalCount={totalCount}
          pageSize={pageSize}
          onPageSizeChange={(s) => {
            clearSelection()
            setPageSize(s)
            setPage(1)
          }}
          baseTimeLabel={
            baseTime ? formatDateTime(new Date(baseTime)) : undefined
          }
          onPrint={() => window.print()}
          onBrailleView={() => setBrailleOpen(true)}
          onSaveFile={() => {
            downloadCsv(`예약이체조회_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="현재 페이지 예약이체조회"
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
            isError ? toErrorMessage(error) : "조회된 예약이체가 없습니다."
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

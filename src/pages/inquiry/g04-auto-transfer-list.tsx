import * as React from "react"
import { keepPreviousData } from "@tanstack/react-query"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Select } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import {
  GridToolbar,
  RadioRowField,
  SavedConditionAlert,
  SearchPanel,
} from "@/widgets/query"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { OtpModal } from "@/entities/auth"
import { ErrorDialog } from "@/shared/ui/error-dialog"
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
  getAutoTransferStatusBadgeVariant,
  toAutoTransferRow,
  AUTO_TRANSFER_CYCLE_LABEL as CYCLE_LABEL,
  type AutoTransferRow,
} from "@/entities/transfer"
import { getToday } from "@/shared/config/clock"
import { useQueryBaseTime } from "@/shared/lib/hooks/use-base-time"
import { G04AutoTransferEditFlow } from "@/pages/inquiry/g04-auto-transfer-edit-flow"
import {
  useSearchAutoTransfers,
  cancelAutoTransfer,
  changeAutoTransfer,
} from "@/shared/api/generated/auto-transfer-controller/auto-transfer-controller"
import { useWithdrawAccounts } from "@/entities/account"
import type { PageResponseAutoTransferListItemResponse } from "@/shared/api/generated/model"
import { ApiError } from "@/shared/api/api-error"

const STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "정상", value: "정상" },
  { label: "해지", value: "해지" },
]

const STATUS_TO_API: Record<string, string | undefined> = {
  all: undefined,
  정상: "NORMAL",
  해지: "TERMINATED",
}

// TODO: 계좌비밀번호 인증 API가 연동되면 그 결과 토큰으로 교체한다. autotransfer
// 도메인의 토큰 검증이 아직 mock(빈 값만 아니면 통과)이라 지금은 임시 문자열을 쓴다.
const TEMP_AUTH_TOKEN = "temp-auth-token"

export const G04AutoTransferList = () => {
  const TODAY = getToday()
  // 입력 중인 조회조건과 실제로 조회에 쓰인 조건을 분리한다. 쿼리 키가 입력 state에
  // 바로 물려 있으면 계좌·조회구분을 건드릴 때마다 요청이 나가고 "조회" 버튼이 무의미해진다.
  const [applied, setApplied] = React.useState<{
    accountId: number | null
    status: string
  }>({ accountId: null, status: "all" })
  const [fromAccountId, setFromAccountId] = React.useState<number | null>(null)
  const [status, setStatus] = React.useState("all")
  const [pageSize, setPageSize] = React.useState<number | "all">(10)
  const [page, setPage] = React.useState(1)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [terminateConfirmOpen, setTerminateConfirmOpen] = React.useState(false)
  const [terminateOtpOpen, setTerminateOtpOpen] = React.useState(false)
  // 해지 요청이 도는 동안 OTP 모달은 이미 닫혀 있고 선택도 응답 뒤에야 비워져서,
  // 목록과 "선택 해지" 버튼이 활성인 채로 노출된다. 이 플래그가 없으면 같은 건에
  // 두 번째 해지 요청이 나간다 — 멱등키는 요청마다 새로 붙어 막아주지 않는다.
  // 해지 요청 + 뒤이은 재조회까지를 하나의 진행 구간으로 잡는다(c05-confirm-auth
  // 와 같은 형태). 선택이 비워져 버튼이 어차피 비활성이 되는 것에 기대지 않는다.
  const [isTerminating, setIsTerminating] = React.useState(false)
  const [blockedOpen, setBlockedOpen] = React.useState(false)
  const [actionErrorMessage, setActionErrorMessage] = React.useState<
    string | null
  >(null)
  const [editTarget, setEditTarget] = React.useState<AutoTransferRow | null>(
    null,
  )
  const savedCondition = useSavedConditionAlert()
  const downloadComplete = useSavedConditionAlert()
  const [brailleOpen, setBrailleOpen] = React.useState(false)

  const { accounts: withdrawAccounts } = useWithdrawAccounts()

  // 계좌 목록은 비동기로 도착하므로, 아직 사용자가 고르지 않았다면 첫 계좌를
  // 렌더링 중에 파생값으로 기본 선택한다(useEffect + setState 대신).
  const defaultAccountId = withdrawAccounts[0]?.accountId ?? null
  const selectedAccountId = fromAccountId ?? defaultAccountId
  const appliedAccountId = applied.accountId ?? defaultAccountId
  const appliedAccount = withdrawAccounts.find(
    (a) => a.accountId === appliedAccountId,
  )

  const size = pageSize === "all" ? 1000 : pageSize
  const {
    data,
    dataUpdatedAt,
    isPlaceholderData,
    isFetching,
    isError,
    refetch,
  } = useSearchAutoTransfers(
    {
      // REQ-AUTO-009: 출금계좌는 조회조건이라 서버가 필수로 받는다. 값이 정해지기
      // 전에는 enabled로 요청 자체를 막으므로 이 0은 실제로 나가지 않는다.
      withdrawalAccountId: appliedAccountId ?? 0,
      status: STATUS_TO_API[applied.status],
      page: page - 1,
      size,
    },
    {
      query: {
        enabled: appliedAccountId != null,
        // 페이지·조회조건을 바꾸면 새 쿼리 키라 data가 undefined로 떨어진다. 결과가
        // 올 때까지 이전 응답을 유지해서 조회조건 폼과 페이지네이션이 화면째로
        // 사라졌다 돌아오지 않게 한다.
        placeholderData: keepPreviousData,
      },
    },
  )

  const baseTime = useQueryBaseTime({ dataUpdatedAt, isPlaceholderData })

  const pageData = data as unknown as
    PageResponseAutoTransferListItemResponse | undefined
  // 출금계좌번호는 응답에 없다. 조회 조건으로 지정한 계좌가 그대로 그 값이다.
  const pageRows = (pageData?.items ?? []).map((item) =>
    toAutoTransferRow(item, appliedAccount?.accountNumber ?? ""),
  )
  const totalCount = pageData?.totalCount ?? 0
  const totalPages = Math.max(1, pageData?.totalPages ?? 1)

  // 해지·재조회로 결과가 줄면 totalPages만 작아지고 page는 그대로라, 요청은 범위
  // 밖 페이지를 계속 보내면서 빈 목록이 뜬다. 렌더 중 보정하면 React가 커밋 전에
  // 다시 렌더해서 같은 패스에서 올바른 페이지로 요청이 나간다.
  if (page > totalPages) setPage(totalPages)

  // 페이지를 넘기면 화면에서 사라진 건은 선택에서도 빠져야 한다(#28).
  const selectedRows = pageRows.filter((r) => selectedIds.includes(r.id))

  const clearSelection = () => setSelectedIds([])

  const handleReset = () => {
    clearSelection()
    setFromAccountId(null)
    setStatus("all")
    setApplied({ accountId: null, status: "all" })
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
  }

  const handleSearch = () => {
    clearSelection()
    const sameCondition =
      appliedAccountId === selectedAccountId && applied.status === status
    setApplied({ accountId: selectedAccountId, status })
    setPage(1)
    savedCondition.clear()
    downloadComplete.clear()
    // 조건도 페이지도 그대로면 쿼리 키가 같아 요청이 나가지 않는다. 조회를 누른
    // 이상 최신 상태를 보여줘야 하므로 명시적으로 다시 부른다.
    if (sameCondition && page === 1) refetch()
  }

  const handleTerminateClick = () => {
    if (selectedRows.length === 0) return
    // REQ-AUTO-011: 상태가 '정상'이어도 다음 실행 예정일 당일이면 해지할 수 없다.
    // 예정일 계산은 이체주기·말일 보정까지 걸려 있어 화면에서 재현하면 서버와
    // 어긋나므로, 서버가 내려준 판정(cancelable)을 그대로 쓴다.
    if (selectedRows.some((r) => !r.cancelable)) {
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

  const handleTerminateOtpConfirm = async () => {
    if (isTerminating) return
    setTerminateOtpOpen(false)
    setIsTerminating(true)
    try {
      // allSettled를 쓰는 이유: Promise.all은 첫 실패에서 즉시 reject하므로 아직
      // 응답을 기다리는 해지 요청이 남은 채로 재조회가 나간다. 그러면 나중에
      // 성공한 건이 반영되기 전의 목록을 받는다.
      const results = await Promise.allSettled(
        selectedRows.map((r) =>
          // 멱등키는 customFetch가 쓰기 메서드마다 새로 넣어준다.
          cancelAutoTransfer(Number(r.id), {
            headers: { "Account-Password-Auth-Token": TEMP_AUTH_TOKEN },
          }),
        ),
      )
      clearSelection()

      const failed = results.find((r) => r.status === "rejected")
      const refreshed = await refetch()

      // 해지 실패 사유가 우선이다. 재조회까지 실패하면 React Query가 직전 성공
      // 응답을 그대로 들고 있어서 방금 해지한 건이 여전히 "정상"으로 보이는데,
      // 목록이 비어 있지 않으니 그리드의 빈 목록 안내로도 드러나지 않는다.
      if (failed) {
        const reason = failed.reason
        setActionErrorMessage(
          reason instanceof ApiError
            ? reason.message
            : "자동이체 해지에 실패했습니다.",
        )
      } else if (refreshed.isError) {
        setActionErrorMessage(
          "해지 결과를 다시 불러오지 못했습니다. 목록을 다시 조회해 주세요.",
        )
      }
    } finally {
      setIsTerminating(false)
    }
  }

  const openEdit = (row: AutoTransferRow) => {
    setEditTarget(row)
  }

  /**
   * REQ-AUTO-010: 변경 가능한 항목은 이체금액·이체주기·종료일·표시내용뿐이다.
   * 출금계좌·입금계좌·이체지정일은 보내지 않는다 — 서버도 변경 요청을 거부한다.
   *
   * 성공 여부를 돌려준다. 변경 모달은 이 값이 true일 때만 닫는다.
   */
  const handleEditSave = async (
    updatedRow: AutoTransferRow,
  ): Promise<boolean> => {
    try {
      await changeAutoTransfer(Number(updatedRow.id), {
        amount: updatedRow.amount,
        cycleMonths: updatedRow.cycleMonths,
        endDate: updatedRow.endDate,
        myPassbookMemo: updatedRow.memo,
        accountPasswordAuthToken: TEMP_AUTH_TOKEN,
      })
    } catch (error) {
      setActionErrorMessage(
        error instanceof ApiError
          ? error.message
          : "자동이체 변경에 실패했습니다.",
      )
      return false
    }

    const refreshed = await refetch()
    if (refreshed.isError) {
      setActionErrorMessage(
        "변경 결과를 다시 불러오지 못했습니다. 목록을 다시 조회해 주세요.",
      )
    }
    return true
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
  const exportRows = pageRows.map((r) => [
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
      key: "period",
      header: "이체기간",
      width: 200,
      render: (r) => (
        <span>
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
              "이미 종료·해지되었거나 오늘 실행 예정인 건은 선택에서 제외하세요.",
            ]}
          />

          <ErrorDialog
            open={actionErrorMessage != null}
            onClose={() => setActionErrorMessage(null)}
            title="처리 실패"
            messages={actionErrorMessage ? [actionErrorMessage] : []}
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
          onSearch={handleSearch}
          onSaveCondition={savedCondition.save}
        >
          {/* REQ-AUTO-009: 출금계좌는 조회조건이라 "전체"가 없다. 조회구분 쪽의
              "전체"와 혼동하지 말 것. */}
          <FormRow label="출금계좌번호" htmlFor="g04-from">
            <Select
              id="g04-from"
              className="max-w-md"
              value={selectedAccountId ?? ""}
              onChange={(e) => setFromAccountId(Number(e.target.value))}
            >
              {withdrawAccounts.map((a) => (
                <option key={a.accountId} value={a.accountId}>
                  {`${a.accountName ?? ""} / ${formatAccountNo(a.accountNumber ?? "")}`}
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
          // 레이블이 "해지 처리 중..."으로 길어져도 버튼 폭이 튀지 않게 잡아둔다.
          <Button
            variant="danger"
            size="sm"
            className="min-w-30"
            disabled={selectedRows.length === 0 || isTerminating}
            onClick={handleTerminateClick}
          >
            {isTerminating ? "해지 처리 중..." : "선택 해지"}
          </Button>
        }
      >
        <GridToolbar
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
            downloadCsv(`자동이체조회_${TODAY}.csv`, exportHeaders, exportRows)
            downloadComplete.save()
          }}
          resultLabel="자동이체조회"
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
              ? "자동이체 목록을 불러오지 못했습니다."
              : "조회된 자동이체가 없습니다."
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

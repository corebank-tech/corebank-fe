import * as React from "react"
import { QueryPageLayout } from "@/shared/ui/query-page-layout"
import { FormSection } from "@/shared/ui/form-section"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Alert } from "@/shared/ui/alert"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { ConfirmDialog } from "@/shared/ui/confirm-dialog"
import { formatAccountNo } from "@/shared/lib/format"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/shared/api/api-error"
import {
  ALIAS_KOREAN_MAX,
  ALIAS_ALNUM_MAX,
  getAccountOverviewQueryKey,
  isAliasLengthValid,
  toAliasAccounts,
  useAccountOverviewQuery,
  useDeleteAccountAliasMutation,
  useUpdateAccountAliasMutation,
  type AliasAccount,
} from "@/entities/account"

/** REQ-ACCT-013: 계좌별명 등록·수정·삭제. 한글 12자 / 영문·숫자 24자 이내. */
export const B06AccountAlias = () => {
  const queryClient = useQueryClient()

  const accountOverviewQuery = useAccountOverviewQuery()
  const updateAliasMutation = useUpdateAccountAliasMutation()
  const deleteAliasMutation = useDeleteAccountAliasMutation()

  const accounts = React.useMemo(
    () =>
      toAliasAccounts(
        (accountOverviewQuery.data?.items ?? []).flatMap(
          (group) => group.accounts ?? [],
        ),
      ),
    [accountOverviewQuery.data],
  )

  const [editingId, setEditingId] = React.useState<number | null>(null)
  const [draft, setDraft] = React.useState("")
  const [draftError, setDraftError] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AliasAccount | null>(
    null,
  )
  const [successMessage, setSuccessMessage] = React.useState<string | null>(
    null,
  )

  const [actionError, setActionError] = React.useState<string | null>(null)

  const isMutating =
    updateAliasMutation.isPending || deleteAliasMutation.isPending

  const startEdit = (row: AliasAccount) => {
    setSuccessMessage(null)
    setActionError(null)
    setEditingId(row.accountId)
    setDraft(row.alias ?? "")
    setDraftError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft("")
    setDraftError(null)
  }

  const saveEdit = async (row: AliasAccount) => {
    const value = draft.trim()

    if (value.length === 0) {
      setDraftError("별명을 입력하세요.")
      return
    }

    if (!isAliasLengthValid(value)) {
      setDraftError(
        `별명은 한글 ${ALIAS_KOREAN_MAX}자 또는 영문·숫자 ${ALIAS_ALNUM_MAX}자 이내로 입력하세요.`,
      )
      return
    }

    setDraftError(null)
    setActionError(null)
    setSuccessMessage(null)

    try {
      await updateAliasMutation.mutateAsync({
        accountId: row.accountId,
        data: {
          alias: value,
        },
      })

      await queryClient.invalidateQueries({
        queryKey: getAccountOverviewQueryKey(),
      })

      setSuccessMessage(
        `${row.productName}의 별명이 "${value}"(으)로 저장되었습니다.`,
      )

      cancelEdit()
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "계좌별명 저장 중 오류가 발생했습니다.",
      )
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return

    const target = deleteTarget

    setDeleteTarget(null)
    setSuccessMessage(null)
    setActionError(null)

    try {
      await deleteAliasMutation.mutateAsync({
        accountId: target.accountId,
      })

      await queryClient.invalidateQueries({
        queryKey: getAccountOverviewQueryKey(),
      })

      setSuccessMessage(`${target.productName}의 별명이 삭제되었습니다.`)
    } catch (error) {
      setActionError(
        error instanceof ApiError
          ? error.message
          : "계좌별명 삭제 중 오류가 발생했습니다.",
      )
    }
  }

  const columns: DataGridColumn<AliasAccount>[] = [
    { key: "productName", header: "상품명", width: 200 },
    {
      key: "accountNo",
      header: "계좌번호",
      width: 180,
      render: (r) => <span>{formatAccountNo(r.accountNo)}</span>,
    },
    {
      key: "alias",
      header: "별명",
      width: 260,
      render: (r) =>
        editingId === r.accountId ? (
          <div className="flex flex-col gap-1 py-1">
            <Input
              value={draft}
              autoFocus
              maxLength={ALIAS_ALNUM_MAX}
              onChange={(e) => {
                setDraft(e.target.value)
                if (draftError) setDraftError(null)
              }}
              invalid={draftError != null}
              placeholder="별명을 입력하세요"
              className="h-9"
            />
            {draftError && (
              <p role="alert" className="text-xs font-bold text-danger">
                {draftError}
              </p>
            )}
          </div>
        ) : r.alias ? (
          <span>{r.alias}</span>
        ) : (
          <span className="text-ink-faint">미등록</span>
        ),
    },
    {
      key: "actions",
      header: "업무",
      align: "center",
      width: 160,
      render: (r) =>
        editingId === r.accountId ? (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="primary"
              size="sm"
              disabled={isMutating}
              onClick={() => saveEdit(r)}
            >
              저장
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelEdit}>
              취소
            </Button>
          </div>
        ) : r.alias ? (
          <div className="flex items-center justify-center gap-1.5">
            <Button
              variant="secondary"
              size="sm"
              disabled={isMutating}
              onClick={() => startEdit(r)}
            >
              수정
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isMutating}
              onClick={() => setDeleteTarget(r)}
            >
              삭제
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            disabled={isMutating}
            onClick={() => startEdit(r)}
          >
            별명 등록
          </Button>
        ),
    },
  ]

  if (accountOverviewQuery.isLoading) {
    return (
      <div className="p-6 text-base text-ink-muted">
        계좌 정보를 불러오는 중입니다.
      </div>
    )
  }

  if (accountOverviewQuery.isError) {
    return (
      <div className="p-6 text-base text-danger">
        계좌 정보를 불러오지 못했습니다.
      </div>
    )
  }

  return (
    <QueryPageLayout
      noticeItems={[
        "별명은 한글 12자 또는 영문·숫자 24자 이내로 등록할 수 있습니다.",
        "별명을 등록하면 계좌조회·이체 등 전 화면의 계좌 표시가 상품명 대신 별명으로 바뀝니다.",
        "별명을 삭제하면 다시 상품명으로 표시됩니다.",
      ]}
      footerItems={[
        "별명은 한글 12자 또는 영문·숫자 24자 이내로 제한되며, 초과 입력 시 저장되지 않습니다(REQ-ACCT-013).",
        "별명이 등록된 계좌는 계좌조회·이체 등 전 화면에서 상품명 대신 별명으로 표시됩니다(REQ-ACCT-013).",
        "별명을 삭제하면 해당 계좌는 다시 상품명으로 표시됩니다.",
      ]}
      modals={
        <ConfirmDialog
          open={deleteTarget != null}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
          title="계좌별명 삭제"
          messages={[
            "선택한 계좌의 별명을 삭제합니다.",
            "삭제 후에는 상품명으로 표시됩니다.",
          ]}
          confirmLabel="삭제하기"
          items={
            deleteTarget
              ? [
                  {
                    label: deleteTarget.productName,
                    value: formatAccountNo(deleteTarget.accountNo),
                  },
                  { label: "현재 별명", value: deleteTarget.alias ?? "-" },
                ]
              : []
          }
        />
      }
    >
      {successMessage && <Alert variant="success">{successMessage}</Alert>}
      {actionError && <Alert variant="danger">{actionError}</Alert>}

      <FormSection title="계좌별명 관리" className="mb-0">
        <DataGrid
          columns={columns}
          rows={accounts}
          rowKey={(r) => String(r.accountId)}
          emptyMessage="보유한 계좌가 없습니다."
        />
      </FormSection>
    </QueryPageLayout>
  )
}

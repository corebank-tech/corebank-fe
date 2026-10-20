import * as React from "react"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import {
  useReconciliationMismatches,
  type ReconciliationMismatch,
} from "@/entities/ledger-reconciliation"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatAmount, formatDate, formatDateTime } from "@/shared/lib/format"
import { QUERY_DEFAULT_PAGE_SIZE } from "@/shared/config/policy"

/**
 * ADM-04 대사 불일치 목록(#130-①) — COB 원장 대사가 찾은 원장 합계 ≠ 계좌 잔액 계좌.
 *
 * 조회 전용이다. 대사는 불일치를 보고만 하고 자동 정정은 하지 않으므로(서버
 * `glossary.md` 정정 체인) 이 화면에 변경 액션을 두지 않는다(REQ-ADM-041).
 *
 * 페이지 크기는 관리자 목록 규정(POL-A06, 10건 고정)이다. 값은 ADM-01 과 같이
 * `QUERY_DEFAULT_PAGE_SIZE` 를 빌린다(`adm01-customer-list.tsx`).
 */

/**
 * 차액(원장 − 잔액)의 방향. 부호만 보여주면 "원장이 많다"와 "잔액이 많다"를 읽는
 * 사람이 매번 뒤집어 생각해야 한다(REQ-ADM-041).
 */
const differenceDirection = (difference: number) => {
  if (difference > 0) return "잔액 부족"
  if (difference < 0) return "잔액 초과"
  return null
}

export const Adm04ReconciliationMismatches = () => {
  // 입력 중인 값과 [조회]로 확정한 값을 나눈다 — 날짜를 고르는 동안 표가 따라
  // 바뀌면 지금 보이는 목록이 어느 영업일 것인지 말할 수 없다.
  const [draftDate, setDraftDate] = React.useState("")
  const [appliedDate, setAppliedDate] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const { mismatchPage, isFetching, isError, error } =
    useReconciliationMismatches({
      businessDate: appliedDate,
      page,
      size: QUERY_DEFAULT_PAGE_SIZE,
    })

  const handleSearch = () => {
    setAppliedDate(draftDate || null)
    setPage(1)
  }

  const handleReset = () => {
    setDraftDate("")
    setAppliedDate(null)
    setPage(1)
  }

  // 0건이면 응답에서 영업일을 알 수 없다. 지정한 영업일이 있으면 그것을 쓴다.
  const shownDate = mismatchPage?.businessDate ?? appliedDate

  /**
   * 0건 안내에 "일치"라는 말을 쓰지 않는다. 테이블은 불일치만 담아서, 대사가 돌았는데
   * 불일치가 없던 날과 대사가 돌지 않은 날이 같은 0건으로 온다(REQ-ADM-042).
   */
  const emptyMessage = isError
    ? (toErrorMessage(error) ?? "")
    : appliedDate
      ? `${formatDate(appliedDate)} 영업일에 기록된 불일치가 없습니다. 대사가 실행되지 않은 날도 같은 결과가 나옵니다.`
      : "기록된 대사 불일치가 없습니다."

  const columns: DataGridColumn<ReconciliationMismatch>[] = [
    {
      key: "accountId",
      header: "계좌 ID",
      align: "center",
      width: 100,
    },
    {
      key: "ledgerBalance",
      header: "원장 합계",
      align: "right",
      render: (row) => formatAmount(row.ledgerBalance, { suffix: false }),
    },
    {
      key: "accountBalance",
      header: "계좌 잔액",
      align: "right",
      render: (row) => formatAmount(row.accountBalance, { suffix: false }),
    },
    {
      key: "difference",
      header: "차액(원장−잔액)",
      align: "right",
      render: (row) => {
        const direction = differenceDirection(row.difference)
        return (
          <span className="inline-flex items-center gap-2">
            {formatAmount(row.difference, { suffix: false })}
            {direction && <Badge variant="danger">{direction}</Badge>}
          </span>
        )
      },
    },
    {
      key: "detectedAt",
      header: "확인 시각",
      align: "center",
      width: 170,
      render: (row) => formatDateTime(row.detectedAt),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="조회조건" className="mb-0">
        <FormRow label="영업일" htmlFor="adm-rc-date">
          <Input
            id="adm-rc-date"
            type="date"
            className="w-[180px]"
            value={draftDate}
            onChange={(event) => setDraftDate(event.target.value)}
          />
        </FormRow>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="primary"
            size="md"
            className="min-w-25"
            onClick={handleSearch}
          >
            조회
          </Button>
          <Button
            variant="secondary"
            size="md"
            className="min-w-25"
            onClick={handleReset}
          >
            초기화
          </Button>
        </div>
      </FormSection>

      <FormSection title="조회결과" className="mb-0">
        {mismatchPage && !isError && shownDate && (
          <p className="mb-2 text-base text-ink">
            <span className="font-bold text-primary">
              [{formatDate(shownDate)} 영업일]
            </span>{" "}
            불일치 {mismatchPage.totalCount.toLocaleString("ko-KR")}건
          </p>
        )}

        <DataGrid
          columns={columns}
          rows={isError ? [] : (mismatchPage?.items ?? [])}
          loading={isFetching}
          rowKey={(row) => `${row.businessDate}-${row.accountId}`}
          emptyMessage={emptyMessage}
        />

        <Pagination
          page={page}
          totalPages={isError ? 0 : (mismatchPage?.totalPages ?? 0)}
          onPageChange={setPage}
        />
      </FormSection>

      <NoticeBoxFooter
        items={[
          "영업일을 비우고 조회하면 가장 최근에 불일치가 기록된 영업일을 보여줍니다.",
          "차액은 원장 합계에서 계좌 잔액을 뺀 값입니다. 양수면 잔액이 원장보다 적고, 음수면 많습니다.",
          "대사는 불일치를 보고만 하며 자동으로 정정하지 않습니다.",
          "불일치가 없던 날과 대사가 실행되지 않은 날은 이 화면에서 구분되지 않습니다.",
        ]}
      />
    </div>
  )
}

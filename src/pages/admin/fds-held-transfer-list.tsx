import * as React from "react"
import { useNavigate } from "react-router"
import {
  useFdsHeldTransfers,
  type FdsHoldListItem,
  type GetFdsHeldTransfersParams,
} from "@/entities/fds"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Pagination } from "@/shared/ui/pagination"
import { Select } from "@/shared/ui/select"

type Filters = Pick<
  GetFdsHeldTransfersParams,
  "holdStatus" | "policyCode" | "riskStatus" | "investigationStatus"
>
const emptyFilters: Filters = {}
const won = (value?: number) =>
  value == null ? "-" : `${value.toLocaleString("ko-KR")}원`

export const FdsHeldTransferList = () => {
  const navigate = useNavigate()
  const [draft, setDraft] = React.useState<Filters>(emptyFilters)
  const [filters, setFilters] = React.useState<Filters>(emptyFilters)
  const [page, setPage] = React.useState(0)
  const query = useFdsHeldTransfers({ page, size: 20, ...filters })
  const rows = query.data?.items ?? []
  const update = (key: keyof Filters, value: string) =>
    setDraft((current) => ({ ...current, [key]: value || undefined }))
  const columns: DataGridColumn<FdsHoldListItem>[] = [
    {
      key: "id",
      header: "사건 ID",
      render: (row) => row.transferHoldId ?? "-",
    },
    { key: "heldAt", header: "보류 시각", render: (row) => row.heldAt ?? "-" },
    {
      key: "recipient",
      header: "수취 계좌",
      render: (row) =>
        `${row.recipientBankCode ?? "-"} ${row.recipientAccountMasked ?? "-"}`,
    },
    {
      key: "amount",
      header: "요청금액",
      align: "right",
      render: (row) => won(row.amount),
    },
    {
      key: "policy",
      header: "정책",
      align: "center",
      render: (row) => <Badge variant="warning">{row.policyCode ?? "-"}</Badge>,
    },
    {
      key: "investigation",
      header: "조사",
      align: "center",
      render: (row) => row.investigationStatus ?? "-",
    },
    {
      key: "risk",
      header: "위험 계좌",
      align: "center",
      render: (row) => (
        <Badge
          variant={
            row.riskAccountStatus === "MATCH"
              ? "danger"
              : row.riskAccountStatus === "NO_MATCH"
                ? "success"
                : "warning"
          }
        >
          {row.riskAccountStatus ?? "-"}
        </Badge>
      ),
    },
    {
      key: "actionStatus",
      header: "조치 상태",
      align: "center",
      render: (row) => row.latestActionStatus ?? "미처리",
    },
    {
      key: "action",
      header: "처리",
      align: "center",
      render: (row) => (
        <Button
          size="sm"
          disabled={row.transferHoldId == null}
          onClick={() =>
            navigate(`/admin/fds/held-transfers/${row.transferHoldId}`)
          }
        >
          상세
        </Button>
      ),
    },
  ]
  const select = (label: string, key: keyof Filters, values: string[]) => (
    <FormRow label={label} htmlFor={`fds-${key}`}>
      <Select
        id={`fds-${key}`}
        value={draft[key] ?? ""}
        onChange={(event) => update(key, event.target.value)}
      >
        <option value="">전체</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </Select>
    </FormRow>
  )
  return (
    <div className="flex flex-col gap-6">
      <FormSection title="조회조건" className="mb-0">
        <div className="grid border-t border-border md:grid-cols-2">
          {select("보류 상태", "holdStatus", ["HELD", "RELEASED", "REJECTED"])}
          {select("보류 정책", "policyCode", ["A", "B"])}
          {select("위험 계좌", "riskStatus", [
            "MATCH",
            "NO_MATCH",
            "UNAVAILABLE",
          ])}
          {select("조사 상태", "investigationStatus", [
            "PENDING",
            "RUNNING",
            "COMPLETED",
            "FAILED",
          ])}
        </div>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            onClick={() => {
              setPage(0)
              setFilters(draft)
            }}
          >
            조회
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDraft(emptyFilters)
              setFilters(emptyFilters)
              setPage(0)
            }}
          >
            초기화
          </Button>
        </div>
      </FormSection>
      <FormSection
        title={`조회결과 (${query.data?.totalElements ?? 0}건)`}
        className="mb-0"
      >
        {query.isLoading ? (
          <p role="status" className="p-8 text-center">
            보류 거래를 불러오는 중입니다.
          </p>
        ) : query.isError ? (
          <div role="alert" className="p-8 text-center">
            <p>보류 거래를 불러오지 못했습니다.</p>
            <Button className="mt-3" onClick={() => void query.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : (
          <DataGrid
            columns={columns}
            rows={rows}
            rowKey={(row) => String(row.transferHoldId)}
            emptyMessage="조건에 해당하는 FDS 보류 거래가 없습니다."
          />
        )}
        <Pagination
          page={page + 1}
          totalPages={query.data?.totalPages ?? 0}
          onPageChange={(next) => setPage(next - 1)}
        />
      </FormSection>
    </div>
  )
}

import * as React from "react"
import { Link } from "react-router"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Pagination } from "@/shared/ui/pagination"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import {
  readAdminCustomers,
  type AdminCustomer,
} from "@/entities/admin-customer"
import {
  formatDateTime,
  maskEmail,
  maskName,
  maskUserId,
} from "@/shared/lib/format"
import {
  LOGIN_MAX_ATTEMPTS,
  QUERY_DEFAULT_PAGE_SIZE,
} from "@/shared/config/policy"

/**
 * ADM-01 관리자 고객 계정 운영 — 검색·목록.
 *
 * 대응 서버 API(PH-97)가 아직 없어 목 데이터를 직접 필터링한다. 실 API가 오면
 * 조건을 요청 파라미터로 넘기고 페이징도 서버로 옮긴다 — 그때 바꿀 자리를
 * `filterCustomers` 와 페이지 슬라이스 두 곳으로 모아 뒀다.
 *
 * 개인정보는 목록에서도 마스킹해 표시한다. 관리자가 대상을 특정하는 수단은
 * 검색 조건이지 화면에 찍힌 원본 값이 아니다.
 */

/** 상태 필터. 잠김은 `status` 가 아니라 `accountLocked` 라 별도 선택지로 둔다. */
const STATUS_FILTER_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "정상", value: "active" },
  { label: "정지", value: "suspended" },
  { label: "잠김", value: "locked" },
] as const

type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number]["value"]

type SearchCondition = {
  userId: string
  userName: string
  email: string
  status: StatusFilter
}

const EMPTY_CONDITION: SearchCondition = {
  userId: "",
  userName: "",
  email: "",
  status: "all",
}

const matchesStatus = (
  customer: AdminCustomer,
  status: StatusFilter,
): boolean => {
  if (status === "all") return true
  if (status === "locked") return customer.accountLocked
  if (status === "suspended") return customer.status === "SUSPENDED"
  // 정상 = 정지도 잠김도 아닌 계정. 둘 중 하나라도 걸리면 운영 대상이다.
  return customer.status === "ACTIVE" && !customer.accountLocked
}

const filterCustomers = (
  customers: AdminCustomer[],
  condition: SearchCondition,
): AdminCustomer[] => {
  const userId = condition.userId.trim().toLowerCase()
  const userName = condition.userName.trim()
  const email = condition.email.trim().toLowerCase()

  return customers.filter((customer) => {
    if (userId && !customer.userId.toLowerCase().includes(userId)) return false
    if (userName && !customer.userName.includes(userName)) return false
    if (email && !customer.email.toLowerCase().includes(email)) return false
    return matchesStatus(customer, condition.status)
  })
}

export const Adm01CustomerList = () => {
  // 입력 중인 값과 [조회]로 확정한 값을 나눈다 — 타이핑하는 동안 목록이 따라
  // 바뀌면 조회 결과가 어느 조건의 것인지 화면에서 말할 수 없다.
  const [draft, setDraft] = React.useState<SearchCondition>(EMPTY_CONDITION)
  const [applied, setApplied] = React.useState<SearchCondition>(EMPTY_CONDITION)
  const [page, setPage] = React.useState(1)

  const rows = React.useMemo(
    // 상세 화면에서 잠금 해제·상태 변경을 하면 저장소가 바뀐다. 마운트 시점에
    // 다시 읽어야 목록으로 돌아왔을 때 배지가 갱신된다.
    () => filterCustomers(readAdminCustomers(), applied),
    [applied],
  )

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / QUERY_DEFAULT_PAGE_SIZE),
  )
  // 조건이 좁아져 결과가 줄면 totalPages 만 작아지고 page 는 그대로라 빈 화면이 된다.
  if (page > totalPages) setPage(totalPages)

  const pageRows = rows.slice(
    (page - 1) * QUERY_DEFAULT_PAGE_SIZE,
    page * QUERY_DEFAULT_PAGE_SIZE,
  )

  const setField = <K extends keyof SearchCondition>(
    key: K,
    value: SearchCondition[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const handleSearch = () => {
    setApplied(draft)
    setPage(1)
  }

  const handleReset = () => {
    setDraft(EMPTY_CONDITION)
    setApplied(EMPTY_CONDITION)
    setPage(1)
  }

  const columns: DataGridColumn<AdminCustomer>[] = [
    {
      key: "userId",
      header: "아이디",
      width: 140,
      sortable: true,
      sortValue: (row) => row.userId,
      render: (row) => maskUserId(row.userId),
    },
    {
      key: "userName",
      header: "성명",
      align: "center",
      width: 90,
      sortable: true,
      sortValue: (row) => row.userName,
      render: (row) => maskName(row.userName),
    },
    // 생년월일·연락처는 목록에 두지 않는다. 마스킹하면(`1988.**.**`) 대상을
    // 가려내는 데 쓸 수 없어 식별 가치가 없고, 목록은 검색으로 좁히는 화면이라
    // 개인정보를 덜 뿌리는 편이 낫다. 두 값은 상세에서 마스킹된 채로 본다.
    {
      key: "email",
      header: "이메일",
      render: (row) => maskEmail(row.email),
    },
    {
      key: "loginFailureCount",
      header: "로그인 실패",
      align: "center",
      width: 100,
      sortable: true,
      sortValue: (row) => row.loginFailureCount,
      render: (row) => (
        <span className={row.loginFailureCount > 0 ? "text-danger" : undefined}>
          {row.loginFailureCount}/{LOGIN_MAX_ATTEMPTS}
        </span>
      ),
    },
    {
      key: "state",
      header: "상태",
      align: "center",
      width: 130,
      render: (row) => (
        <span className="inline-flex gap-1">
          <Badge variant={row.status === "ACTIVE" ? "success" : "danger"}>
            {row.status === "ACTIVE" ? "정상" : "정지"}
          </Badge>
          {/* 잠김은 상태와 별개 축이다 — 정지 계정이 잠겨 있을 수도, 정상 계정이
              5회 실패로 잠겨 있을 수도 있어 배지를 겹쳐 보여준다. */}
          {row.accountLocked && <Badge variant="warning">잠김</Badge>}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "최근 로그인",
      align: "center",
      width: 160,
      sortable: true,
      sortValue: (row) => row.lastLoginAt ?? "",
      render: (row) =>
        row.lastLoginAt ? (
          formatDateTime(row.lastLoginAt)
        ) : (
          <span className="text-ink-faint">이력 없음</span>
        ),
    },
    {
      key: "detail",
      header: "관리",
      align: "center",
      width: 70,
      // DataGrid 에 행 클릭 기능이 없다. 공용 컴포넌트에 prop 을 더하면 고객 화면
      // 8곳의 회귀 범위가 열리므로, 진입점을 셀 안의 링크로 둔다.
      render: (row) => (
        <Link
          to={`/admin/customers/${row.customerId}`}
          className="text-link hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          상세
        </Link>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="조회조건" className="mb-0">
        {/* 고객 조회화면의 `SearchPanel` 을 쓰지 않는다 — 그 컴포넌트는 [조회조건저장]
            링크를 항상 그리는데, 관리자 화면에는 저장할 조건 규정이 없어 눌러도
            아무 일이 없는 죽은 컨트롤이 된다. */}
        <div>
          <FormRow label="아이디" htmlFor="adm-search-user-id">
            <Input
              id="adm-search-user-id"
              className="max-w-xs"
              autoComplete="off"
              value={draft.userId}
              onChange={(event) => setField("userId", event.target.value)}
            />
          </FormRow>
          <FormRow label="성명" htmlFor="adm-search-user-name">
            <Input
              id="adm-search-user-name"
              className="max-w-xs"
              autoComplete="off"
              value={draft.userName}
              onChange={(event) => setField("userName", event.target.value)}
            />
          </FormRow>
          <FormRow label="이메일" htmlFor="adm-search-email">
            <Input
              id="adm-search-email"
              className="max-w-md"
              autoComplete="off"
              value={draft.email}
              onChange={(event) => setField("email", event.target.value)}
            />
          </FormRow>
          <FormRow label="계정 상태" htmlFor="adm-search-status">
            <Select
              id="adm-search-status"
              className="max-w-40"
              value={draft.status}
              onChange={(event) =>
                setField("status", event.target.value as StatusFilter)
              }
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormRow>
        </div>

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
        <p className="mb-2 text-base text-ink">
          <span className="font-bold text-primary">
            [총 {rows.length.toLocaleString("ko-KR")}건]
          </span>
        </p>

        <DataGrid
          columns={columns}
          rows={pageRows}
          rowKey={(row) => String(row.customerId)}
          emptyMessage="조회 조건에 해당하는 고객이 없습니다."
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </FormSection>

      <NoticeBoxFooter
        items={[
          "고객 정보는 목록·상세 모두 마스킹되어 표시됩니다. 대상 특정은 검색 조건으로 합니다.",
          "계정 잠금은 로그인 5회 연속 실패(POL-003) 외에 관리자가 직접 잠근 경우에도 발생합니다.",
          "계정 잠금 해제는 관리자 수동 처리로만 가능하며 고객용 해제 화면은 제공하지 않습니다(REQ-AUTH-026).",
          "서버 API 연동 전이라 현재 표시되는 값은 목업 데이터입니다.",
        ]}
      />
    </div>
  )
}

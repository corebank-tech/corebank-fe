import * as React from "react"
import { FormRow } from "@/shared/ui/form-row"
import { FormSection } from "@/shared/ui/form-section"
import { Select } from "@/shared/ui/select"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { Alert } from "@/shared/ui/alert"
import { SummaryRow } from "@/shared/ui/summary-row"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"
import { PeriodField } from "@/widgets/query"
import { checkPeriodRange } from "@/entities/transaction"
import {
  aggregateTrialBalance,
  MOCK_JOURNAL_ENTRIES,
  UNKNOWN_ACCOUNT_NAME,
  type GlAccountClass,
  type TrialBalanceRow,
} from "@/entities/gl"
import { formatAmount, formatDate } from "@/shared/lib/format"
import { getToday } from "@/shared/config/clock"
import { recentPeriod } from "@/shared/config/query-period"
import { QUERY_MAX_RANGE_DAYS } from "@/shared/config/policy"

/**
 * ADM-02 시산표(#128) — 기간별 계정별 차변·대변 합계.
 *
 * 대응 서버 API(PH-28)가 아직 없고 GL 스키마도 없어, 목 분개를 화면이 직접 집계한다.
 * 집계는 `entities/gl` 에 있고 이 파일은 그것을 화면에 붙이기만 한다 — 실 API가 오면
 * 조건이 그대로 요청 파라미터가 되고 집계는 서버 네이티브 SQL 로 옮긴다.
 *
 * **범위는 "시산표 한 장"이다**(v3 `00-프로젝트-개요.md` §3-2, `00b-이슈교통정리.md`).
 * 계정과목 트리 · 전표/분개 목록·상세 · 분개 패턴 참조 화면은 범위 밖이고,
 * 조회 사유 게이트(PH-89)와 기준시점 표기(PH-84)도 대응 BE 가 2차에서 빠져 넣지 않는다.
 * 이슈 #128 본문의 완료 조건 중 그 둘을 요구하는 항목은 v3 정정 배너로 대체됐다.
 *
 * **집계 소요 표시도 넣지 않는다.** 이슈 #128 작업 내용에 "시산표 집계 시간 표시"가
 * 있고 v3 배너가 그것까지 제외하지는 않았다. 넣지 않는 이유는 여기서 재는 값이
 * 목 배열을 한 바퀴 도는 시간이라 **항상 0ms 에 가깝고, 실제로 재야 하는 수치가
 * 아니기 때문**이다. 그 지표(`P3-회계정보계RAG.md:31` "시산표 집계 시간 600만 분개")는
 * 서버가 네이티브 SQL 로 재는 것이고 FE 는 응답에 실려 오면 그때 표시하면 된다.
 * PH-28 응답에 소요 필드를 넣을지는 스키마 선전달 때 함께 정한다.
 */

const ACCOUNT_CLASS_LABELS: Record<GlAccountClass, string> = {
  ASSET: "자산",
  LIABILITY: "부채",
  EQUITY: "자본",
  REVENUE: "수익",
  EXPENSE: "비용",
}

/**
 * 분류 선택지. `satisfies` 로 묶어 둔다 — 분류가 늘었는데 선택지를 안 만들거나
 * 없는 값을 적으면 타입 오류로 드러난다.
 */
const CLASS_FILTER_OPTIONS = [
  { label: "전체", value: "all" },
  ...(Object.keys(ACCOUNT_CLASS_LABELS) as GlAccountClass[]).map((value) => ({
    label: ACCOUNT_CLASS_LABELS[value],
    value,
  })),
] satisfies { label: string; value: GlAccountClass | "all" }[]

type ClassFilter = GlAccountClass | "all"

type Condition = {
  period: { start: string; end: string }
  accountClass: ClassFilter
}

/**
 * 기본 조회조건. **객체가 아니라 팩토리다.**
 *
 * 마운트 시점에 한 번 만들어 두면 자정을 넘겨 열어둔 탭에서 [초기화]가 어제 기준
 * 기간을 되돌린다 — `shared/config/clock.ts` 가 상수 대신 함수를 쓰는 이유와 같다.
 * 형제 조회화면도 초기화마다 팩토리를 다시 부른다(`e05-reservation-results.tsx:100`
 * · `d04-transfer-history.tsx:182` · `b03-transaction-inquiry.tsx:348`).
 *
 * 기간 기본값은 조회화면 관용구(최근 1개월)를 빌린 것이고 **POL-021 을 적용한 것이
 * 아니다** — 그 규정의 인수기준 화면은 B-03·D-04·E-05·G-05 로 전부 고객 조회화면이고,
 * 관리자 화면에는 요구사항 자체가 없다(`docs/requirements.md` 확인). 근거가 생기면
 * 그때 상수를 갈아끼운다.
 */
const createDefaultCondition = (): Condition => ({
  period: recentPeriod(),
  accountClass: "all",
})

export const Adm02TrialBalance = () => {
  const TODAY = getToday()

  // 입력 중인 값과 [조회]로 확정한 값을 나눈다 — 타이핑하는 동안 표가 따라 바뀌면
  // 화면에 찍힌 합계가 어느 기간의 것인지 말할 수 없다.
  const [draft, setDraft] = React.useState<Condition>(createDefaultCondition)
  const [applied, setApplied] = React.useState<Condition>(
    createDefaultCondition,
  )

  const result = React.useMemo(
    () => aggregateTrialBalance(MOCK_JOURNAL_ENTRIES, applied.period),
    [applied.period],
  )

  /**
   * 분류 필터는 집계 **뒤에** 건다. 앞에 걸면 걸러진 계정의 금액이 총계에서 빠져
   * 차대변이 맞지 않게 나오는데, 그건 장부가 틀린 게 아니라 화면이 자른 결과다.
   * 시산표의 총계는 언제나 기간 전체를 대상으로 해야 한다.
   */
  const visibleRows =
    applied.accountClass === "all"
      ? result.rows
      : result.rows.filter((row) => row.accountClass === applied.accountClass)

  /**
   * 요약 줄의 분개 수는 **표에 보이는 행 기준**이다. `result.journalEntryCount`
   * (기간 전체)를 쓰면 한 문장 안에서 계정 수는 걸러진 값, 분개 수는 걸러지지 않은
   * 값이 되어 표의 `분개 줄` 열을 더한 것과 맞지 않는다.
   *
   * 기간 전체의 크기는 아래 `SummaryRow` 의 차변·대변 **총계**가 말한다 — 그쪽은
   * 분류 선택과 무관하게 기간 전체 기준이고, 그 사실은 하단 안내문구에 적혀 있다.
   */
  const visibleEntryCount = visibleRows.reduce(
    (sum, row) => sum + row.entryCount,
    0,
  )

  const { incomplete, reversed, overLimit } = checkPeriodRange(
    draft.period.start,
    draft.period.end,
    TODAY,
    QUERY_MAX_RANGE_DAYS,
  )
  // `PeriodField` 는 안내 문구만 그리고 조회를 막지는 않는다. 막는 책임은 화면에 있다.
  const periodInvalid = incomplete || reversed || overLimit

  const handleSearch = () => {
    if (periodInvalid) return
    setApplied(draft)
  }

  const handleReset = () => {
    // 얼어붙은 값을 되돌리지 않고 지금 기준으로 다시 만든다.
    const next = createDefaultCondition()
    setDraft(next)
    setApplied(next)
  }

  /**
   * 정렬 가능 컬럼을 두지 않는다. 이 화면은 `DataGrid` 에 전체 목록을 넘기므로
   * 정렬을 켜도 결과 전체를 대상으로 돌아 **틀리지는 않는다** — 다만 시산표는
   * 계정과목 코드 순으로 읽는 표이고 행이 열다섯 남짓이라 재배열할 이유가 없다.
   * 페이징을 두지 않는 이유도 같다(계정 15개 내외, PH-20).
   */
  const columns: DataGridColumn<TrialBalanceRow>[] = [
    {
      key: "accountCode",
      header: "계정코드",
      align: "center",
      width: 100,
    },
    {
      key: "accountName",
      header: "계정과목",
      render: (row) =>
        row.accountName === UNKNOWN_ACCOUNT_NAME ? (
          // 계정과목에 없는 코드가 분개에 섞인 상태다. 조용히 지나가면 시산표가
          // 숨겨야 할 것을 숨긴다.
          <span className="font-bold text-danger">{row.accountName}</span>
        ) : (
          row.accountName
        ),
    },
    {
      key: "accountClass",
      header: "분류",
      align: "center",
      width: 80,
      // 미등록 계정은 분류가 없다. 코드 첫 자리로 추측하면 `99999` 가 "자산"으로
      // 찍혀, 이름은 빨갛게 미등록이라 말하면서 옆 배지는 멀쩡한 계정처럼 보인다.
      render: (row) =>
        row.accountClass ? (
          <Badge variant="neutral">
            {ACCOUNT_CLASS_LABELS[row.accountClass]}
          </Badge>
        ) : (
          <Badge variant="danger">미등록</Badge>
        ),
    },
    {
      key: "normalBalance",
      header: "정상잔액",
      align: "center",
      width: 90,
      render: (row) =>
        row.normalBalance == null ? (
          <span className="text-ink-faint">—</span>
        ) : row.normalBalance === "DEBIT" ? (
          "차변"
        ) : (
          "대변"
        ),
    },
    {
      key: "debitTotal",
      header: "차변 합계",
      align: "right",
      render: (row) => formatAmount(row.debitTotal, { suffix: false }),
    },
    {
      key: "creditTotal",
      header: "대변 합계",
      align: "right",
      render: (row) => formatAmount(row.creditTotal, { suffix: false }),
    },
    {
      key: "entryCount",
      header: "분개 줄",
      align: "center",
      width: 80,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <FormSection title="조회조건" className="mb-0">
        {/* 고객 조회화면의 `SearchPanel` 을 쓰지 않는다 — 그 컴포넌트는 [조회조건저장]
            링크를 항상 그리는데, 관리자 화면에는 저장할 조건 규정이 없어 눌러도
            아무 일이 없는 죽은 컨트롤이 된다. 기간 입력만 `PeriodField` 로 가져온다. */}
        <div>
          <FormRow label="조회기간">
            <PeriodField
              start={draft.period.start}
              end={draft.period.end}
              onChange={(period) => setDraft((prev) => ({ ...prev, period }))}
              today={TODAY}
            />
          </FormRow>
          <FormRow label="계정분류" htmlFor="adm-tb-class">
            <Select
              id="adm-tb-class"
              className="max-w-40"
              value={draft.accountClass}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  accountClass: event.target.value as ClassFilter,
                }))
              }
            >
              {CLASS_FILTER_OPTIONS.map((option) => (
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
            disabled={periodInvalid}
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
            [{formatDate(result.fromDate)} ~ {formatDate(result.toDate)}]
          </span>{" "}
          계정 {visibleRows.length.toLocaleString("ko-KR")}개 · 분개{" "}
          {visibleEntryCount.toLocaleString("ko-KR")}줄
        </p>

        {/* 총계는 언제나 기간 전체 기준이다. 분류를 걸러도 이 값은 변하지 않는다 —
            차대변 일치는 장부의 성질이지 화면이 보여주는 범위의 성질이 아니다. */}
        <SummaryRow
          className="mb-2"
          items={[
            { label: "차변 총계", value: formatAmount(result.debitGrandTotal) },
            {
              label: "대변 총계",
              value: formatAmount(result.creditGrandTotal),
            },
            {
              label: "차대변",
              value: result.balanced ? (
                <Badge variant="success">일치</Badge>
              ) : (
                <Badge variant="danger">
                  불일치 {formatAmount(result.difference)}
                </Badge>
              ),
              numeric: false,
            },
          ]}
        />

        {!result.balanced && (
          <Alert
            variant="danger"
            className="mb-2"
            title="차변 총계와 대변 총계가 일치하지 않습니다"
          >
            전표 단위 차대변 일치가 깨진 상태입니다. 차액{" "}
            {formatAmount(result.difference)}. 분개 누락·편측기표·금액변조 중
            하나일 수 있으므로 해당 기간의 전표를 확인해야 합니다.
          </Alert>
        )}

        <DataGrid
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.accountCode}
          emptyMessage="해당 기간에 발생한 분개가 없습니다."
        />
      </FormSection>

      <NoticeBoxFooter
        items={[
          "시산표는 전표 단위로 차변과 대변이 일치해야 하며, 총계가 어긋나면 화면 상단에 불일치로 표시됩니다.",
          "합계는 분류 선택과 무관하게 조회기간 전체를 대상으로 집계합니다. 분류는 표시할 계정만 고릅니다.",
          "계정과목에 등록되지 않은 코드가 분개에 있으면 계정과목과 분류를 빨간색으로 표시합니다.",
          "계정과목 상세와 전표·분개 조회 화면은 이번 범위에 포함되지 않습니다.",
          "서버 API 연동 전이라 현재 표시되는 값은 목업 데이터입니다.",
        ]}
      />
    </div>
  )
}

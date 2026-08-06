import * as React from "react"
import { FormSection } from "@/shared/ui/form-section"
import { SearchPanel } from "@/widgets/query"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { StepLayout } from "@/shared/ui/step-layout"
import { ConfirmSummary } from "@/shared/ui/confirm-summary"
import { Button } from "@/shared/ui/button"
import { ResultPanel, type ResultVariant } from "@/widgets/transfer"
import { Badge } from "@/shared/ui/badge"
import { formatAmount, formatDate } from "@/shared/lib/format"

const PREVIEW_STEPS = ["정보입력", "정보확인", "완료"]

type PreviewRow = { label: string; amount: number; date: string }

const PREVIEW_COLUMNS: DataGridColumn<PreviewRow>[] = [
  { key: "label", header: "적요" },
  {
    key: "amount",
    header: "금액",
    align: "right",
    render: (r) => formatAmount(r.amount),
  },
  {
    key: "date",
    header: "일자",
    align: "center",
    render: (r) => formatDate(r.date),
  },
]

const PREVIEW_ROWS: PreviewRow[] = [
  { label: "정기예금 이자", amount: 125_000, date: "2026-07-20" },
  { label: "급여", amount: 3_200_000, date: "2026-07-18" },
  { label: "카드대금", amount: -642_000, date: "2026-07-15" },
]

const RESULT_VARIANTS: { id: ResultVariant; label: string }[] = [
  { id: "success", label: "정상" },
  { id: "fail", label: "오류" },
  { id: "pending", label: "처리중" },
]

/** DataGrid, SearchPanel, StepLayout(+ConfirmSummary), ResultPanel 조합 미리보기. */
export const CompositionGallery = () => {
  const [variant, setVariant] = React.useState<ResultVariant>("success")

  return (
    <div className="flex flex-col gap-8">
      <FormSection title="SearchPanel + DataGrid">
        <SearchPanel onSearch={() => {}} onReset={() => {}}>
          <FormRow label="검색어">
            <Input placeholder="적요를 입력하세요" className="max-w-xs" />
          </FormRow>
        </SearchPanel>
        <div className="mt-3">
          <DataGrid columns={PREVIEW_COLUMNS} rows={PREVIEW_ROWS} />
        </div>
      </FormSection>

      <FormSection title="StepLayout + ConfirmSummary">
        <div className="border border-border p-4">
          <StepLayout
            steps={PREVIEW_STEPS}
            currentStep={2}
            title="스텝 레이아웃 미리보기"
            footer={
              <>
                <Button variant="secondary">이전</Button>
                <Button variant="primary">다음</Button>
              </>
            }
          >
            <ConfirmSummary
              columns={[
                { label: "출금계좌", value: "자유입출금 110-632-892336" },
                { label: "입금계좌", value: "333-330-730135" },
                { label: "이체금액", value: "500,000원", emphasis: true },
              ]}
            />
          </StepLayout>
        </div>
      </FormSection>

      <FormSection title="ResultPanel — variant 전수">
        <div className="mb-4 flex items-center gap-2">
          {RESULT_VARIANTS.map((v) => (
            <Button
              key={v.id}
              variant={variant === v.id ? "primary" : "outline"}
              size="sm"
              onClick={() => setVariant(v.id)}
            >
              {v.label}
            </Button>
          ))}
        </div>
        <div className="border border-border p-4">
          <ResultPanel
            variant={variant}
            message={
              variant === "success"
                ? "처리가 완료되었습니다."
                : variant === "fail"
                  ? "처리에 실패했습니다."
                  : "처리하고 있습니다."
            }
            highlightValue={formatAmount(500_000)}
            columns={[
              {
                key: "result",
                header: "결과",
                align: "center",
                render: () => (
                  <Badge
                    variant={
                      variant === "success"
                        ? "success"
                        : variant === "fail"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {RESULT_VARIANTS.find((v) => v.id === variant)?.label}
                  </Badge>
                ),
              },
              { key: "memo", header: "메모" },
            ]}
            row={{ memo: "디자인시스템 미리보기" }}
          />
        </div>
      </FormSection>
    </div>
  )
}

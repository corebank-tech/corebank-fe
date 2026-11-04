import { TriangleAlert } from "lucide-react"
import { DocImage } from "@/pages/demo-objection/doc-image"
import { cn } from "@/shared/lib/utils"
import type { Scenario } from "@/pages/demo-objection/model"

type Props = {
  scenario: Scenario
  injection: boolean
  documentFields: Set<string>
  hoveredField?: string
  onHoverField: (id?: string) => void
}

/**
 * 신청서 사유와 첨부 서류. 서류는 OCR 이 읽은 글자 영역에 박스가 차례로 켜진다.
 * 박스에 마우스를 올리면 그 영역에서 나온 주장이 근거 그래프에서 함께 강조된다.
 */
export const StatementDocument = ({
  scenario,
  injection,
  documentFields,
  hoveredField,
  onHoverField,
}: Props) => {
  const { statement, document } = scenario

  return (
    <div className="grid grid-cols-2 items-start gap-6">
      <div>
        <p className="mb-1.5 text-xs font-bold text-ink-muted">신청서 사유</p>
        <div className="border border-border bg-surface-2 p-4 text-base leading-relaxed text-ink">
          {statement.text.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {statement.injectionLine && (
            <p
              className={cn(
                "mt-2 px-1 transition-colors duration-500",
                injection ? "bg-danger-tint text-danger" : "text-ink-muted",
              )}
            >
              {statement.injectionLine}
              {injection && (
                <span className="mt-1 flex w-fit items-center gap-1 border border-danger-border-soft bg-surface-elevated px-1.5 py-0.5 text-xs font-bold">
                  <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                  AI 지시문, 판단 제외
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {!document && (
        <p className="border border-dashed border-border px-3 py-6 text-center text-base text-ink-faint">
          첨부 서류 없음
        </p>
      )}

      {document?.image && document.boxes && (
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink-muted">
            첨부 서류: {document.title}
          </p>
          <div className="h-[640px]">
            <DocImage
              src={document.image}
              boxes={document.boxes}
              fields={document.fields}
              read={documentFields}
              hovered={hoveredField}
              onHover={onHoverField}
              className="h-full"
            />
          </div>
          {documentFields.size > 0 && (
            <p className="demo-pop mt-2 text-xs text-ink-muted">
              OCR 결과는 고객 주장으로만 사용
            </p>
          )}
        </div>
      )}

      {document && !document.image && (
        <div>
          <p className="mb-1.5 text-xs font-bold text-ink-muted">첨부 서류</p>
          {/* 종이 서류 모양 */}
          <div className="relative rounded-sm border border-border-strong bg-white p-4 font-serif text-[13px] text-[#1f2937] shadow-card">
            <p className="mb-3 text-center text-[15px] font-bold tracking-widest">
              {document.title}
            </p>
            <p className="mb-2 text-[12px] leading-relaxed">
              매도인과 매수인은 아래 물품의 매매에 관하여 다음과 같이 계약을
              체결한다.
            </p>
            <dl className="grid grid-cols-[110px_1fr] gap-y-1.5">
              {document.fields.map((field) => {
                const read = documentFields.has(field.id)
                const hovered = hoveredField === field.id
                return (
                  <div key={field.id} className="contents">
                    <dt className="text-[12px] text-[#4b5563]">
                      {field.label}
                    </dt>
                    <dd>
                      <span
                        onMouseEnter={() => onHoverField(field.id)}
                        onMouseLeave={() => onHoverField(undefined)}
                        className={cn(
                          "relative inline-block rounded-[3px] px-1 transition-all duration-500",
                          read ? "outline-2 outline-offset-1" : "outline-0",
                          hovered ? "bg-[#fff4e5]" : "",
                        )}
                        style={{
                          outlineColor: read
                            ? "var(--demo-series-1)"
                            : "transparent",
                          outlineStyle: "solid",
                        }}
                      >
                        {field.value}
                        {read && (
                          <span className="demo-pop absolute -top-2.5 -right-1 translate-x-full rounded-sm bg-[var(--demo-series-1)] px-1 font-sans text-[10px] leading-4 font-bold text-white">
                            OCR {field.confidence.toFixed(2)}
                          </span>
                        )}
                      </span>
                    </dd>
                  </div>
                )
              })}
            </dl>
            <p className="mt-3 text-right text-[12px]">
              매도인 A (인)&nbsp;&nbsp;&nbsp;매수인 B (인)
            </p>
          </div>
          {documentFields.size > 0 && (
            <p className="demo-pop mt-2 text-xs text-ink-muted">
              OCR 결과는 고객 주장으로만 사용
            </p>
          )}
        </div>
      )}
    </div>
  )
}

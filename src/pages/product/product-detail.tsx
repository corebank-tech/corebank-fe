import * as React from "react"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { formatAmount } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import {
  getProductCategoryBadgeVariant,
  type ProductDetailData,
  type ProductRateRow,
} from "@/entities/product"

type ProductDetailProps = {
  product: ProductDetailData
  onJoin?: (id: number) => void
}

type TabKey = "guide" | "rate" | "notice"

const TABS: { key: TabKey; label: string }[] = [
  { key: "guide", label: "상품안내" },
  { key: "rate", label: "금리안내" },
  { key: "notice", label: "유의사항" },
]

const rateColumns: DataGridColumn<ProductRateRow>[] = [
  { key: "period", header: "가입기간", align: "center" },
  {
    key: "baseRate",
    header: "기본금리(%)",
    align: "right",
    render: (r) => r.baseRate.toFixed(2),
  },
  {
    key: "primeRate",
    header: "우대금리(%)",
    align: "right",
    render: (r) => r.primeRate.toFixed(2),
  },
  {
    key: "maxRate",
    header: "최고금리(%)",
    align: "right",
    render: (r) => (
      <span className="font-bold text-primary">{r.maxRate.toFixed(2)}</span>
    ),
  },
]

/** 상품상세 화면(C-02). 좌측 sticky 요약 카드 + 우측 탭 본문. */
export const ProductDetail = ({ product, onJoin }: ProductDetailProps) => {
  const [tab, setTab] = React.useState<TabKey>("guide")

  return (
    <div className="flex gap-6">
      {/* 좌측 요약 카드 */}
      <aside className="w-80 shrink-0">
        <div className="sticky top-6 overflow-hidden rounded-lg bg-surface-elevated p-6 shadow-card">
          <Badge variant={getProductCategoryBadgeVariant(product.category)}>
            {product.category}
          </Badge>
          <h2 className="mt-3 text-h2 font-bold text-ink">{product.name}</h2>
          <p className="mt-1 text-base leading-relaxed text-ink-muted">
            {product.summary}
          </p>

          <div className="mt-5 flex items-baseline gap-1 border-t border-border pt-5">
            <span className="text-[32px] leading-none font-bold text-primary">
              {product.maxRate.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-primary">%</span>
            <span className="ml-1 text-xs text-ink-faint">(연, 세전)</span>
          </div>
          <p className="mt-1 text-xs text-ink-faint">최고 금리</p>

          <dl className="mt-5 flex flex-col gap-3 text-base">
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">가입기간</dt>
              <dd className="font-bold text-ink">{product.period}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-muted">가입금액</dt>
              <dd className="font-bold text-ink">
                {formatAmount(product.minAmount)} ~{" "}
                {formatAmount(product.maxAmount)}
              </dd>
            </div>
          </dl>

          {product.saleStatus === "SUSPENDED" ? (
            <>
              <Button fullWidth size="lg" className="mt-6" disabled>
                판매중지
              </Button>
              <p className="mt-2 text-xs text-ink-faint">
                ※ 현재 판매가 중지되어 신규 가입할 수 없습니다.
              </p>
            </>
          ) : (
            <Button
              fullWidth
              size="lg"
              className="mt-6"
              onClick={() => onJoin?.(product.id)}
            >
              가입하기
            </Button>
          )}
        </div>
      </aside>

      {/* 우측 본문 */}
      <div className="min-w-0 flex-1">
        {/* 밑줄형 탭 */}
        <div role="tablist" className="flex gap-6 border-b border-border">
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative -mb-px border-b-2 px-1 pt-2 pb-3 text-base font-bold whitespace-nowrap transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="pt-6">
          {tab === "guide" && (
            <dl className="overflow-hidden border-t-2 border-b border-border border-t-navy text-[14px]">
              {product.guide.map((item, i) => (
                <div
                  key={item.label}
                  className={cn(
                    "grid grid-cols-[160px_1fr]",
                    i < product.guide.length - 1 && "border-b border-border",
                  )}
                >
                  <dt className="border-r border-border bg-surface px-3 py-2.5 font-bold text-ink">
                    {item.label}
                  </dt>

                  <dd className="bg-surface-elevated px-3 py-2.5 leading-relaxed text-ink">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {tab === "rate" && (
            <div>
              <DataGrid
                columns={rateColumns}
                rows={product.rates}
                rowKey={(r) => r.period}
              />
              <p className="mt-3 text-2xs text-ink-faint">
                표시된 금리는 연 세전 기준이며, 우대금리는 조건 충족 시
                적용됩니다.
              </p>
            </div>
          )}

          {tab === "notice" && (
            <div>
              <ul className="flex flex-col gap-2">
                {product.notices.map((notice, i) => (
                  <li
                    key={i}
                    className="flex gap-2 text-base leading-relaxed text-ink"
                  >
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-faint"
                      aria-hidden="true"
                    />
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-md bg-primary-tint px-4 py-3 text-base leading-relaxed text-ink">
                이 예금은 예금자보호법에 따라 원금과 소정의 이자를 합하여 1인당
                최고 5천만원까지 보호됩니다. 보호 한도는 CoreBank의 다른
                보호대상 예금과 합산하여 적용됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

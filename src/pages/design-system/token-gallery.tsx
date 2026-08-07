import { FormSection } from "@/shared/ui/form-section"

/**
 * Tailwind는 파일 텍스트를 그대로 스캔해 클래스 후보를 찾는다 — `bg-${token}`처럼
 * 동적으로 조립한 문자열은 스캐너가 인식하지 못해 스타일이 비어 보인다. 그래서
 * 색상마다 완성된 클래스 리터럴을 그대로 나열한다.
 */
const COLOR_GROUPS: {
  title: string
  tokens: { name: string; cls: string }[]
}[] = [
  {
    title: "브랜드",
    tokens: [
      { name: "navy", cls: "bg-navy" },
      { name: "primary", cls: "bg-primary" },
      { name: "primary-tint", cls: "bg-primary-tint" },
      { name: "link", cls: "bg-link" },
    ],
  },
  {
    title: "뉴트럴",
    tokens: [
      { name: "surface", cls: "bg-surface" },
      { name: "surface-2", cls: "bg-surface-2" },
      { name: "surface-elevated", cls: "bg-surface-elevated" },
      { name: "border", cls: "bg-border" },
      { name: "border-strong", cls: "bg-border-strong" },
      { name: "ink", cls: "bg-ink" },
      { name: "ink-muted", cls: "bg-ink-muted" },
      { name: "ink-faint", cls: "bg-ink-faint" },
    ],
  },
  {
    title: "피드백",
    tokens: [
      { name: "danger", cls: "bg-danger" },
      { name: "danger-tint", cls: "bg-danger-tint" },
      { name: "success", cls: "bg-success" },
      { name: "success-tint", cls: "bg-success-tint" },
      { name: "warning", cls: "bg-warning" },
      { name: "warning-tint", cls: "bg-warning-tint" },
    ],
  },
  {
    title: "원장(입금) — 출금은 danger 재사용",
    tokens: [{ name: "deposit", cls: "bg-deposit" }],
  },
]

const TYPE_SCALE = [
  { name: "text-page", label: "페이지 타이틀", cls: "text-page" },
  { name: "text-h2", label: "섹션 타이틀", cls: "text-h2" },
  { name: "text-lg", label: "강조 본문", cls: "text-lg" },
  { name: "text-base", label: "기본 본문 · 표 셀", cls: "text-base" },
  { name: "text-xs", label: "후퇴 라벨", cls: "text-xs" },
  { name: "text-2xs", label: "기준일시·각주·메타", cls: "text-2xs" },
]

const RADIUS_SCALE = [
  { name: "rounded-sm", label: "소형 표식 (Badge)", size: "h-10 w-10" },
  { name: "rounded-md", label: "컨트롤 (Button/Input)", size: "h-10 w-16" },
  { name: "rounded-lg", label: "컨테이너 (모달/카드)", size: "h-10 w-24" },
  { name: "rounded-pill", label: "토글 칩", size: "h-8 w-20" },
  { name: "rounded-full", label: "원형 표식", size: "h-10 w-10" },
]

const SHADOWS = [
  { name: "[box-shadow:var(--shadow-card)]", label: "shadow-card — 카드" },
  {
    name: "[box-shadow:var(--shadow-pop)]",
    label: "shadow-pop — 모달·오버레이",
  },
]

const Z_INDEX = [
  { name: "z-header", value: 100 },
  { name: "z-dropdown", value: 200 },
  { name: "z-overlay", value: 300 },
  { name: "z-modal", value: 400 },
  { name: "z-toast", value: 500 },
]

const ColorSwatch = ({ name, cls }: { name: string; cls: string }) => {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-8 w-8 shrink-0 rounded-md border border-border ${cls}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-ink">--color-{name}</p>
        <p className="truncate text-2xs text-ink-faint">{cls}</p>
      </div>
    </div>
  )
}

export const TokenGallery = () => {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="색상">
        <div className="flex flex-col gap-6">
          {COLOR_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-bold text-ink-faint">
                {group.title}
              </p>
              <div className="grid grid-cols-4 gap-3">
                {group.tokens.map((token) => (
                  <ColorSwatch
                    key={token.name}
                    name={token.name}
                    cls={token.cls}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="text-2xs text-ink-faint">
            헤더의 다크모드 토글로 라이트/다크 값을 함께 확인할 수 있습니다.
          </p>
        </div>
      </FormSection>

      <FormSection title="타이포 — 6단 스케일">
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="flex items-baseline gap-4">
              <span className="w-32 shrink-0 text-2xs text-ink-faint">
                {t.name}
              </span>
              <span className={`${t.cls} font-bold text-ink`}>{t.label}</span>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="모서리 반경(radius) — POL-040">
        <div className="flex flex-wrap items-center gap-6">
          {RADIUS_SCALE.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <span
                className={`${r.size} ${r.name} border-2 border-primary bg-primary-tint`}
                aria-hidden="true"
              />
              <span className="text-2xs text-ink-faint">
                {r.name}
                <br />
                {r.label}
              </span>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="그림자(elevation)">
        <div className="flex flex-wrap gap-8 py-4">
          {SHADOWS.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-3">
              <span
                className={`h-16 w-24 rounded-lg bg-surface-elevated ${s.name}`}
              />
              <span className="text-2xs text-ink-faint">{s.label}</span>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="z-index 레이어">
        <div className="flex flex-col gap-1.5">
          {Z_INDEX.map((z) => (
            <div key={z.name} className="flex items-center gap-3 text-base">
              <span className="w-28 font-bold text-ink">{z.name}</span>
              <span className="text-ink-muted">{z.value}</span>
            </div>
          ))}
        </div>
      </FormSection>
    </div>
  )
}

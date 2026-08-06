import { Star } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Badge, type BadgeVariant } from "@/shared/ui/badge"
import { Alert } from "@/shared/ui/alert"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { Checkbox } from "@/shared/ui/checkbox"
import { Radio } from "@/shared/ui/radio"
import { Chip } from "@/shared/ui/chip"
import { IconButton } from "@/shared/ui/icon-button"
import { Spinner } from "@/shared/ui/spinner"
import { Skeleton } from "@/shared/ui/skeleton"
import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"

const BUTTON_VARIANTS = [
  "primary",
  "secondary",
  "outline",
  "ghost",
  "danger",
] as const
const BUTTON_SIZES = ["sm", "md", "lg"] as const
const BADGE_VARIANTS: BadgeVariant[] = [
  "primary",
  "neutral",
  "success",
  "danger",
  "warning",
]
const ALERT_VARIANTS = ["info", "success", "warning", "danger"] as const
const CHIP_TONES = [
  "default",
  "active",
  "primary",
  "primary-tint",
  "muted",
] as const
const CHIP_SIZES = ["sm", "md", "lg"] as const

export const PrimitiveGallery = () => {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Button — variant × size">
        <div className="flex flex-col gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <div key={variant} className="flex items-center gap-3">
              <span className="w-20 shrink-0 text-2xs text-ink-faint">
                {variant}
              </span>
              {BUTTON_SIZES.map((size) => (
                <Button key={size} variant={variant} size={size}>
                  {size}
                </Button>
              ))}
              <Button variant={variant} disabled>
                disabled
              </Button>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Badge — 5개 variant 전수">
        <div className="flex flex-wrap items-center gap-2">
          {BADGE_VARIANTS.map((variant) => (
            <Badge key={variant} variant={variant}>
              {variant}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-2xs text-ink-faint">
          실제 화면에서는 primary가 거의 쓰이지 않는다 — 여기서만 5종을 함께 볼
          수 있다.
        </p>
      </FormSection>

      <FormSection title="Alert — 4개 variant 전수">
        <div className="flex flex-col gap-2">
          {ALERT_VARIANTS.map((variant) => (
            <Alert key={variant} variant={variant} title={`${variant} 안내`}>
              {variant} 톤의 인라인 안내 배너입니다.
            </Alert>
          ))}
        </div>
        <p className="mt-2 text-2xs text-ink-faint">
          실 화면에서는 success·danger만 쓰인다 — info·warning은 여기서만 확인
          가능하다.
        </p>
      </FormSection>

      <FormSection title="Chip — tone × size">
        <div className="flex flex-col gap-3">
          {CHIP_TONES.map((tone) => (
            <div key={tone} className="flex items-center gap-2">
              <span className="w-24 shrink-0 text-2xs text-ink-faint">
                {tone}
              </span>
              {CHIP_SIZES.map((size) => (
                <Chip key={size} tone={tone} size={size}>
                  {size}
                </Chip>
              ))}
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="IconButton — size × shape">
        <div className="flex items-center gap-3">
          <IconButton
            size="sm"
            shape="square"
            className="border border-border-strong bg-surface-elevated text-ink-muted hover:bg-surface"
            aria-label="sm square"
          >
            <Star className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            size="md"
            shape="square"
            className="border border-border-strong bg-surface-elevated text-ink-muted hover:bg-surface"
            aria-label="md square"
          >
            <Star className="h-4.5 w-4.5" aria-hidden="true" />
          </IconButton>
          <IconButton
            size="lg"
            shape="circle"
            className="border border-border-strong bg-surface-elevated text-ink-muted hover:bg-surface"
            aria-label="lg circle"
          >
            <Star className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
      </FormSection>

      <FormSection title="Input / Select">
        <div>
          <FormRow label="기본" htmlFor="ds-input">
            <Input
              id="ds-input"
              placeholder="입력하세요"
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="invalid" htmlFor="ds-input-invalid">
            <Input
              id="ds-input-invalid"
              invalid
              defaultValue="잘못된 값"
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="disabled" htmlFor="ds-input-disabled">
            <Input
              id="ds-input-disabled"
              disabled
              defaultValue="비활성"
              className="max-w-xs"
            />
          </FormRow>
          <FormRow label="Select" htmlFor="ds-select">
            <Select id="ds-select" className="max-w-xs">
              <option>옵션 1</option>
              <option>옵션 2</option>
            </Select>
          </FormRow>
        </div>
      </FormSection>

      <FormSection title="Checkbox / Radio">
        <div className="flex flex-col gap-2">
          <Checkbox label="체크박스 라벨" defaultChecked />
          <div className="flex items-center gap-4">
            <Radio name="ds-radio" label="라디오 A" defaultChecked />
            <Radio name="ds-radio" label="라디오 B" />
          </div>
        </div>
      </FormSection>

      <FormSection title="Spinner / Skeleton">
        <div className="flex items-center gap-6">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <Skeleton className="h-4 w-32" />
        </div>
      </FormSection>
    </div>
  )
}

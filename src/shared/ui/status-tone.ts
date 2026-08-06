import { cn } from "@/shared/lib/utils"

/**
 * info/success/warning/danger 색상 톤의 단일 출처. Badge·Alert·ResultPanel이
 * 각자 정의하던 border/bg/text 클래스 조합을 여기서 가져다 쓴다. 새 톤을
 * 추가하거나 색을 바꿀 때 이 파일 한 곳만 고치면 세 컴포넌트에 모두 반영된다.
 */
export const STATUS_TONE_CLASSES = {
  primary: {
    border: "border-primary-border-soft",
    bg: "bg-primary-tint",
    text: "text-primary",
  },
  success: {
    border: "border-success-border-soft",
    bg: "bg-success-tint",
    text: "text-success",
  },
  warning: {
    border: "border-warning-border-soft",
    bg: "bg-warning-tint",
    text: "text-warning",
  },
  danger: {
    border: "border-danger-border-soft",
    bg: "bg-danger-tint",
    text: "text-danger",
  },
} as const

export type StatusTone = keyof typeof STATUS_TONE_CLASSES

/** border + bg + text 세 클래스를 모두 합친 문자열. Badge처럼 톤이 글자색까지 물들일 때 쓴다. */
export function statusToneClasses(tone: StatusTone): string {
  const t = STATUS_TONE_CLASSES[tone]
  return cn(t.border, t.bg, t.text)
}

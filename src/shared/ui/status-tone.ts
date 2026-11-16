import { cn } from "@/shared/lib/utils"

/**
 * primary/coolViolet/success/warning/danger 색상 톤의 단일 출처.
 * Badge·Alert·ResultPanel이 각자 정의하던 border/bg/text 클래스 조합을 여기서 가져다 쓴다.
 */
export const STATUS_TONE_CLASSES = {
  primary: {
    border: "border-primary-border-soft",
    bg: "bg-primary-tint",
    text: "text-primary",
  },
  coolViolet: {
    border: "border-cool-violet-border-soft",
    bg: "bg-cool-violet-tint",
    text: "text-cool-violet",
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

/**
 * bg + text 두 클래스를 합친 문자열. Badge처럼 톤이 글자색까지 물들이면서
 * 테두리 없이 배경만으로 구분되는 표식에 쓴다. 테두리가 필요한 Alert 는
 * STATUS_TONE_CLASSES 에서 border 를 직접 가져다 쓴다.
 */
export function statusToneClasses(tone: StatusTone): string {
  const t = STATUS_TONE_CLASSES[tone]
  return cn(t.bg, t.text)
}

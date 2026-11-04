import type { Actor } from "@/pages/demo-objection/model"

/**
 * 차트 범주색. dataviz 검증 스크립트로 확인한 3색이다.
 * light  #0a60f5 · #eb6834 · #1baf7a — all-pairs CVD ΔE ≥ 9.2 (청록은 대비 2.74:1 → 범례·직접 라벨 필수)
 * dark   #3987e5 · #d95926 · #199e70 — all-pairs 통과 (표면 #232b3c)
 * 상태색(성공 · 위험 · 경고)은 범주에 쓰지 않고 판정 결과에만 아이콘과 함께 쓴다.
 */
export const SERIES = {
  blue: "var(--demo-series-1)",
  orange: "var(--demo-series-2)",
  aqua: "var(--demo-series-3)",
} as const

export const SERIES_CSS = `
:root { --demo-series-1: #0a60f5; --demo-series-2: #eb6834; --demo-series-3: #1baf7a; }
.dark { --demo-series-1: #3987e5; --demo-series-2: #d95926; --demo-series-3: #199e70; }
@keyframes demo-pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }
@keyframes demo-dash { to { stroke-dashoffset: -16 } }
@keyframes demo-pop { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
.demo-pop { animation: demo-pop .35s ease-out both }
.demo-pulse { animation: demo-pulse 1.1s ease-in-out infinite }
.demo-flow { stroke-dasharray: 6 10; animation: demo-dash .6s linear infinite }
@keyframes demo-scene { from { opacity: 0 } to { opacity: 1 } }
.demo-scene { animation: demo-scene .45s ease-out both }
@keyframes demo-ocr { 0% { box-shadow: 0 0 0 0 transparent; background: transparent } 60% { box-shadow: 0 0 0 4px var(--demo-series-1); background: color-mix(in srgb, var(--demo-series-1) 14%, transparent) } 100% { box-shadow: 0 0 0 3px var(--demo-series-1); background: color-mix(in srgb, var(--demo-series-1) 8%, transparent) } }
.demo-ocr { animation: demo-ocr .6s ease-out both }
`

/** 누가 수행하는가 — 처리 흐름 그래프와 타임라인에서 같은 색을 쓴다. */
export const ACTOR_COLOR: Record<Actor, string> = {
  AGENT: SERIES.blue,
  HUMAN: SERIES.orange,
  SERVER: SERIES.aqua,
}

/** 단계 소요 시간. 0.1초 단위로 적는다. */
export const formatStepDuration = (millis: number): string =>
  `${(Math.max(0, millis) / 1000).toFixed(1)}초`

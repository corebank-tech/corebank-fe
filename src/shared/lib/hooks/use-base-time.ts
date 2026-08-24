import * as React from "react"
import { getNow } from "@/shared/config/clock"

/**
 * 화면이 "기준일시"로 표시하거나 거래 시각으로 쓰는 현재 시각. 마운트 시점에
 * 한 번만 읽는다.
 *
 * 렌더 본문에서 getNow()를 직접 부르면 리렌더마다 값이 달라져 렌더가 순수하지
 * 않고(StrictMode 이중 렌더에서 한 커밋에 두 값이 나온다), 조회조건을 입력하는
 * 동안 기준일시만 계속 앞서 나가 실제 조회 결과 시점과 어긋난다.
 *
 * 날짜만 필요할 때는 getToday()를 그대로 호출해도 된다 — 같은 날 안에서는 항상
 * 같은 값이라 렌더가 순수하다.
 */
export const useBaseTime = (): string => React.useState(getNow)[0]

/**
 * mock 조회화면의 "기준일시". 마운트 시 1회 캡처하는 `useBaseTime()`과 달리
 * `조회`를 누른 시점에 다시 캡처할 수 있다 — 실 API 화면의 `dataUpdatedAt`과
 * 같은 의미(데이터를 받은 시점)를 mock 화면에서도 유지하기 위함이다.
 */
export function useCapturedBaseTime(): {
  time: string
  capture: () => void
} {
  const [time, setTime] = React.useState(getNow)
  const capture = React.useCallback(() => setTime(getNow()), [])
  return { time, capture }
}

/**
 * 실 API 조회화면의 "기준일시" — 지금 화면에 떠 있는 데이터를 받은 시각(ms).
 * 받은 적이 없으면 0이라 호출부에서 라벨을 감출 수 있다.
 *
 * react-query 결과를 그대로 쓰면 안 된다. placeholderData 분기는 `status`와
 * `data`만 덮어쓰고 `dataUpdatedAt`은 쿼리 자신의 state를 내보내는데, 새 쿼리
 * 키의 캐시 엔트리는 `dataUpdatedAt: 0`으로 시작한다. 그래서 조회조건·페이지를
 * 바꾸는 순간 목록은 keepPreviousData로 남아 있는데 기준일시만 0이 되어
 * 라벨이 깜빡인다. placeholder 구간에는 직전 유효값을 그대로 유지한다.
 */
export function useQueryBaseTime(result: {
  dataUpdatedAt: number
  isPlaceholderData: boolean
}): number {
  // 렌더 중 setState — React가 커밋 전에 곧바로 다시 렌더하므로 effect처럼 한 프레임
  // 늦지 않는다(https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  const [shown, setShown] = React.useState(0)
  if (
    !result.isPlaceholderData &&
    result.dataUpdatedAt &&
    result.dataUpdatedAt !== shown
  ) {
    setShown(result.dataUpdatedAt)
  }
  return shown
}

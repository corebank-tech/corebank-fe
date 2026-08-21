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

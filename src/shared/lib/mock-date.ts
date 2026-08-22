import { getToday } from "@/shared/config/clock"
import { addDays } from "@/shared/lib/date"

/**
 * mock 데이터 전용 상대 날짜 헬퍼.
 *
 * **mock에 고정 날짜(`"2026-07-23"`)를 새로 쓰지 않는다.** `getToday()`는 실제
 * 현재 시각을 따라가는데 데이터만 고정값으로 남으면 둘이 계속 벌어져서,
 * 기본 조회기간(POL-021, 1개월) 밖으로 밀려난 화면이 진입하자마자 빈 목록이 된다.
 * 기간을 넓혀도 벌어지는 속도만 늦출 뿐이라 데이터 쪽을 상대값으로 둬야 한다.
 *
 * 오프셋은 화면 기준으로 잡는다 — 조회화면은 기본 진입 시 최소 3건이 보이도록
 * 최신 건을 D-7 이내에, 미래 건을 다루는 화면(E-04 예약이체 조회)은 대기 건이
 * D+1 이후에 오도록 둔다.
 *
 * 계산 검증용 테스트 픽스처는 대상이 아니다 — 상대값이 되면 단언이 흔들린다.
 */
export const daysAgo = (n: number): string => addDays(getToday(), -n)

/** {@link daysAgo}의 미래 방향. */
export const daysAhead = (n: number): string => addDays(getToday(), n)

/**
 * `yyyy-MM-dd` → `yyyyMMdd`. 거래번호처럼 거래일자를 접두로 갖는 mock 값에 쓴다 —
 * 날짜만 상대값으로 바꾸면 D-04 그리드에서 거래번호와 이체일시가 어긋난다.
 */
export const compactDate = (isoDate: string): string =>
  isoDate.replaceAll("-", "")

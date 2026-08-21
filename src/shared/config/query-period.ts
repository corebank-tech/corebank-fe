/**
 * 조회화면(B-03·D-04·E-05·G-05)의 기본 조회기간 계산.
 *
 * 네 화면 모두 같은 규정(POL-021 "기본 1개월")을 따르므로 계산을 여기 한 곳에
 * 두고, 값 자체는 POL 수치의 단일 출처인 `policy.ts`에서 가져온다.
 */
import { getToday } from "@/shared/config/clock"
import { QUERY_DEFAULT_PERIOD_MONTHS } from "@/shared/config/policy"
import { addMonths } from "@/shared/lib/date"

/**
 * 최근 N개월 ~ 오늘. 지난 건만 다루는 조회화면의 기본값이다.
 *
 * 예약이체 목록(E-04)은 아직 실행되지 않은 미래 건까지 보여야 해 종료일을 오늘로
 * 둘 수 없고, 기본 조회기간을 정한 요구사항도 없다(REQ-RSV-007). 규정 근거가
 * 다르므로 이 함수도 POL-021 상수도 공유하지 않고 화면 로컬 값을 쓴다.
 */
export const recentPeriod = () => {
  const today = getToday()
  return {
    start: addMonths(today, -QUERY_DEFAULT_PERIOD_MONTHS),
    end: today,
  }
}

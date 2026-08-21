import * as React from "react"

/**
 * SearchPanel의 "조건저장" 클릭 후 노출하는 성공 알림 상태. 조회조건이 6개
 * 조회 화면(b03/d04/e04/e05/g04/g05)에 동일하게 복붙되어 있던 걸 추출했다 —
 * clear를 검색·초기화 핸들러에 넣는 걸 빠뜨리면 알림이 계속 남는 버그로
 * 이어지므로, 상태와 함께 열고 닫는 지점을 한 군데로 모은다.
 */
export function useSavedConditionAlert() {
  const [saved, setSaved] = React.useState(false)
  return {
    saved,
    save: () => setSaved(true),
    clear: () => setSaved(false),
  }
}

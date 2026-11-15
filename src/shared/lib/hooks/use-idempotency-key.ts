import * as React from "react"

/**
 * 제출 한 건에 멱등키 하나를 묶는다(REQ-CMN-014).
 *
 * `customFetch` 는 키가 없으면 요청마다 새로 만든다. 그러면 응답 시간 초과 뒤 같은
 * 내용을 다시 보냈을 때 서버가 두 번째 요청을 새 거래로 처리한다. 그래서 키를
 * **보내는 내용**에 묶는다 — 내용이 같으면 앞선 키를 다시 쓰고, 내용을 고치면 새 키를 만든다.
 * 같은 키에 다른 내용을 실으면 서버가 `CMN0302` 로 거부하기 때문이다.
 *
 * 성공하면 `reset` 으로 키를 버린다. 다음 제출은 새 거래다.
 *
 * 키는 이벤트 처리기 안에서만 꺼낸다. 렌더 중에 꺼내면 같은 화면이 다시 그려질 때마다
 * 키가 바뀐 것처럼 보일 수 있다.
 */
export const useIdempotencyKey = () => {
  const lastRef = React.useRef<{ fingerprint: string; key: string } | null>(
    null,
  )

  const keyFor = (payload: unknown): string => {
    const fingerprint = JSON.stringify(payload)
    if (lastRef.current?.fingerprint !== fingerprint) {
      lastRef.current = { fingerprint, key: crypto.randomUUID() }
    }
    return lastRef.current.key
  }

  const reset = () => {
    lastRef.current = null
  }

  return { keyFor, reset }
}

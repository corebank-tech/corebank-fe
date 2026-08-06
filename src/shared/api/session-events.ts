type SessionListener = () => void

const sessionExpiredListeners = new Set<SessionListener>()
const apiActivityListeners = new Set<SessionListener>()

const subscribe = (
  listeners: Set<SessionListener>,
  listener: SessionListener,
): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** 401 응답으로 서버 세션이 끝났음을 app 레이어에 알린다 (POL-001). */
export const onSessionExpired = (listener: SessionListener) =>
  subscribe(sessionExpiredListeners, listener)

export const emitSessionExpired = (): void => {
  sessionExpiredListeners.forEach((listener) => listener())
}

/** POL-001 은 "마지막 요청 이후" 기준이므로 요청 시각만 활동으로 센다. */
export const onApiActivity = (listener: SessionListener) =>
  subscribe(apiActivityListeners, listener)

export const emitApiActivity = (): void => {
  apiActivityListeners.forEach((listener) => listener())
}

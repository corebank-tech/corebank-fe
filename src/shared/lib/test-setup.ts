import { afterEach } from "vitest"
import { cleanup, configure } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

/**
 * 테스트마다 마운트한 컴포넌트를 내린다.
 *
 * `vite.config.ts` 가 `globals: false` 라 Testing Library 의 자동 정리가 등록되지 않는다.
 * 안 내려주면 앞 테스트의 Provider 가 살아남아 뒤 테스트에 끼어든다 — 타이머를 돌리는
 * 테스트에서 특히 드러난다(#163). 파일 단위로 넣으면 넣은 파일만 안전해지므로 여기 둔다.
 */
afterEach(cleanup)

/**
 * `findBy*`·`waitFor` 의 대기 한도를 기본 1초에서 3초로 올린다(#186).
 *
 * 목 응답을 기다리는 화면 테스트는 보통 250ms 안에 끝나지만 가끔 500ms 를 넘고, 다른
 * 빌드가 CPU 를 점유하면 1초도 넘어 무관한 테스트가 실패했다. 통과하는 테스트는 실제
 * 응답 시간만큼만 기다리므로 느려지지 않는다. vitest 테스트 한도(5초)보다는 작게 둔다.
 */
configure({ asyncUtilTimeout: 3000 })

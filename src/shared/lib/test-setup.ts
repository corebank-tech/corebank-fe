import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom/vitest"

/**
 * 테스트마다 마운트한 컴포넌트를 내린다.
 *
 * `vite.config.ts` 가 `globals: false` 라 Testing Library 의 자동 정리가 등록되지 않는다.
 * 안 내려주면 앞 테스트의 Provider 가 살아남아 뒤 테스트에 끼어든다 — 타이머를 돌리는
 * 테스트에서 특히 드러난다(#163). 파일 단위로 넣으면 넣은 파일만 안전해지므로 여기 둔다.
 */
afterEach(cleanup)

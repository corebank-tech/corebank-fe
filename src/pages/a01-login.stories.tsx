import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { A01Login } from "@/pages/a01-login"
import { WithGuestPage } from "../../.storybook/decorators/page-providers"

/**
 * 인증 전 화면. 실제 라우트(`src/App.tsx`의 `/` 경로)와 동일하게 `PageShell bare`로
 * 감싼다 — 화면 스토리는 페이지 컴포넌트 단독이 아니라 실제로 렌더되는 화면 전체를 보여준다.
 */
const meta = {
  title: "pages/A01 로그인",
  decorators: [WithGuestPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell bare>
      <A01Login />
    </PageShell>
  ),
} satisfies Meta<typeof A01Login>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { C05ConfirmAuth } from "@/pages/product/c05-confirm-auth"
import { MOCK_JOIN_ACCOUNTS } from "@/entities/product"
import {
  WithAuthenticatedPage,
  type RouteWithState,
} from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/C05 상품가입 3단계",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
      <C05ConfirmAuth />
    </PageShell>
  ),
} satisfies Meta<typeof C05ConfirmAuth>

export default meta
type Story = StoryObj<typeof meta>

/** C-04(정보입력)를 거치지 않고 바로 진입했을 때 — 상품의 최소 가입기간·최소 가입금액·첫 번째 출금계좌로 대체 값을 구성한다. */
export const Default: Story = {}

const FILLED_FORM_STATE: RouteWithState = {
  path: "/product/P001/join/3",
  state: {
    termMonths: 12,
    fromAccount: MOCK_JOIN_ACCOUNTS[0].accountNo,
    amount: 5_000_000,
  },
}

/** C-04에서 실제로 입력한 값을 들고 정상 진입한 상태. */
export const FromInputStep: Story = {
  parameters: { route: FILLED_FORM_STATE },
}

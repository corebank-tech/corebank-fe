import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter } from "react-router"
import {
  BankingShortcuts,
  type ShortcutLink,
} from "@/pages/dashboard/banking-shortcuts"

/** REQ-CMN-024: 주요 업무 바로가기 4종. A09MainDashboard의 DEFAULT_SHORTCUTS와 동일하다. */
const SHORTCUTS: ShortcutLink[] = [
  { id: "accounts", label: "전체계좌조회", href: "/accounts" },
  { id: "transfer", label: "즉시이체", href: "/instant-transfer" },
  { id: "products", label: "상품몰", href: "/products" },
  { id: "transfer-history", label: "이체결과조회", href: "/transfer/history" },
]

const meta = {
  title: "pages/dashboard/BankingShortcuts",
  component: BankingShortcuts,
  args: { links: SHORTCUTS },
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof BankingShortcuts>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

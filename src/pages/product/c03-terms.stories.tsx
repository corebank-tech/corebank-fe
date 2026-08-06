import type { Meta, StoryObj } from "@storybook/react-vite"
import { PageShell } from "@/app/page-shell"
import { C03Terms } from "@/pages/product/c03-terms"
import { WithAuthenticatedPage } from "../../../.storybook/decorators/page-providers"

const meta = {
  title: "pages/C03 상품가입 1단계",
  decorators: [WithAuthenticatedPage],
  parameters: { layout: "fullscreen" },
  render: () => (
    <PageShell activeId="product" breadcrumb={["금융상품", "가입"]}>
      <C03Terms />
    </PageShell>
  ),
} satisfies Meta<typeof C03Terms>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

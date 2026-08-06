import type { Meta, StoryObj } from "@storybook/react-vite"
import { SearchPanel } from "@/widgets/query/search-panel"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { Select } from "@/shared/ui/select"
import { MOCK_TRANSFER_ACCOUNTS } from "@/entities/transfer"
import { formatAccountNo } from "@/shared/lib/format"

const meta = {
  title: "widgets/query/SearchPanel",
  component: SearchPanel,
  parameters: { layout: "padded" },
  args: { children: null },
} satisfies Meta<typeof SearchPanel>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: (args) => (
    <div className="w-240">
      <SearchPanel {...args}>
        <FormRow label="조회계좌번호" htmlFor="search-panel-account">
          <Select id="search-panel-account">
            {MOCK_TRANSFER_ACCOUNTS.map((account) => (
              <option key={account.accountNo}>
                {account.alias} {formatAccountNo(account.accountNo)}
              </option>
            ))}
          </Select>
        </FormRow>
        <FormRow label="적요검색" htmlFor="search-panel-keyword">
          <Input
            id="search-panel-keyword"
            placeholder="적요 내용을 입력하세요"
          />
        </FormRow>
      </SearchPanel>
    </div>
  ),
}

export const CustomSearchLabel: Story = {
  args: { searchLabel: "결과보기" },
  render: (args) => (
    <div className="w-240">
      <SearchPanel {...args}>
        <FormRow label="처리상태">
          <Select>
            <option>전체</option>
            <option>정상처리</option>
            <option>처리실패</option>
          </Select>
        </FormRow>
      </SearchPanel>
    </div>
  ),
}

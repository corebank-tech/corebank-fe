import * as React from "react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Radio } from "@/shared/ui/radio"

export type GridSearchField = {
  key: string
  label: string
}

type GridSearchModalProps = {
  open: boolean
  onClose: () => void
  /** 그리드가 보유한 컬럼 중 검색 대상으로 선택 가능한 항목. */
  fields: GridSearchField[]
  /** [검색] 클릭 시 선택된 검색대상 컬럼 key와 검색어를 전달한다. */
  onApply: (fieldKey: string, keyword: string) => void
}

/**
 * A-94 공통 그리드 검색 모달(REQ-CMN-020). 그리드 컬럼 중 검색 대상을 선택하고
 * 검색어를 입력해 목록을 필터링한다.
 */
export const GridSearchModal = ({
  open,
  onClose,
  fields,
  onApply,
}: GridSearchModalProps) => {
  const [fieldKey, setFieldKey] = React.useState(fields[0]?.key ?? "")
  const [keyword, setKeyword] = React.useState("")

  // 다시 열릴 때마다 이전 검색조건을 지운다. effect 대신 렌더 중 상태 조정
  // 패턴(React 공식 가이드 "Adjusting state when a prop changes")을 쓴다.
  const [prevOpen, setPrevOpen] = React.useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setFieldKey(fields[0]?.key ?? "")
      setKeyword("")
    }
  }

  const apply = () => {
    onApply(fieldKey, keyword.trim())
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="검색"
      size="sm"
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            className="min-w-30"
            onClick={onClose}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="min-w-30"
            onClick={apply}
            disabled={!fieldKey}
          >
            검색
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-base font-bold text-ink">검색 대상</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {fields.map((f) => (
              <Radio
                key={f.key}
                name="grid-search-field"
                label={f.label}
                value={f.key}
                checked={fieldKey === f.key}
                onChange={() => setFieldKey(f.key)}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-base font-bold text-ink">검색어</p>
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="검색어를 입력하세요"
            aria-label="검색어"
          />
        </div>
      </div>
    </Modal>
  )
}

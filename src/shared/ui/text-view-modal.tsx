import type * as React from "react"
import { Modal } from "@/shared/ui/modal"
import { Button } from "@/shared/ui/button"

type TextViewModalProps = {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  headers: string[]
  rows: string[][]
}

/**
 * 조회 그리드의 [점자보기] 대상. 표를 스크린리더로 읽기 쉬운 순차 텍스트
 * 목록으로 재구성해 보여준다(그리드와 동일한 데이터, 다른 표현).
 */
export const TextViewModal = ({
  open,
  onClose,
  title = "점자보기",
  headers,
  rows,
}: TextViewModalProps) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <Button
          variant="primary"
          size="lg"
          className="min-w-30"
          onClick={onClose}
        >
          확인
        </Button>
      }
    >
      <p className="mb-4 text-2xs text-ink-faint">
        스크린리더로 읽기 쉬운 순차 텍스트 형식입니다. 총{" "}
        {rows.length.toLocaleString("ko-KR")}건입니다.
      </p>
      {rows.length === 0 ? (
        <p className="text-base text-ink-muted">조회 결과가 없습니다.</p>
      ) : (
        <ol className="flex max-h-[420px] flex-col gap-3 overflow-y-auto">
          {rows.map((row, i) => (
            <li
              key={i}
              className="border-b border-border pb-3 text-base last:border-0"
            >
              <p className="mb-1 font-bold text-ink">{i + 1}번째 항목</p>
              <dl className="flex flex-col gap-0.5">
                {headers.map((header, j) => (
                  <div key={header} className="flex gap-2">
                    <dt className="w-24 shrink-0 text-ink-faint">{header}</dt>
                    <dd className="min-w-0 flex-1 text-ink">{row[j]}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  )
}

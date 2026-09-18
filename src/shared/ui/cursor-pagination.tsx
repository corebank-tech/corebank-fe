import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/shared/ui/button"

type CursorPaginationProps = {
  /** 앞쪽에 더 있는가. 서버 응답의 커서 유무를 그대로 넘긴다. */
  hasPrevious: boolean
  /** 뒤쪽에 더 있는가. */
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  /**
   * 요청 중에는 양쪽을 막는다. 응답 전에 한 번 더 누르면 커서가 두 칸 건너뛰고
   * 사용자는 건너뛴 사실을 모른다 — 번호가 없어서 되돌아갈 수도 없다.
   */
  isLoading?: boolean
}

/**
 * 커서 기반 목록 이동. **번호 없이 이전/다음만** 둔다.
 *
 * 형제인 `Pagination` 과 쓰임이 다르다. 그쪽은 `totalPages` 를 알아 번호 버튼을
 * 그리는데, 그러려면 서버가 매 조회마다 전체 건수를 세야 한다. 원장 분개처럼
 * 수백만 건인 목록에서는 그 COUNT 가 조회 자체보다 비싸다. 커서 방식은 전체
 * 건수를 세지 않는 대신 **"몇 페이지 중 몇"을 표시할 수 없고 특정 페이지로 점프할
 * 수도 없다.** 그 제약이 이 컴포넌트의 모양을 정한다.
 *
 * **커서 토큰은 이 컴포넌트가 알지 못한다.** 토큰의 모양(불투명 문자열·마지막 키
 * 값·타임스탬프)은 서버가 정하고 쿼리 계층이 들고 있으며, 화면은 "더 있는가"만
 * 넘긴다. 서버 응답 형태가 확정되지 않아도 이 계약은 바뀌지 않는다.
 *
 * 양쪽 다 없으면(= 한 화면에 다 들어오면) 아무것도 그리지 않는다. 눌러도 아무 일이
 * 없는 버튼 두 개를 남기지 않기 위해서다 — 형제 `Pagination` 이 `totalPages <= 0`
 * 에서 `null` 을 돌려주는 것과 같은 규칙이다.
 */
export const CursorPagination = ({
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  isLoading = false,
}: CursorPaginationProps) => {
  if (!hasPrevious && !hasNext) return null

  return (
    <nav
      className="flex items-center justify-center gap-2 pt-5"
      aria-label="목록 이동"
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasPrevious || isLoading}
        onClick={onPrevious}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        이전
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={!hasNext || isLoading}
        onClick={onNext}
      >
        다음
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}

import { FormSection } from "@/shared/ui/form-section"
import { FormRow } from "@/shared/ui/form-row"
import { Input } from "@/shared/ui/input"
import { Button } from "@/shared/ui/button"
import { NoticeBoxFooter } from "@/shared/ui/notice-box"

/** 조회·폼 화면의 반복되는 골격을 요약해 보여준다 — 실제 컴포넌트 조합이 아니라 순서 안내다. */
export const PatternGallery = () => {
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="조회 화면 골격">
        <ol className="flex flex-col gap-2 text-base text-ink">
          <li>1. NoticeBox — 화면 상단 유의사항(선택)</li>
          <li>2. FormSection "조회조건" — SearchPanel + 검색 필드</li>
          <li>
            3. FormSection "결과" —
            GridToolbar([보고서인쇄][점자보기][파일저장][검색]) →
            SummaryRow(선택) → DataGrid → Pagination
          </li>
          <li>
            4. NoticeBoxFooter "[알아두세요]" — 화면 하단 접이식 안내(필수)
          </li>
        </ol>
        <p className="mt-3 text-2xs text-ink-faint">
          예: B-01 전체계좌조회, B-03 거래내역조회, D-04 이체결과조회.
        </p>
      </FormSection>

      <FormSection title="폼(스텝) 화면 골격">
        <ol className="flex flex-col gap-2 text-base text-ink">
          <li>1. StepLayout — 타이틀 + StepIndicator</li>
          <li>2. NoticeBox(선택) — 단계별 유의사항</li>
          <li>3. FormSection별 FormRow — 입력 필드, 각 필드 하단 ※ 단서</li>
          <li>4. footer — 중앙 정렬 [이전]/[다음] 액션</li>
          <li>5. 확인 단계 — ConfirmSummary + OTP/계좌비밀번호 인증</li>
          <li>6. 완료 단계 — ResultPanel(성공/실패/처리중)</li>
        </ol>
        <p className="mt-3 text-2xs text-ink-faint">
          예: D-01~03 즉시이체, E-01~03 예약이체, G-01~03 자동이체, A-02~06
          회원가입.
        </p>
      </FormSection>

      <FormSection title="미니 예시 — 단일 필드 폼 블록">
        <div>
          <FormRow label="예시 필드" required htmlFor="ds-pattern-field">
            <Input id="ds-pattern-field" className="max-w-xs" />
          </FormRow>
        </div>
        <div className="mt-4 flex justify-center">
          <Button variant="primary" size="lg" className="min-w-40">
            다음
          </Button>
        </div>
      </FormSection>

      <NoticeBoxFooter
        items={[
          "모든 조회·폼 화면 하단에는 이 접이식 안내 박스를 둔다.",
          "이 박스 자체가 NoticeBoxFooter 컴포넌트의 실제 렌더링 예시다.",
        ]}
      />
    </div>
  )
}

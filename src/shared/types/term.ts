/**
 * 약관동의 항목. 회원가입(A-02)과 상품가입(C-03)이 공용하는 형태라
 * 특정 entity 도메인에 속하지 않는다.
 * required=true 인 항목이 모두 체크되어야 다음 단계로 넘어갈 수 있다.
 */
export type TermItem = {
  id: string
  /** 필수 동의 항목 여부. */
  required: boolean
  title: string
  /** 항목 하단에 노출되는 동의 질문 문구. */
  question: string
  /** [보기] 모달에 표시되는 약관 전문. */
  body: string
}

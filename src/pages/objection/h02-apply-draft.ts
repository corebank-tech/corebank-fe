import type { ObjectionClause } from "@/entities/payment-stop"

/** H-02 이의제기 신청의 입력 상태와 단계별 검사. */

export const APPLY_STEPS = [
  "신청서 작성",
  "서류 첨부",
  "내용 확인",
  "접수 완료",
]

/** 서버 `statement` 상한(계약 §4). */
export const MAX_STATEMENT_LENGTH = 4000

export type ApplyForm = {
  clause: ObjectionClause | null
  statement: string
  simplifiedRequested: boolean
  litigationPending: boolean
}

export const EMPTY_APPLY_FORM: ApplyForm = {
  clause: null,
  statement: "",
  simplifiedRequested: false,
  litigationPending: false,
}

export type ApplyFormErrors = Partial<Record<"clause" | "statement", string>>

export const validateApplyForm = (form: ApplyForm): ApplyFormErrors => {
  const errors: ApplyFormErrors = {}
  if (form.clause == null) errors.clause = "이의제기 사유를 고르세요."
  if (form.statement.trim() === "") {
    errors.statement = "소명 내용을 입력하세요."
  } else if (form.statement.length > MAX_STATEMENT_LENGTH) {
    errors.statement = `소명 내용은 ${MAX_STATEMENT_LENGTH.toLocaleString("ko-KR")}자까지 입력할 수 있습니다.`
  }
  return errors
}

export type ApplyFiles = {
  idCopy: File[]
  evidence: File[]
  idCopyErrors: string[]
  evidenceErrors: string[]
}

export const EMPTY_APPLY_FILES: ApplyFiles = {
  idCopy: [],
  evidence: [],
  idCopyErrors: [],
  evidenceErrors: [],
}

export const ID_COPY_REQUIRED = "신분증 사본을 첨부하세요."

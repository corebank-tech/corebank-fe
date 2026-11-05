import type { ObjectionClause } from "@/entities/payment-stop/lib/labels"

/**
 * 고객 채널의 이의제기 표기. 관리자 표기(`labels.ts`)와 따로 둔다.
 *
 * 고객에게는 내부 절차(승인 대기, 완비 확인)를 그대로 보이지 않는다. 고객이 할 일이
 * 있는지, 기다리면 되는지만 알 수 있게 묶는다.
 */

/** 이의제기 처리 상태(계약 §1 `ObjectionStatus`). 처음 보는 코드는 코드를 그대로 보인다. */
export const MY_OBJECTION_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "접수 완료, 서류 확인 중",
  UNDER_REVIEW: "심사 중",
  SUPPLEMENT_REQUESTED: "서류 보완 요청",
  SUPPLEMENT_SUBMITTED: "보완 서류 확인 중",
  // 승인 대기는 은행 내부 절차라 고객에게는 심사 중으로 보인다
  PENDING_APPROVAL: "심사 중",
  DECIDED: "심사 완료",
}

export const SUPPLEMENT_REQUESTED = "SUPPLEMENT_REQUESTED"

/** 사유 조항마다 고객이 고를 때 읽는 한 줄 설명. */
export const CLAUSE_HELP: Record<ObjectionClause, string> = {
  1: "이 계좌를 남에게 빌려주거나 팔지 않았고 사기에 쓰인 계좌가 아닌 경우입니다.",
  2: "물건이나 서비스를 제공하고 그 대가로 정당하게 받은 돈인 경우입니다.",
  3: "계좌에 들어온 돈이 피해금을 가로채는 데 쓰이지 않은 경우입니다.",
}

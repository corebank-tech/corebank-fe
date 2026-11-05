import type { ObjectionDetail } from "@/entities/payment-stop/api/objection"
import type { DecisionResult } from "@/entities/payment-stop/lib/labels"

/**
 * 판정이 닫힌 이유를 담당자에게 한 문장으로 설명한다.
 *
 * **열고 닫는 것은 서버 `gate.allowedResults` 만 정한다.** 이 함수는 이미 닫힌 판정에
 * 설명을 붙일 뿐이고 판정을 열지 않는다. 서버 응답에 닫힌 이유가 없어서
 * 서버 `GateResult.allowsRelease` 의 조건(소송 계속, 갈래, 사유 조항)을 같은 순서로 읽는다.
 * 서버 규칙이 바뀌어 여기서 이유를 찾지 못하면 일반 문구로 떨어진다.
 */
export const closedDecisionReason = (
  objection: Pick<ObjectionDetail, "gate" | "clause" | "litigationPending">,
  result: DecisionResult,
): string | null => {
  if (objection.gate.allowedResults[result]) return null

  // 불수용은 언제나 열린다(D9). 닫혀 왔다면 서버 계약이 바뀐 것이다.
  if (result === "REJECTED") return "서버가 이 판정을 열지 않았습니다."

  if (objection.litigationPending) {
    return "명의인과 피해자 사이 소송이 계속 중이라 피해금 부분을 해제할 수 없습니다."
  }

  const { branch } = objection.gate
  if (branch === "FRAUD_PATTERN") {
    return "사기 패턴이 성립하고 정상 근거가 없어 해제할 수 없습니다."
  }
  if (branch === "UNDETERMINED") {
    return "거래 기록으로 정상 근거를 확인하지 못해 해제할 수 없습니다."
  }

  if (result === "ACCEPTED" && objection.clause === 3) {
    return "사유 제3호는 피해금을 남기는 일부 지급정지만 열립니다."
  }
  if (result === "PARTIAL" && objection.clause !== 3) {
    return "사유 제1호와 제2호는 일부 지급정지가 아니라 수용만 열립니다."
  }

  return "해제 요건을 충족하지 않습니다."
}

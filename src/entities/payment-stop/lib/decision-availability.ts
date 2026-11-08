import type { ObjectionDetail } from "@/entities/payment-stop/api/objection"
import type { DecisionResult } from "@/entities/payment-stop/lib/labels"

/**
 * 외부 확인 회신 중 해제를 막는 것(서버 `ExternalReply.negative`). 이 회신이 하나라도 있으면
 * 서버가 원장 근거보다 먼저 갈래를 사기 패턴으로 둔다(`ReleaseGate` 순서 1).
 */
const NEGATIVE_EXTERNAL_REPLIES = new Set([
  "INVOLVEMENT_SUSPECTED",
  "DOCUMENT_FORGED",
])

type DecisionContext = Pick<
  ObjectionDetail,
  "gate" | "clause" | "litigationPending" | "objectionStatus" | "externalChecks"
>

/**
 * 이의제기 상태 때문에 판정을 쓸 수 없는 이유. 서버 `Objection.requireDecidable` 과 같은
 * 규칙이다: 승인 대기 판정이 있으면 어느 판정도 쓸 수 없고, 수용과 일부 지급정지는 소명
 * 완비 확인 뒤(`UNDER_REVIEW`)에만 쓴다. 확정된 뒤는 판정 입력 자체가 없어 이유를 달지 않는다.
 */
const statusReason = (
  status: string,
  result: DecisionResult,
): string | null => {
  if (status === "DECIDED") return null
  if (status === "PENDING_APPROVAL") {
    return "승인 대기 판정을 승인하거나 반려한 뒤 고를 수 있습니다."
  }
  if (result !== "REJECTED" && status !== "UNDER_REVIEW") {
    return "소명 완비 확인 뒤 고를 수 있습니다."
  }
  return null
}

/**
 * 판정이 닫힌 이유를 담당자에게 한 문장으로 설명한다. `null` 이면 고를 수 있다.
 *
 * 판정은 두 조건이 모두 열려야 쓸 수 있다. 하나는 서버 `gate.allowedResults`(해제 요건)이고,
 * 다른 하나는 이의제기 상태다. 서버 `allowedResults` 는 상태를 보지 않고, 상태는 작성할 때
 * 서버가 따로 검사해 `PST0308` 로 거부한다. 그래서 화면이 상태 규칙을 같이 읽는다.
 *
 * 해제 요건이 닫혔으면 그 이유를 먼저 말한다. 상태가 풀려도 열리지 않을 판정에 "완비 확인
 * 뒤"라고 적으면 기다리면 열릴 것처럼 읽힌다. 서버 응답에 닫힌 이유가 없어서 서버
 * `GateResult.allowsRelease` 의 조건(소송 계속, 갈래, 사유 조항)을 같은 순서로 읽는다.
 * 서버 규칙이 바뀌어 여기서 이유를 찾지 못하면 일반 문구로 떨어진다.
 */
export const closedDecisionReason = (
  objection: DecisionContext,
  result: DecisionResult,
): string | null => {
  if (objection.gate.allowedResults[result]) {
    return statusReason(objection.objectionStatus, result)
  }

  // 불수용은 언제나 열린다(D9). 닫혀 왔다면 서버 계약이 바뀐 것이다.
  if (result === "REJECTED") return "서버가 이 판정을 열지 않았습니다."

  if (objection.litigationPending) {
    return "명의인과 피해자 사이 소송이 계속 중이라 피해금 부분을 해제할 수 없습니다."
  }

  const { branch } = objection.gate
  if (branch === "FRAUD_PATTERN") {
    const hasNegativeReply = objection.externalChecks.some(
      (check) =>
        check.reply != null && NEGATIVE_EXTERNAL_REPLIES.has(check.reply),
    )
    if (hasNegativeReply) {
      return "외부 기관이 가담 의심이나 서류 위조로 회신해 해제할 수 없습니다."
    }
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

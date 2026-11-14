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
 * 해제 요건 점검이 닫았지만 재량 판정으로 쓸 수 있을 때, 점검이 왜 닫혔는지. 서버가 재량을
 * 열었다면 소송 계속, 사유 조항 불일치, 외부 기관 부정 회신은 아니므로 갈래만 읽는다.
 */
const discretionaryGateReason = (objection: DecisionContext): string => {
  const { branch } = objection.gate
  if (branch === "FRAUD_PATTERN") {
    return "해제 요건 점검: 사기 패턴이 성립하고 정상 근거가 없습니다."
  }
  if (branch === "UNDETERMINED") {
    return "해제 요건 점검: 거래 기록으로 정상 근거를 확인하지 못했습니다."
  }
  return "해제 요건 점검을 충족하지 않습니다."
}

/** 재량으로도 쓸 수 없게 닫힌 이유. 서버 `GateResult.allowsRelease` 조건을 같은 순서로 읽는다. */
const gateClosedReason = (
  objection: DecisionContext,
  result: DecisionResult,
): string => {
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
  }

  if (result === "ACCEPTED" && objection.clause === 3) {
    return "사유 제3호는 피해금을 남기는 일부 지급정지만 열립니다."
  }
  if (result === "PARTIAL" && objection.clause !== 3) {
    return "사유 제1호와 제2호는 일부 지급정지가 아니라 수용만 열립니다."
  }

  if (branch === "FRAUD_PATTERN") {
    return "사기 패턴이 성립하고 정상 근거가 없어 해제할 수 없습니다."
  }
  if (branch === "UNDETERMINED") {
    return "거래 기록으로 정상 근거를 확인하지 못해 해제할 수 없습니다."
  }
  return "해제 요건을 충족하지 않습니다."
}

export type DecisionAvailability =
  /** 해제 요건 점검과 상태가 모두 열었다 */
  | { kind: "OPEN" }
  /**
   * 해제 요건 점검은 닫혔지만 담당자 재량으로 쓸 수 있다. 재량 판정 사유를 적고 다른 관리자가
   * 그 사유를 확인하고 승인해야 한다. `gateReason` 은 점검이 닫힌 이유다
   */
  | { kind: "DISCRETIONARY"; gateReason: string }
  /** 지금 고를 수 없다. `reason` 을 라디오 옆에 적는다 */
  | { kind: "CLOSED"; reason: string }

/**
 * 판정을 지금 고를 수 있는지와, 고를 수 없거나 재량 판정이면 그 이유.
 *
 * 판정은 두 조건이 모두 열려야 쓸 수 있다. 하나는 해제 요건이고, 다른 하나는 이의제기 상태다.
 * 해제 요건은 서버가 둘로 준다. `gate.allowedResults` 는 점검이 연 판정이고,
 * `gate.discretionaryResults` 는 점검은 닫혔지만 담당자 재량으로 쓸 수 있는 판정이다. 최종 판단은
 * 사람이 하므로 규칙이 닫았다고 판정을 막지 않는다. 다만 소송 계속, 사유 조항 불일치, 외부
 * 기관 부정 회신은 재량으로도 넘지 못한다. 서버 `allowedResults` 는 상태를 보지 않고, 상태는
 * 작성할 때 서버가 따로 검사해 `PST0308` 로 거부한다. 그래서 화면이 상태 규칙을 같이 읽는다.
 *
 * 재량으로도 못 쓰면 요건 이유를 상태보다 먼저 말한다. 상태가 풀려도 열리지 않을 판정에
 * "완비 확인 뒤"라고 적으면 기다리면 열릴 것처럼 읽힌다. 재량으로 쓸 수 있으면 상태가 풀린 뒤
 * 열리므로 상태 이유를 말한다. 서버 응답에 닫힌 이유가 없어서 서버 `GateResult.allowsRelease`
 * 의 조건(소송 계속, 갈래, 사유 조항)을 같은 순서로 읽는다. 서버 규칙이 바뀌어 여기서 이유를
 * 찾지 못하면 일반 문구로 떨어진다.
 */
export const decisionAvailability = (
  objection: DecisionContext,
  result: DecisionResult,
): DecisionAvailability => {
  const { allowedResults, discretionaryResults } = objection.gate
  if (!allowedResults[result] && !discretionaryResults[result]) {
    return { kind: "CLOSED", reason: gateClosedReason(objection, result) }
  }
  const blockedByStatus = statusReason(objection.objectionStatus, result)
  if (blockedByStatus != null) {
    return {
      kind: "CLOSED",
      reason: allowedResults[result]
        ? blockedByStatus
        : `${blockedByStatus} 해제 요건 점검과 다른 재량 판정이 됩니다.`,
    }
  }
  return allowedResults[result]
    ? { kind: "OPEN" }
    : {
        kind: "DISCRETIONARY",
        gateReason: discretionaryGateReason(objection),
      }
}

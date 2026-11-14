import type {
  DraftClaim,
  ReviewDraft,
} from "@/entities/payment-stop/api/agent-run"

/**
 * 주장 대 원장 대조(계획 PA-11). AI 판정안에서 주장마다 원장과 맞는지를 가른다.
 *
 * - 모순: 판정안의 "주장과 원장의 차이"에 그 주장이 있다. 근거는 그 차이의 거래다
 * - 근거 제시: 모순이 없고, 원문 인용이 있고, 판정안에 근거 거래가 있다
 * - 미확인: 그 밖. 인용이 없거나 원장 근거가 없다
 *
 * 판정안은 주장별 근거 거래를 따로 주지 않는다(계약 v2 §6). 그래서 근거 제시의 거래는 판정안
 * 전체의 근거 거래이고, 그 주장을 원장으로 확인했다는 뜻이 아니다. 그래서 "확인됨"이라고
 * 부르지 않는다. 이 대조는 심사 참고이고 해제 근거가 아니다(D9).
 */

export type ClaimVerification = "CITED" | "CONTRADICTED" | "UNVERIFIED"

export const CLAIM_VERIFICATION_LABEL: Record<ClaimVerification, string> = {
  CITED: "근거 제시",
  CONTRADICTED: "모순",
  UNVERIFIED: "미확인",
}

export type ClaimCheck = {
  claim: DraftClaim
  status: ClaimVerification
  /** 원장 쪽 사실. 모순일 때만 있다 */
  fact: string | null
  transactionNumbers: string[]
}

const normalize = (text: string) => text.replace(/\s+/g, "").replace(/\.$/, "")

const sameClaim = (a: string, b: string) => {
  const left = normalize(a)
  const right = normalize(b)
  return (
    left !== "" &&
    right !== "" &&
    (left === right || left.includes(right) || right.includes(left))
  )
}

export const verifyClaims = (draft: ReviewDraft): ClaimCheck[] => {
  const matched = new Set<number>()
  const rows = draft.claims.map((claim): ClaimCheck => {
    const index = draft.contradictions.findIndex(
      (item) => item.claim != null && sameClaim(item.claim, claim.text),
    )
    if (index >= 0) {
      matched.add(index)
      const contradiction = draft.contradictions[index]
      return {
        claim,
        status: "CONTRADICTED",
        fact: contradiction.fact,
        transactionNumbers: contradiction.transactionNumbers,
      }
    }
    const cited =
      claim.quote != null && draft.evidenceTransactionNumbers.length > 0
    return {
      claim,
      status: cited ? "CITED" : "UNVERIFIED",
      fact: null,
      transactionNumbers: cited ? draft.evidenceTransactionNumbers : [],
    }
  })
  // 주장 목록에 없는 모순도 빠뜨리지 않는다. 담당자가 꼭 봐야 할 줄이다.
  const orphans = draft.contradictions
    .filter((item, index) => !matched.has(index) && item.claim != null)
    .map((item): ClaimCheck => ({
      claim: {
        text: item.claim ?? "",
        quote: null,
        source: "STATEMENT",
        documentId: null,
        regionIndex: null,
      },
      status: "CONTRADICTED",
      fact: item.fact,
      transactionNumbers: item.transactionNumbers,
    }))
  return [...rows, ...orphans]
}

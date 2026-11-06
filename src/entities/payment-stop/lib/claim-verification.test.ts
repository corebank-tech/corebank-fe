import { describe, expect, it } from "vitest"
import type { ReviewDraft } from "@/entities/payment-stop/api/agent-run"
import { verifyClaims } from "@/entities/payment-stop/lib/claim-verification"

const claim = (text: string, quote: string | null = text) => ({
  text,
  quote,
  source: "STATEMENT" as const,
  documentId: null,
  regionIndex: null,
})

const draft = (overrides: Partial<ReviewDraft>): ReviewDraft => ({
  runId: 1,
  branch: "UNDETERMINED",
  evidenceTransactionNumbers: [],
  missingDocuments: [],
  claims: [],
  contradictions: [],
  followUps: [],
  noticeDraft: null,
  submittedAt: null,
  ...overrides,
})

describe("verifyClaims", () => {
  it("모순에 있는 주장은 모순, 인용과 근거 거래가 있으면 확인됨, 나머지는 미확인이다", () => {
    const checks = verifyClaims(
      draft({
        evidenceTransactionNumbers: ["TR1", "TR2"],
        claims: [
          claim("모르는 사람이 보낸 돈이다"),
          claim("계좌를 빌려준 적이 없다"),
          claim("인용 없는 주장", null),
        ],
        contradictions: [
          {
            claim: "계좌를 빌려준 적이 없다.",
            fact: "입금 직후 출금",
            transactionNumbers: ["TR9"],
          },
        ],
      }),
    )
    expect(checks.map((check) => check.status)).toEqual([
      "CONFIRMED",
      "CONTRADICTED",
      "UNVERIFIED",
    ])
    expect(checks[0].transactionNumbers).toEqual(["TR1", "TR2"])
    expect(checks[1]).toMatchObject({
      fact: "입금 직후 출금",
      transactionNumbers: ["TR9"],
    })
    expect(checks[2].transactionNumbers).toEqual([])
  })

  it("근거 거래가 없으면 인용이 있어도 미확인이고, 주장 목록 밖의 모순도 줄로 남긴다", () => {
    const checks = verifyClaims(
      draft({
        claims: [claim("물품 대금이다")],
        contradictions: [
          {
            claim: "매주 거래했다",
            fact: "석 달에 3번",
            transactionNumbers: [],
          },
        ],
      }),
    )
    expect(checks.map((check) => [check.claim.text, check.status])).toEqual([
      ["물품 대금이다", "UNVERIFIED"],
      ["매주 거래했다", "CONTRADICTED"],
    ])
  })
})

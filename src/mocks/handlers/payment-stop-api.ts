import { delay, http } from "msw"
import type {
  DecisionRequest,
  DecisionResponse,
  ExternalCheckResponse,
  ObjectionDetailResponse,
  LedgerEntry,
  NoticeResponse,
  ObjectionSummaryResponse,
  ReceiveRequest,
  RegisterRequest,
} from "@/shared/api/generated"
import { addBusinessDays } from "@/entities/payment-stop"
import { readMockCustomerId } from "@/mocks/handlers/admin"
import {
  readSignedInMemberId,
  requireMockPermission,
} from "@/mocks/handlers/auth"
import {
  documentPage,
  evidenceImage,
  evidencePdf,
  idCopy,
  ledger,
  livingTransactions,
  pendingEvidence,
  type MockDocument,
} from "@/mocks/handlers/payment-stop-review-fixtures"
import { fail, ok } from "@/mocks/lib/envelope"
import {
  nextSequence,
  readStore,
  toLocalDateTime,
  writeStore,
} from "@/mocks/lib/mock-store"
import { addDays } from "@/shared/lib/date"
import { getToday } from "@/shared/config/clock"

/**
 * 지급정지 사건과 이의제기 심사 API(서버 `paymentstop`, Draft PR #916) MSW 목.
 *
 * 화면 흐름(목록 → 상세 → 판정 확정, 대리 접수)을 서버 없이 돌리기 위한 것이다.
 * 해제 요건 점검은 서버처럼 원장으로 계산하지 않는다. 사건마다 결과를 미리 적어 두고,
 * 대리 접수로 새로 만든 사건은 "판단 불가"로 둔다. 판정 허용 조건(사유 조항, 소송 계속)은
 * 서버 `GateResult.allowsRelease` 와 같게 계산한다.
 *
 * 상태는 sessionStorage 에 둔다(새로고침해도 유지, 탭을 닫으면 처음으로).
 *
 * 심사 운영(계약 v2): 기한, 보완, 2인 승인, 외부 확인, 통지, 서류, 원장을 함께 둔다. 그 API
 * 목은 `payment-stop-review-api.ts` 에 있고 상태는 여기 것을 읽고 쓴다.
 * - 이의제기 3: 접수(완비 확인 전). 계약서 그림, 거래명세서 PDF, 신분증 사본
 * - 이의제기 2: 심사 중, 심사 기한이 다음 영업일이라 기한 경보
 * - 이의제기 4: 보완 기한 경과(불수용 대상)
 * - 이의제기 5: 박서준(고객 번호 2)이 쓴 수용 판정이 승인 대기
 * - 이의제기 1: 승인까지 끝난 일부 지급정지
 */

const MOCK_LATENCY_MS = 200
// 2차 계약으로 상태 모양이 바뀌어 키를 바꾼다. 옛 탭의 저장 상태를 읽지 않게 한다.
// 원장 방향 값을 서버와 같은 IN, OUT 으로 바꾸고 접수 경로를 더해 저장 모양이 바뀌었다.
const STORE_KEY = "payment-stop:objections:v3"
const RULES_VERSION = "2026-11-03.1"
const ACCESS_REASONS = ["CUSTOMER_REQUEST", "INCIDENT", "AUDIT", "OPERATION"]

export type MockObjection = Required<
  Pick<
    ObjectionDetailResponse,
    | "objectionId"
    | "caseId"
    | "accountId"
    | "caseStatus"
    | "objectionDeadline"
    | "disputedTransfers"
    | "clause"
    | "statement"
    | "simplifiedRequested"
    | "idCopyConfirmed"
    | "litigationPending"
    | "objectionStatus"
    | "receivedAt"
  >
> & {
  senderAccountId: number | null
  /** 접수 경로(서버 `ObjectionChannel`): `BRANCH` 영업점 대리, `ONLINE` 비대면 */
  receivedChannel: string
  branch: string
  rules: NonNullable<ObjectionDetailResponse["gate"]>["rules"]
  decision: DecisionResponse | null
  reviewDeadline: string | null
  supplementDue: string | null
  supplementRound: number
  pendingDecision: DecisionResponse | null
  externalChecks: ExternalCheckResponse[]
  notices: NoticeResponse[]
  documents: MockDocument[]
  ledger: LedgerEntry[]
}

type MockState = {
  objections: MockObjection[]
  /** 사건 등록만 하고 아직 이의제기를 받지 않은 사건 */
  pendingCases: Pick<
    MockObjection,
    "caseId" | "accountId" | "objectionDeadline" | "disputedTransfers"
  >[]
}

/** 서버 거래 번호 모양(영문 대문자와 숫자 20자리). */
const transactionNumber = (date: string, seq: number) =>
  `TR${date.replaceAll("-", "")}${String(seq).padStart(10, "0")}`

const at = (date: string, time: string) => `${date}T${time}`

const simplifiedRule = (requested: boolean) => ({
  rule: "SIMPLIFIED_EXCLUSION",
  description: "지급정지 이력이 있으면 간소화 대상에서 제외",
  basis: "REGULATOR_STANDARD",
  matched: false,
  transactionNumbers: [],
  detail: requested ? "간소화 신청, 지급정지 이력 없음" : "간소화 신청 없음",
})

const fraudRule = (matched: boolean, used: string[], detail: string) => ({
  rule: "FRAUD_PATTERN",
  description: "다툼 거래 전후 다수 송금인 입금과 즉시 출금",
  basis: "LAW_INTERNAL_METRIC",
  matched,
  transactionNumbers: used,
  detail,
})

const relationshipRule = (
  matched: boolean,
  used: string[],
  detail: string,
) => ({
  rule: "RELATIONSHIP",
  description: "송금인과 명의인의 다툼 이전 지속 거래",
  basis: "INTERNAL",
  matched,
  transactionNumbers: used,
  detail,
})

/** 이의제기마다 쓰지 않는 운영 필드의 기본값. */
const opsDefaults = () => ({
  receivedChannel: "ONLINE",
  reviewDeadline: null,
  supplementDue: null,
  supplementRound: 0,
  pendingDecision: null,
  externalChecks: [],
  notices: [],
  documents: [],
  ledger: [],
})

const receiptNotice = (noticeId: number, recordedAt: string) => ({
  noticeId,
  target: "HOLDER",
  kind: "RECEIPT",
  channel: "SMS",
  basis: "이의제기 접수(법 제7조)",
  recordedAt,
})

/** 관계 거래가 있는 정상 거래 사건의 원장. 관계 거래 3건은 해제 요건 점검 규칙과 같은 번호다. */
const relationshipLedger = (
  disputedDate: string,
  disputedTime: string,
  disputedSeq: number,
  amount: number,
  sender: number,
  relation: { days: number; seq: number; amount: number }[],
) =>
  ledger([
    ...livingTransactions(disputedDate, 5, 101, transactionNumber),
    ...relation.map((item) => ({
      number: transactionNumber(addDays(disputedDate, -item.days), item.seq),
      direction: "IN" as const,
      amount: item.amount,
      occurredAt: at(addDays(disputedDate, -item.days), "15:20:00"),
      counterpartyAccountId: sender,
    })),
    {
      number: transactionNumber(disputedDate, disputedSeq),
      direction: "IN",
      amount,
      occurredAt: at(disputedDate, disputedTime),
      counterpartyAccountId: sender,
      disputed: true,
    },
    {
      number: transactionNumber(addDays(disputedDate, 2), disputedSeq + 40),
      direction: "OUT",
      amount: 300_000,
      occurredAt: at(addDays(disputedDate, 2), "11:15:00"),
      counterpartyAccountId: null,
    },
  ])

const contractPage = (amount: string) =>
  documentPage("물품 공급 계약서", [
    "공급자: 김*수 (명의인)",
    "구매자: 거래처 CP-3f9a12c0",
    "계약일: 2026년 4월 1일",
    `월 공급 대금: ${amount}`,
    "결제 방법: 매월 말일 계좌 이체",
    "계약 기간: 2026년 4월부터 12개월",
    "위 내용으로 계약을 맺는다.",
  ])

const seed = (): MockState => {
  const d1 = addDays(getToday(), -12)
  const d2 = addDays(getToday(), -6)
  const d3 = addDays(getToday(), -20)
  const d4 = addDays(getToday(), -25)
  const d5 = addDays(getToday(), -15)
  const deadline = addDays(getToday(), 40)
  const today = getToday()
  const received3 = at(addDays(today, -2), "10:21:40")
  const received2 = at(addDays(today, -1), "16:02:11")
  const received4 = at(addDays(today, -14), "13:40:00")
  const received5 = at(addDays(today, -4), "09:55:30")
  const received1 = at(addDays(today, -9), "11:45:00")
  const fraudNumbers = [21, 22, 23, 24].map((seq) => transactionNumber(d2, seq))
  return {
    pendingCases: [],
    objections: [
      {
        ...opsDefaults(),
        objectionId: 5,
        caseId: 15,
        accountId: 2005,
        senderAccountId: 3301,
        caseStatus: "STOPPED",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d5, 51),
            amount: 800_000,
            occurredAt: at(d5, "10:30:00"),
          },
        ],
        clause: 2,
        statement:
          "학원 수강료로 받은 돈입니다. 같은 학부모가 매달 같은 금액을 보내 왔습니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "PENDING_APPROVAL",
        receivedAt: received5,
        branch: "NORMAL_ACCEPT",
        rules: [
          simplifiedRule(false),
          fraudRule(
            false,
            [transactionNumber(d5, 51)],
            "송금인 1명(기준 3명 이상), 즉시 출금 0원 / 입금 800000원(기준 80% 이상)",
          ),
          relationshipRule(
            true,
            [
              transactionNumber(addDays(d5, -92), 5),
              transactionNumber(addDays(d5, -61), 6),
              transactionNumber(addDays(d5, -31), 8),
            ],
            "관계 거래 3회(기준 3회 이상), 기간 61일(기준 30일 이상), 다툼보다 92일 앞섬(기준 30일 이상), 다툼 800000원 / 최대 800000원 × 5",
          ),
        ],
        decision: null,
        reviewDeadline: addBusinessDays(addDays(today, -3), 5),
        pendingDecision: {
          decisionId: 51,
          status: "PENDING_APPROVAL",
          result: "ACCEPTED",
          reason: "다툼 이전 석 달 동안 같은 금액의 수강료 입금이 이어졌다.",
          earlyReleaseBasis: `관계 거래 ${transactionNumber(addDays(d5, -92), 5)} 외 2건`,
          decidedBy: 2,
          decidedAt: at(addDays(today, -1), "17:10:00"),
        },
        notices: [receiptNotice(501, received5)],
        documents: [
          evidenceImage(
            501,
            "수강료_영수증.png",
            received5,
            documentPage("수강료 영수증", [
              "학원명: 바른수학학원",
              "수강생: 이*준",
              "납부자: 학부모 CP-71ab03e2",
              "수강료: 800,000원 (월)",
              "납부 방법: 계좌 이체",
            ]),
          ),
          idCopy(502, received5),
        ],
        ledger: relationshipLedger(d5, "10:30:00", 51, 800_000, 3301, [
          { days: 92, seq: 5, amount: 800_000 },
          { days: 61, seq: 6, amount: 800_000 },
          { days: 31, seq: 8, amount: 800_000 },
        ]),
      },
      {
        ...opsDefaults(),
        objectionId: 4,
        caseId: 14,
        accountId: 2004,
        senderAccountId: null,
        caseStatus: "STOPPED",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d4, 41),
            amount: 2_000_000,
            occurredAt: at(d4, "19:22:05"),
          },
        ],
        clause: 2,
        statement:
          "중고 거래 사이트에서 노트북을 팔고 받은 돈입니다. 판매 글과 대화 기록이 있습니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "SUPPLEMENT_REQUESTED",
        receivedAt: received4,
        branch: "UNDETERMINED",
        rules: [
          simplifiedRule(false),
          fraudRule(
            false,
            [transactionNumber(d4, 41)],
            "송금인 1명(기준 3명 이상), 즉시 출금 0원 / 입금 2000000원(기준 80% 이상)",
          ),
          relationshipRule(
            false,
            [],
            "타행 송금이라 당행 관계 거래를 볼 수 없음",
          ),
        ],
        decision: null,
        // 보완을 요청하면 서버가 심사 기한을 비운다. 보완 뒤 완비를 다시 확인할 때 새로 건다.
        reviewDeadline: null,
        supplementRound: 1,
        // 보완 기한이 이틀 전에 지났다. 목록에 불수용 대상으로 보인다.
        supplementDue: addDays(today, -2),
        notices: [
          receiptNotice(401, received4),
          {
            noticeId: 402,
            target: "HOLDER",
            kind: "SUPPLEMENT_REQUEST",
            channel: "SMS",
            basis: "판매 글 캡처와 대화 기록 제출 요청",
            recordedAt: at(addDays(today, -9), "10:00:00"),
          },
        ],
        documents: [
          pendingEvidence(401, "판매글_캡처.jpg", received4),
          idCopy(402, received4),
        ],
        ledger: ledger([
          ...livingTransactions(d4, 4, 201, transactionNumber),
          {
            number: transactionNumber(d4, 41),
            direction: "IN",
            amount: 2_000_000,
            occurredAt: at(d4, "19:22:05"),
            counterpartyAccountId: null,
            disputed: true,
          },
        ]),
      },
      {
        ...opsDefaults(),
        objectionId: 3,
        caseId: 13,
        accountId: 2003,
        senderAccountId: 3101,
        caseStatus: "STOPPED",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d1, 31),
            amount: 1_200_000,
            occurredAt: at(d1, "14:05:12"),
          },
        ],
        clause: 2,
        statement:
          "거래처에 납품한 물품 대금을 받은 것입니다. 같은 거래처와 반년 넘게 매달 거래해 왔습니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "RECEIVED",
        receivedAt: received3,
        branch: "NORMAL_ACCEPT",
        rules: [
          simplifiedRule(false),
          fraudRule(
            false,
            [transactionNumber(d1, 31)],
            "송금인 1명(기준 3명 이상), 즉시 출금 0원 / 입금 1200000원(기준 80% 이상)",
          ),
          relationshipRule(
            true,
            [
              transactionNumber(addDays(d1, -150), 3),
              transactionNumber(addDays(d1, -90), 7),
              transactionNumber(addDays(d1, -35), 9),
            ],
            "관계 거래 3회(기준 3회 이상), 기간 115일(기준 30일 이상), 다툼보다 150일 앞섬(기준 30일 이상), 다툼 1200000원 / 최대 900000원 × 5",
          ),
        ],
        decision: null,
        notices: [receiptNotice(301, received3)],
        documents: [
          evidenceImage(
            301,
            "물품공급계약서.png",
            received3,
            contractPage("1,200,000원"),
          ),
          evidencePdf(
            302,
            "거래명세서.pdf",
            received3,
            documentPage("거래 명세서", [
              "품목: 사무용 의자 12개",
              "공급 가액: 1,200,000원",
              "공급일: 납품 당일",
            ]),
          ),
          idCopy(303, received3),
        ],
        ledger: relationshipLedger(d1, "14:05:12", 31, 1_200_000, 3101, [
          { days: 150, seq: 3, amount: 900_000 },
          { days: 90, seq: 7, amount: 700_000 },
          { days: 35, seq: 9, amount: 800_000 },
        ]),
      },
      {
        ...opsDefaults(),
        objectionId: 2,
        caseId: 12,
        accountId: 2002,
        senderAccountId: null,
        caseStatus: "STOPPED",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d2, 21),
            amount: 950_000,
            occurredAt: at(d2, "21:40:03"),
          },
          {
            transactionNumber: transactionNumber(d2, 22),
            amount: 1_500_000,
            occurredAt: at(d2, "21:52:47"),
          },
        ],
        clause: 1,
        statement:
          "모르는 사람이 보낸 돈입니다. 계좌를 다른 사람에게 빌려준 적이 없습니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "UNDER_REVIEW",
        receivedAt: received2,
        branch: "FRAUD_PATTERN",
        rules: [
          simplifiedRule(false),
          fraudRule(
            true,
            fraudNumbers,
            "송금인 4명(기준 3명 이상), 즉시 출금 3150000원 / 입금 3450000원(기준 80% 이상)",
          ),
          relationshipRule(
            false,
            [],
            "타행 송금이라 당행 관계 거래를 볼 수 없음",
          ),
        ],
        decision: null,
        // 심사 기한이 다음 영업일이라 기한 경보가 켜진다(설계 불변식 6).
        reviewDeadline: addBusinessDays(today, 1),
        notices: [receiptNotice(201, received2)],
        documents: [
          evidenceImage(
            201,
            "통장사용경위서.png",
            received2,
            documentPage("통장 사용 경위서", [
              "작성자: 박*영 (명의인)",
              "통장은 본인만 사용했습니다.",
              "체크카드를 잃어버린 적이 없습니다.",
              "입금된 돈은 모르는 돈입니다.",
            ]),
          ),
          idCopy(202, received2),
        ],
        ledger: ledger([
          ...livingTransactions(d2, 3, 301, transactionNumber),
          {
            number: fraudNumbers[0],
            direction: "IN",
            amount: 950_000,
            occurredAt: at(d2, "21:40:03"),
            disputed: true,
          },
          {
            number: fraudNumbers[1],
            direction: "IN",
            amount: 1_500_000,
            occurredAt: at(d2, "21:52:47"),
            disputed: true,
          },
          {
            number: fraudNumbers[2],
            direction: "IN",
            amount: 600_000,
            occurredAt: at(d2, "22:05:30"),
          },
          {
            number: fraudNumbers[3],
            direction: "IN",
            amount: 400_000,
            occurredAt: at(d2, "22:20:12"),
          },
          {
            number: transactionNumber(d2, 25),
            direction: "OUT",
            amount: 1_400_000,
            occurredAt: at(d2, "22:10:41"),
          },
          {
            number: transactionNumber(d2, 26),
            direction: "OUT",
            amount: 1_000_000,
            occurredAt: at(d2, "22:31:09"),
          },
          {
            number: transactionNumber(d2, 27),
            direction: "OUT",
            amount: 750_000,
            occurredAt: at(d2, "22:58:33"),
          },
        ]),
      },
      {
        ...opsDefaults(),
        objectionId: 1,
        caseId: 11,
        accountId: 2001,
        senderAccountId: 3001,
        caseStatus: "PARTIAL",
        objectionDeadline: deadline,
        disputedTransfers: [
          {
            transactionNumber: transactionNumber(d3, 11),
            amount: 300_000,
            occurredAt: at(d3, "09:12:30"),
          },
        ],
        clause: 3,
        statement:
          "받은 돈은 생활비 계좌로 옮기지 않고 그대로 두었습니다. 다른 입금은 급여입니다.",
        simplifiedRequested: false,
        idCopyConfirmed: true,
        litigationPending: false,
        objectionStatus: "DECIDED",
        receivedAt: received1,
        branch: "NORMAL_ACCEPT",
        rules: [
          simplifiedRule(false),
          fraudRule(
            false,
            [transactionNumber(d3, 11)],
            "송금인 1명(기준 3명 이상), 즉시 출금 0원 / 입금 300000원(기준 80% 이상)",
          ),
          relationshipRule(
            true,
            [
              transactionNumber(addDays(d3, -120), 1),
              transactionNumber(addDays(d3, -60), 2),
              transactionNumber(addDays(d3, -31), 4),
            ],
            "관계 거래 3회(기준 3회 이상), 기간 89일(기준 30일 이상), 다툼보다 120일 앞섬(기준 30일 이상), 다툼 300000원 / 최대 400000원 × 5",
          ),
        ],
        decision: {
          decisionId: 11,
          status: "CONFIRMED",
          result: "PARTIAL",
          reason:
            "다툼 입금 이전 급여 입금이 정기적으로 확인되어 피해금만 보류한다.",
          earlyReleaseBasis: `관계 거래 ${transactionNumber(addDays(d3, -120), 1)}`,
          requestedHoldAmount: 300_000,
          appliedHoldAmount: 300_000,
          decidedBy: 2,
          decidedAt: at(addDays(today, -6), "15:30:00"),
          approvedBy: 14,
          approvedAt: at(addDays(today, -5), "10:05:00"),
        },
        reviewDeadline: addBusinessDays(addDays(today, -8), 5),
        notices: [
          receiptNotice(101, received1),
          ...["VICTIM", "FSS"].map((target, index) => ({
            noticeId: 102 + index,
            target,
            kind: "DECISION_PARTIAL",
            channel: "DOCUMENT",
            basis: "일부 지급정지 확정(법 제7조제3항)",
            recordedAt: at(addDays(today, -5), "10:05:00"),
          })),
        ],
        documents: [
          evidenceImage(
            101,
            "급여명세서.png",
            received1,
            documentPage("급여 명세서", [
              "성명: 정*호",
              "지급일: 매월 25일",
              "실지급액: 2,850,000원",
            ]),
          ),
          idCopy(102, received1),
        ],
        ledger: relationshipLedger(d3, "09:12:30", 11, 300_000, 3001, [
          { days: 120, seq: 1, amount: 400_000 },
          { days: 60, seq: 2, amount: 350_000 },
          { days: 31, seq: 4, amount: 300_000 },
        ]),
      },
    ],
  }
}

export const readState = (): MockState =>
  readStore<MockState>(STORE_KEY, seed())
export const writeState = (state: MockState) => writeStore(STORE_KEY, state)

/** 지금 로그인한 관리자의 고객 번호. 판정 작성자, 승인자로 남는다. */
export const currentAdminId = () =>
  readMockCustomerId(readSignedInMemberId() ?? "")

/** 외부 확인 회신 중 해제를 막는 것(G6 부정 회신). */
const NEGATIVE_REPLIES = new Set(["INVOLVEMENT_SUSPECTED", "DOCUMENT_FORGED"])

const hasNegativeReply = (objection: MockObjection) =>
  objection.externalChecks.some((check) =>
    NEGATIVE_REPLIES.has(check.reply ?? ""),
  )

/** AI 분석 목(`payment-stop-agent-api.ts`)이 이의제기를 읽는 자리. */
export const readMockObjection = (objectionId: number) =>
  readState().objections.find((item) => item.objectionId === objectionId)

const hasReply = (objection: MockObjection, reply: string) =>
  objection.externalChecks.some((check) => check.reply === reply)

const EXTERNAL_REPLY_TEXT: Record<string, string> = {
  INVOLVEMENT_SUSPECTED: "가담 의심",
  DOCUMENT_FORGED: "서류 위조 판명",
  OWNER_UNRELATED: "명의인 무관",
}

/**
 * 외부 확인 회신을 반영한 갈래. 서버 `ReleaseGate` 의 순서를 따른다. 부정 회신은 원장
 * 근거보다 앞서 사기 패턴이 되고(순서 1), 명의인 무관 회신은 수용 근거라 사기 패턴과 겹치면
 * 판단 불가, 아니면 정상 수용이다. 목은 원장 규칙을 다시 계산하지 않으므로 사기 패턴 성립
 * 여부는 저장한 규칙 행에서 읽는다.
 */
const effectiveBranch = (objection: MockObjection) => {
  if (hasNegativeReply(objection)) return "FRAUD_PATTERN"
  if (!hasReply(objection, "OWNER_UNRELATED")) return objection.branch
  const fraudMatched = (objection.rules ?? []).some(
    (rule) => rule.rule === "FRAUD_PATTERN" && rule.matched,
  )
  return fraudMatched ? "UNDETERMINED" : "NORMAL_ACCEPT"
}

/** 서버 `GateResult.allowsRelease` 와 같은 판정 허용 조건. 이의제기 상태는 보지 않는다. */
export const allowedResults = (objection: MockObjection) => {
  const branch = effectiveBranch(objection)
  const normal = branch === "NORMAL_ACCEPT"
  const open = !objection.litigationPending
  return {
    ACCEPTED:
      open && normal && (objection.clause === 1 || objection.clause === 2),
    PARTIAL:
      open && (normal || branch === "NORMAL_PARTIAL") && objection.clause === 3,
    REJECTED: true,
  }
}

export const disputedTotal = (
  objection: Pick<MockObjection, "disputedTransfers">,
) => objection.disputedTransfers.reduce((sum, t) => sum + (t.amount ?? 0), 0)

/** 확정 전이고 오늘이 심사 기한 1영업일 전 이후인가(설계 불변식 6). 목은 주말만 뺀다. */
const isDeadlineAlert = (objection: MockObjection) => {
  if (!objection.reviewDeadline || objection.objectionStatus === "DECIDED") {
    return false
  }
  return addBusinessDays(getToday(), 1) >= objection.reviewDeadline
}

const isSupplementOverdue = (objection: MockObjection) =>
  objection.objectionStatus === "SUPPLEMENT_REQUESTED" &&
  objection.supplementDue != null &&
  getToday() > objection.supplementDue

/**
 * 외부 확인 회신 규칙 행. 서버처럼 언제나 있고, 회신이 하나라도 있으면 성립(`matched`)이다.
 * 성립이 곧 해제 불가는 아니다. 명의인 무관 회신은 수용 근거가 된다.
 */
const externalRule = (objection: MockObjection) => {
  const replies = objection.externalChecks
    .map((check) => EXTERNAL_REPLY_TEXT[check.reply ?? ""])
    .filter((text): text is string => text != null)
  return {
    rule: "EXTERNAL_CHECK",
    description: "수사기관과 관계 기관의 외부 확인 회신",
    basis: "INTERNAL",
    matched: replies.length > 0,
    transactionNumbers: [],
    detail:
      replies.length > 0 ? `회신 ${replies.join(", ")}` : "외부 확인 회신 없음",
  }
}

/** 서버 규칙 행 순서(간소화 제외, 외부 확인, 사기 패턴, 관계, 일부 요건)대로 둔다. */
const gateRules = (objection: MockObjection) => {
  const stored = (objection.rules ?? []).filter(
    (rule) => rule.rule !== "EXTERNAL_CHECK",
  )
  const at = stored[0]?.rule === "SIMPLIFIED_EXCLUSION" ? 1 : 0
  return [...stored.slice(0, at), externalRule(objection), ...stored.slice(at)]
}

export const toSummary = (
  objection: MockObjection,
): ObjectionSummaryResponse => ({
  objectionId: objection.objectionId,
  caseId: objection.caseId,
  accountId: objection.accountId,
  clause: objection.clause,
  objectionStatus: objection.objectionStatus,
  caseStatus: objection.caseStatus,
  disputedTotal: disputedTotal(objection),
  objectionDeadline: objection.objectionDeadline,
  receivedAt: objection.receivedAt,
  receivedChannel: objection.receivedChannel,
  reviewDeadline: objection.reviewDeadline ?? undefined,
  deadlineAlert: isDeadlineAlert(objection),
  supplementDue: objection.supplementDue ?? undefined,
  supplementOverdue: isSupplementOverdue(objection),
})

const toDetail = (objection: MockObjection): ObjectionDetailResponse => ({
  ...toSummary(objection),
  senderAccountId: objection.senderAccountId ?? undefined,
  disputedTransfers: objection.disputedTransfers,
  statement: objection.statement,
  simplifiedRequested: objection.simplifiedRequested,
  idCopyConfirmed: objection.idCopyConfirmed,
  litigationPending: objection.litigationPending,
  gate: {
    branch: effectiveBranch(objection),
    simplifiedExcluded: false,
    rulesVersion: RULES_VERSION,
    allowedResults: allowedResults(objection),
    rules: gateRules(objection),
  },
  decision: objection.decision ?? undefined,
  supplementRound: objection.supplementRound,
  pendingDecision: objection.pendingDecision ?? undefined,
  externalChecks: objection.externalChecks,
  documentCount: objection.documents.length,
})

export const requireIdempotencyKey = (request: Request) =>
  request.headers.get("Idempotency-Key")
    ? null
    : fail("CMN0002", "필수 입력값이 누락되었습니다.", 400)

export const objectionNotFound = () =>
  fail("PST0202", "이의제기를 찾을 수 없습니다.", 404)

export const CASE_STATUS_AFTER: Record<string, string> = {
  ACCEPTED: "RELEASED",
  PARTIAL: "PARTIAL",
  REJECTED: "STOPPED",
}

const NOTICE_BASIS: Record<string, string> = {
  RECEIPT: "이의제기 접수(법 제7조)",
  SUPPLEMENT_REQUEST: "소명 보완 요청",
  DECISION_ACCEPTED: "수용 확정(법 제7조제3항)",
  DECISION_PARTIAL: "일부 지급정지 확정(법 제7조제3항)",
  DECISION_REJECTED: "불수용 확정(법 제7조제3항)",
  STOP_TERMINATED: "지급정지 종료(법 제7조제4항)",
}

/** 통지 기록 한 줄. 번호는 이의제기 안에서 이어 붙인다. */
export const noticeOf = (
  objection: MockObjection,
  target: string,
  kind: string,
  channel: string,
  recordedAt: string,
  basis = NOTICE_BASIS[kind] ?? kind,
): NoticeResponse => ({
  noticeId:
    Math.max(
      objection.objectionId * 100,
      ...objection.notices.map((notice) => notice.noticeId ?? 0),
    ) + 1,
  target,
  kind,
  channel,
  basis,
  recordedAt,
})

export const paymentStopApiHandlers = [
  http.get("*/admin/objections/:objectionId", async ({ params, request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied = requireMockPermission("PAYMENT_STOP_READ")
    if (denied) return denied
    if (
      !ACCESS_REASONS.includes(request.headers.get("X-Access-Reason") ?? "")
    ) {
      return fail("CMN0007", "조회 사유가 없거나 올바르지 않습니다.", 400)
    }

    const objection = readState().objections.find(
      (item) => item.objectionId === Number(params.objectionId),
    )
    return objection ? ok(toDetail(objection)) : objectionNotFound()
  }),

  http.post(
    "*/admin/objections/:objectionId/decisions",
    async ({ params, request }) => {
      await delay(MOCK_LATENCY_MS)
      const denied =
        requireMockPermission("PAYMENT_STOP_WRITE") ??
        requireIdempotencyKey(request)
      if (denied) return denied

      const body = (await request.json()) as DecisionRequest
      const state = readState()
      const objection = state.objections.find(
        (item) => item.objectionId === Number(params.objectionId),
      )
      if (!objection) return objectionNotFound()
      if (objection.decision) {
        return fail("PST0302", "이미 판정이 확정된 이의제기입니다.", 409)
      }
      const releasing = body.result !== "REJECTED"
      // 서버 `Objection.requireDecidable`: 승인 대기가 있으면 어느 판정도 못 쓰고, 수용과 일부
      // 지급정지는 소명 완비 확인 뒤(`UNDER_REVIEW`)에만 쓴다.
      if (
        objection.pendingDecision ||
        objection.objectionStatus === "PENDING_APPROVAL" ||
        (releasing && objection.objectionStatus !== "UNDER_REVIEW")
      ) {
        return fail("PST0308", "지금 상태에서 할 수 없는 요청입니다.", 409)
      }
      if (releasing && !body.earlyReleaseBasis?.trim()) {
        return fail(
          "PST0004",
          "수용과 일부 지급정지 판정에는 조기 해제 근거가 필요합니다.",
          400,
        )
      }
      if (!allowedResults(objection)[body.result]) {
        return fail(
          "PST0301",
          "해제 요건을 충족하지 않아 이 판정을 확정할 수 없습니다.",
          409,
        )
      }

      const total = disputedTotal(objection)
      const now = toLocalDateTime(new Date())
      const decision: DecisionResponse = {
        decisionId: 1000 + nextSequence("payment-stop-decision"),
        // 불수용은 바로 확정, 수용과 일부 지급정지는 승인 대기(2인 승인, 계약 v2 §3).
        status: releasing ? "PENDING_APPROVAL" : "CONFIRMED",
        result: body.result,
        reason: body.reason,
        earlyReleaseBasis: releasing ? body.earlyReleaseBasis : undefined,
        requestedHoldAmount: body.result === "PARTIAL" ? total : undefined,
        decidedBy: currentAdminId(),
        decidedAt: now,
      }
      if (releasing) {
        objection.pendingDecision = decision
        objection.objectionStatus = "PENDING_APPROVAL"
      } else {
        objection.decision = decision
        objection.objectionStatus = "DECIDED"
        objection.caseStatus = CASE_STATUS_AFTER[body.result]
        objection.notices.push(
          noticeOf(objection, "HOLDER", "DECISION_REJECTED", "DOCUMENT", now),
        )
      }
      writeState(state)
      return ok(decision)
    },
  ),

  http.post("*/admin/objections", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied =
      requireMockPermission("PAYMENT_STOP_WRITE") ??
      requireIdempotencyKey(request)
    if (denied) return denied

    const body = (await request.json()) as ReceiveRequest
    const state = readState()
    if (state.objections.some((item) => item.caseId === body.caseId)) {
      return fail("PST0304", "이미 이의제기가 접수된 사건입니다.", 409)
    }
    const pending = state.pendingCases.find(
      (item) => item.caseId === body.caseId,
    )
    if (!pending)
      return fail("PST0201", "지급정지 사건을 찾을 수 없습니다.", 404)
    if (pending.objectionDeadline < getToday()) {
      return fail("PST0002", "이의제기 신청 기한이 지났습니다.", 400)
    }
    if (!body.idCopyConfirmed || !body.statement.trim()) {
      return fail(
        "PST0003",
        "신분증 사본 확인과 이의제기 사유가 필요합니다.",
        400,
      )
    }

    const objectionId =
      Math.max(0, ...state.objections.map((item) => item.objectionId)) + 1
    const used = pending.disputedTransfers.map((t) => t.transactionNumber ?? "")
    state.objections.push({
      ...pending,
      objectionId,
      senderAccountId: null,
      caseStatus: "STOPPED",
      clause: body.clause,
      statement: body.statement,
      simplifiedRequested: body.simplifiedRequested ?? false,
      idCopyConfirmed: true,
      litigationPending: body.litigationPending ?? false,
      objectionStatus: "RECEIVED",
      receivedAt: toLocalDateTime(new Date()),
      ...opsDefaults(),
      receivedChannel: "BRANCH",
      notices: [
        receiptNotice(objectionId * 100 + 1, toLocalDateTime(new Date())),
      ],
      ledger: ledger(
        pending.disputedTransfers.map((transfer) => ({
          number: transfer.transactionNumber ?? "",
          direction: "IN" as const,
          amount: transfer.amount ?? 0,
          occurredAt: transfer.occurredAt ?? "",
          disputed: true,
        })),
      ),
      branch: "UNDETERMINED",
      rules: [
        simplifiedRule(body.simplifiedRequested ?? false),
        fraudRule(false, used, "송금인 1명(기준 3명 이상)"),
        relationshipRule(
          false,
          [],
          "타행 송금이라 당행 관계 거래를 볼 수 없음",
        ),
      ],
      decision: null,
    })
    state.pendingCases = state.pendingCases.filter(
      (item) => item.caseId !== body.caseId,
    )
    writeState(state)
    return ok({ objectionId })
  }),

  http.post("*/admin/payment-stops", async ({ request }) => {
    await delay(MOCK_LATENCY_MS)
    const denied =
      requireMockPermission("PAYMENT_STOP_WRITE") ??
      requireIdempotencyKey(request)
    if (denied) return denied

    const body = (await request.json()) as RegisterRequest
    const state = readState()
    const registered = new Set(
      [...state.objections, ...state.pendingCases].flatMap((item) =>
        item.disputedTransfers.map((t) => t.transactionNumber),
      ),
    )
    if (body.disputedTransactionNumbers.some((n) => registered.has(n))) {
      return fail(
        "PST0303",
        "다른 지급정지 사건에 이미 등록된 다툼 거래입니다.",
        409,
      )
    }

    const caseId =
      Math.max(
        0,
        ...[...state.objections, ...state.pendingCases].map(
          (item) => item.caseId,
        ),
      ) + 1
    state.pendingCases.push({
      caseId,
      accountId: body.accountId,
      objectionDeadline: body.objectionDeadline,
      disputedTransfers: body.disputedTransactionNumbers.map((number) => ({
        transactionNumber: number,
        amount: 500_000,
        occurredAt: at(addDays(getToday(), -3), "13:00:00"),
      })),
    })
    writeState(state)
    return ok({ caseId })
  }),
]

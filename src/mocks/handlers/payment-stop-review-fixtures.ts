import type {
  ObjectionDocumentResponse,
  ObjectionLedgerEntryResponse,
  OcrPage,
} from "@/shared/api/generated"
import { addDays } from "@/shared/lib/date"

/**
 * 이의제기 심사 운영 목의 고정 자료(계약 v2 §3, §5). 첨부 서류, 판독 결과, 원장.
 *
 * 서류 그림은 판독 결과의 글자 영역 좌표에 글자를 그려 만든다. 그래야 화면의 영역 상자가
 * 그림 위 글자와 겹친다. 실제 서버는 PNG, JPEG, PDF 원본을 주지만 목은 같은 크기의 SVG를
 * 준다. 「시연용 견본」 표시를 넣고 이름과 계좌는 가명 처리된 값만 쓴다.
 */

export type MockDocument = Required<
  Pick<
    ObjectionDocumentResponse,
    | "documentId"
    | "kind"
    | "fileName"
    | "contentType"
    | "size"
    | "sha256"
    | "round"
    | "uploadedAt"
  >
> & {
  ocrStatus: string | null
  /** 판독 결과. 신분증 사본과 판독 전 서류는 `null` */
  pages: OcrPage[] | null
}

const PAGE_WIDTH = 800
const PAGE_HEIGHT = 1000
const LEFT = 64
const TITLE_SIZE = 34
const LINE_SIZE = 22
const LINE_GAP = 62

/** 한글 한 글자 폭을 글자 크기의 0.95로 잡아 영역 폭을 정한다. */
const textWidth = (text: string, size: number) =>
  Math.round([...text].length * size * 0.95)

/** 제목과 줄 목록으로 판독 결과 한 쪽을 만든다. 영역 번호는 0부터다. */
export const documentPage = (title: string, lines: string[]): OcrPage => {
  const titleWidth = textWidth(title, TITLE_SIZE)
  const regions = [
    {
      index: 0,
      text: title,
      bbox: [
        Math.round((PAGE_WIDTH - titleWidth) / 2),
        80,
        titleWidth,
        TITLE_SIZE + 12,
      ],
      confidence: 0.98,
    },
    ...lines.map((text, line) => ({
      index: line + 1,
      text,
      bbox: [
        LEFT,
        200 + line * LINE_GAP,
        textWidth(text, LINE_SIZE),
        LINE_SIZE + 14,
      ],
      // 판독 신뢰도는 줄마다 조금씩 다르게 둔다. 화면이 낮은 신뢰도를 구분해 보이는지 본다.
      confidence: Math.round((0.97 - (line % 3) * 0.06) * 100) / 100,
    })),
  ]
  return { page: 1, width: PAGE_WIDTH, height: PAGE_HEIGHT, regions }
}

const escapeXml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

/** 판독 결과대로 글자를 그린 서류 그림. */
export const renderDocumentSvg = (page: OcrPage): string => {
  const texts = (page.regions ?? [])
    .map((region) => {
      const [x, y, , h] = region.bbox ?? [0, 0, 0, 0]
      const size = region.index === 0 ? TITLE_SIZE : LINE_SIZE
      return `<text x="${x}" y="${y + h - 8}" font-size="${size}"${region.index === 0 ? ' font-weight="700"' : ""}>${escapeXml(region.text ?? "")}</text>`
    })
    .join("")
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" viewBox="0 0 ${page.width} ${page.height}" font-family="sans-serif" fill="#17202e"><rect width="100%" height="100%" fill="#ffffff"/><rect x="24" y="24" width="${(page.width ?? 0) - 48}" height="${(page.height ?? 0) - 48}" fill="none" stroke="#c3c9d2"/>${texts}<text x="${(page.width ?? 0) - 40}" y="${(page.height ?? 0) - 48}" font-size="18" text-anchor="end" fill="#d81e18">시연용 견본</text></svg>`
}

/** 신분증 사본 자리표시. 실제 신분증은 그리지 않는다. */
export const renderIdCopySvg = (): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400" font-family="sans-serif"><rect width="100%" height="100%" fill="#f3f5f8"/><rect x="40" y="60" width="160" height="200" fill="#c3c9d2"/><text x="240" y="120" font-size="28" fill="#17202e">신분증 사본</text><text x="240" y="170" font-size="20" fill="#4b5563">시연용 가림 처리</text><text x="600" y="360" font-size="16" text-anchor="end" fill="#d81e18">시연용 견본</text></svg>`

/** 한 쪽짜리 PDF. 화면이 PDF 를 그림으로 못 그릴 때의 안내를 확인하는 용도다. */
export const MINIMAL_PDF =
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"

const fakeSha = (seed: number) =>
  Array.from({ length: 64 }, (_, i) => ((seed * 31 + i * 7) % 16).toString(16))
    .join("")
    .slice(0, 64)

export const evidenceImage = (
  documentId: number,
  fileName: string,
  uploadedAt: string,
  page: OcrPage,
  round = 0,
): MockDocument => ({
  documentId,
  kind: "EVIDENCE",
  fileName,
  contentType: "image/png",
  size: 182_400 + documentId * 13,
  sha256: fakeSha(documentId),
  round,
  uploadedAt,
  ocrStatus: "DONE",
  pages: [page],
})

export const evidencePdf = (
  documentId: number,
  fileName: string,
  uploadedAt: string,
  page: OcrPage,
): MockDocument => ({
  documentId,
  kind: "EVIDENCE",
  fileName,
  contentType: "application/pdf",
  size: 96_210 + documentId * 13,
  sha256: fakeSha(documentId),
  round: 0,
  uploadedAt,
  ocrStatus: "DONE",
  pages: [page],
})

export const pendingEvidence = (
  documentId: number,
  fileName: string,
  uploadedAt: string,
): MockDocument => ({
  documentId,
  kind: "EVIDENCE",
  fileName,
  contentType: "image/jpeg",
  size: 240_118,
  sha256: fakeSha(documentId),
  round: 0,
  uploadedAt,
  ocrStatus: "PENDING",
  pages: null,
})

export const idCopy = (
  documentId: number,
  uploadedAt: string,
): MockDocument => ({
  documentId,
  kind: "ID_COPY",
  fileName: "신분증_사본.jpg",
  contentType: "image/jpeg",
  size: 310_552,
  sha256: fakeSha(documentId),
  round: 0,
  uploadedAt,
  // 신분증 사본은 판독하지 않는다(D37).
  ocrStatus: null,
  pages: null,
})

type LedgerInput = {
  number: string
  direction: "DEPOSIT" | "WITHDRAWAL"
  amount: number
  occurredAt: string
  counterpartyAccountId?: number | null
  disputed?: boolean
}

/**
 * 원장 행을 시각 순으로 정렬하고 `afterDispute` 를 채운다. 다툼 거래 중 가장 이른 시각
 * 이후의 거래가 대상이다(근거 제외 규칙).
 */
export const ledger = (
  inputs: LedgerInput[],
): ObjectionLedgerEntryResponse[] => {
  const firstDispute = inputs
    .filter((input) => input.disputed)
    .map((input) => input.occurredAt)
    .sort()[0]
  return [...inputs]
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((input) => ({
      transactionNumber: input.number,
      direction: input.direction,
      interbank: input.counterpartyAccountId == null,
      counterpartyAccountId: input.counterpartyAccountId ?? undefined,
      amount: input.amount,
      occurredAt: input.occurredAt,
      disputed: input.disputed ?? false,
      afterDispute:
        !input.disputed &&
        firstDispute != null &&
        input.occurredAt > firstDispute,
    }))
}

/** 다툼 이전 생활 거래(급여 입금, 카드 대금 출금). 월마다 한 쌍씩 둔다. */
export const livingTransactions = (
  beforeDate: string,
  months: number,
  seqBase: number,
  number: (date: string, seq: number) => string,
): LedgerInput[] =>
  Array.from({ length: months }, (_, month) => {
    const salaryDate = addDays(beforeDate, -(month + 1) * 30 + 3)
    const cardDate = addDays(salaryDate, 10)
    return [
      {
        number: number(salaryDate, seqBase + month * 2),
        direction: "DEPOSIT" as const,
        amount: 2_850_000,
        occurredAt: `${salaryDate}T09:00:00`,
        counterpartyAccountId: 4001,
      },
      {
        number: number(cardDate, seqBase + month * 2 + 1),
        direction: "WITHDRAWAL" as const,
        amount: 640_000 + month * 21_000,
        occurredAt: `${cardDate}T12:30:00`,
        counterpartyAccountId: null,
      },
    ]
  }).flat()

import * as React from "react"
import { FileText, ScanText } from "lucide-react"
import {
  DOCUMENT_KIND_LABEL,
  OCR_STATUS_LABEL,
  labelOf,
  useAgentRuns,
  useDocumentContent,
  useDocumentOcr,
  useObjectionDocuments,
  useReviewDraft,
  type DraftClaim,
  type ObjectionDocument,
  type OcrPage,
} from "@/entities/payment-stop"
import { OcrOverlay } from "@/widgets/objection/ocr-overlay"
import { toErrorMessage } from "@/shared/api/api-error"
import { formatDateTime } from "@/shared/lib/format"
import { cn } from "@/shared/lib/utils"
import { Alert } from "@/shared/ui/alert"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataGrid, type DataGridColumn } from "@/shared/ui/data-grid"
import { Panel, PanelHeader } from "@/shared/ui/panel"

type Props = {
  objectionId: number
  /** 상세와 같은 조회 사유. 서류 내용 조회에 그대로 보낸다 */
  accessReason: string
}

type RegionRef = { documentId: number; index: number }

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`

const roundLabel = (round: number) => (round === 0 ? "접수" : `보완 ${round}회`)

const isIdCopy = (document: ObjectionDocument) => document.kind === "ID_COPY"

/** 판독 상태 칸. 신분증 사본은 판독하지 않는다(D37). */
const ocrStatusText = (document: ObjectionDocument) =>
  isIdCopy(document)
    ? "판독 안 함"
    : document.ocrStatus
      ? labelOf(OCR_STATUS_LABEL, document.ocrStatus)
      : "-"

/**
 * blob 을 그림 주소로 바꾼다. 주소는 blob 이 바뀌거나 화면을 떠날 때 돌려준다.
 * 테스트 환경(jsdom)에는 `URL.createObjectURL` 이 없어 그때는 그림 없이 둔다.
 */
const useObjectUrl = (blob: Blob | undefined) => {
  const url = React.useMemo(
    () =>
      blob && typeof URL.createObjectURL === "function"
        ? URL.createObjectURL(blob)
        : null,
    [blob],
  )
  React.useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )
  return url
}

const DocumentViewer = ({
  objectionId,
  accessReason,
  document,
  selectedIndex,
  linkedIndexes,
  onSelectRegion,
}: {
  objectionId: number
  accessReason: string
  document: ObjectionDocument
  selectedIndex: number | null
  linkedIndexes: Set<number>
  onSelectRegion: (index: number) => void
}) => {
  const content = useDocumentContent(
    objectionId,
    document.documentId,
    accessReason,
  )
  const { pages } = useDocumentOcr(
    objectionId,
    document.documentId,
    !isIdCopy(document) && document.ocrStatus === "DONE",
  )
  const url = useObjectUrl(content.data)
  const [isUnrenderable, setUnrenderable] = React.useState(false)
  // 그림 서류는 한 쪽이다. 영역 번호는 서류 전체에서 이어지므로 쪽을 넘겨도 번호로 찾는다.
  const page: OcrPage | undefined = pages?.[0]
  const allRegions = (pages ?? []).flatMap((item) => item.regions)
  const isPdf = document.contentType === "application/pdf"

  return (
    <div className="flex flex-col gap-2">
      <p className="flex flex-wrap items-center gap-2 text-base">
        <FileText className="h-4 w-4 text-ink-muted" aria-hidden />
        <span className="font-bold text-ink">{document.fileName}</span>
        <Badge variant={isIdCopy(document) ? "warning" : "neutral"}>
          {labelOf(DOCUMENT_KIND_LABEL, document.kind)}
        </Badge>
        {allRegions.length > 0 && (
          <span className="text-xs text-ink-muted">
            판독 영역 {allRegions.length}개
          </span>
        )}
      </p>
      {isIdCopy(document) && (
        <p className="text-xs text-ink-muted">
          신분증 사본은 판독하지 않고 AI 분석에도 보내지 않습니다.
        </p>
      )}
      {content.isError && (
        <Alert variant="danger">{toErrorMessage(content.error)}</Alert>
      )}
      {content.isPending && (
        <p className="py-6 text-center text-base text-ink-faint">
          서류를 불러오는 중
        </p>
      )}
      {url &&
        (isPdf && isUnrenderable ? (
          <Alert variant="info" title="PDF 미리보기 없음">
            이 화면은 PDF 첫 쪽을 그림으로 그리지 못합니다. 아래 판독 영역
            글자로 확인하거나{" "}
            <a
              href={url}
              download={document.fileName}
              className="text-link underline"
            >
              파일을 내려받아
            </a>{" "}
            확인하세요.
          </Alert>
        ) : page && !isPdf ? (
          <OcrOverlay
            src={url}
            alt={document.fileName}
            page={page}
            selectedIndex={selectedIndex}
            linkedIndexes={linkedIndexes}
            onSelect={onSelectRegion}
          />
        ) : (
          <img
            src={url}
            alt={document.fileName}
            className="block h-auto w-full border border-border"
            onError={() => setUnrenderable(true)}
          />
        ))}
      {allRegions.length > 0 && isPdf && (
        <ol
          className="flex flex-col gap-1 text-xs"
          aria-label={`${document.fileName} 판독 영역`}
        >
          {allRegions.map((region) => (
            <li key={region.index}>
              <button
                type="button"
                aria-pressed={region.index === selectedIndex}
                onClick={() => onSelectRegion(region.index)}
                className={cn(
                  "w-full border px-2 py-1 text-left",
                  region.index === selectedIndex
                    ? "border-primary bg-primary-tint"
                    : "border-border",
                )}
              >
                {region.index}. {region.text}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

const ClaimCard = ({
  claim,
  isSelected,
  onSelect,
}: {
  claim: DraftClaim
  isSelected: boolean
  onSelect: () => void
}) => {
  const fromDocument =
    claim.source === "DOCUMENT" &&
    claim.documentId != null &&
    claim.regionIndex != null
  const body = (
    <>
      <span className="flex items-center gap-1.5">
        <Badge variant={fromDocument ? "coolViolet" : "neutral"}>
          {fromDocument ? "서류" : "소명"}
        </Badge>
        <span className="font-bold text-ink">{claim.text}</span>
      </span>
      {claim.quote && (
        <span className="mt-1 block border-l-2 border-border pl-2 text-xs text-ink-muted">
          {claim.quote}
        </span>
      )}
      {fromDocument && (
        <span className="mt-1 flex items-center gap-1 text-2xs text-cool-violet">
          <ScanText className="h-3 w-3" aria-hidden />
          서류 {claim.documentId} 영역 {claim.regionIndex}
        </span>
      )}
    </>
  )
  const className = cn(
    "text-sm block w-full border px-3 py-2 text-left",
    isSelected ? "border-primary bg-primary-tint" : "border-border",
  )
  return fromDocument ? (
    <button
      type="button"
      className={cn(className, "hover:border-primary")}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}

/**
 * 첨부 서류와 판독 오버레이(계획 PA-12).
 *
 * 서류 목록에서 고른 서류를 상세와 같은 조회 사유로 받아 그리고, 판독 영역 상자를 겹친다.
 * AI 판정안의 주장 중 서류에서 나온 것(`source=DOCUMENT`)은 그 영역과 서로 이어진다 —
 * 주장 카드를 누르면 영역이, 영역을 누르면 주장 카드가 강조된다.
 */
export const DocumentEvidence = ({ objectionId, accessReason }: Props) => {
  const { documents, isPending, isError } = useObjectionDocuments(objectionId)
  const { latestRun } = useAgentRuns(objectionId)
  const { draft } = useReviewDraft(objectionId, latestRun)
  const [chosenId, setChosenId] = React.useState<number | null>(null)
  const [selected, setSelected] = React.useState<RegionRef | null>(null)

  const list = documents ?? []
  const active =
    list.find((document) => document.documentId === chosenId) ??
    list.find((document) => !isIdCopy(document)) ??
    list[0]
  const claims = draft?.claims ?? []
  const linkedIndexes = new Set(
    claims
      .filter(
        (claim) =>
          claim.source === "DOCUMENT" &&
          claim.documentId === active?.documentId &&
          claim.regionIndex != null,
      )
      .map((claim) => claim.regionIndex ?? -1),
  )

  const columns: DataGridColumn<ObjectionDocument>[] = [
    {
      key: "kind",
      header: "종류",
      width: 100,
      render: (row) => labelOf(DOCUMENT_KIND_LABEL, row.kind),
    },
    {
      key: "fileName",
      header: "파일",
      className: "whitespace-normal",
      render: (row) => row.fileName,
    },
    {
      key: "round",
      header: "회차",
      align: "center",
      width: 80,
      render: (row) => roundLabel(row.round),
    },
    {
      key: "size",
      header: "크기",
      align: "right",
      width: 80,
      render: (row) => formatSize(row.size),
    },
    {
      key: "ocrStatus",
      header: "판독",
      align: "center",
      width: 90,
      render: (row) => ocrStatusText(row),
    },
    {
      key: "uploadedAt",
      header: "올린 일시",
      align: "center",
      width: 160,
      render: (row) => (row.uploadedAt ? formatDateTime(row.uploadedAt) : "-"),
    },
    {
      key: "view",
      header: "보기",
      align: "center",
      width: 70,
      render: (row) => (
        <Button
          size="sm"
          variant={row.documentId === active?.documentId ? "primary" : "ghost"}
          aria-label={`${row.fileName} 보기`}
          aria-pressed={row.documentId === active?.documentId}
          onClick={() => {
            setChosenId(row.documentId)
            setSelected(null)
          }}
        >
          보기
        </Button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      <DataGrid
        columns={columns}
        rows={list}
        rowKey={(row) => String(row.documentId)}
        loading={isPending}
        emptyMessage={
          isError ? "서류 목록을 불러오지 못했습니다." : "첨부 서류가 없습니다."
        }
      />
      {active && (
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-4">
          <Panel aria-label="서류 보기">
            <div className="px-4 py-3">
              <DocumentViewer
                key={active.documentId}
                objectionId={objectionId}
                accessReason={accessReason}
                document={active}
                selectedIndex={
                  selected?.documentId === active.documentId
                    ? selected.index
                    : null
                }
                linkedIndexes={linkedIndexes}
                onSelectRegion={(index) =>
                  setSelected({ documentId: active.documentId, index })
                }
              />
            </div>
          </Panel>
          <Panel aria-label="주장 카드">
            <PanelHeader
              title="주장 카드"
              action={
                <span className="text-xs text-ink-muted">
                  AI 판정안 {claims.length}건
                </span>
              }
            />
            <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
              {claims.length === 0 ? (
                <p className="py-4 text-center text-base text-ink-faint">
                  AI 분석이 끝나면 주장이 표시됩니다.
                </p>
              ) : (
                claims.map((claim, index) => (
                  <ClaimCard
                    key={`${index}-${claim.text}`}
                    claim={claim}
                    isSelected={
                      selected != null &&
                      claim.source === "DOCUMENT" &&
                      claim.documentId === selected.documentId &&
                      claim.regionIndex === selected.index
                    }
                    onSelect={() => {
                      if (claim.documentId == null || claim.regionIndex == null)
                        return
                      setChosenId(claim.documentId)
                      setSelected({
                        documentId: claim.documentId,
                        index: claim.regionIndex,
                      })
                    }}
                  />
                ))
              )}
              <p className="text-2xs text-ink-faint">
                서류 주장을 누르면 그 글자 영역이, 영역을 누르면 그 주장이
                강조됩니다. 판독 글자는 가명 처리된 값입니다.
              </p>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}

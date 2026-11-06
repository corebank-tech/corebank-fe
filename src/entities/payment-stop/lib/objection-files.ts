import { formatFileSize } from "@/shared/lib/file-size"

/**
 * 이의제기 첨부 파일 규칙(이의제기 2차 계약 §5).
 *
 * 서버가 같은 규칙으로 다시 거부한다(`PST0007`). 화면이 먼저 보는 이유는 큰 파일을
 * 다 올린 뒤에야 거부를 알게 되는 일을 막기 위해서다. 형식은 확장자와 파일 앞 바이트
 * (매직 넘버)를 둘 다 본다. 확장자만 보면 이름만 바꾼 파일이 통과하고, 서버는
 * 바이트로 거부한다.
 */

const MB = 1024 * 1024

/** 파일 하나의 상한. */
export const MAX_FILE_BYTES = 10 * MB
/** 한 번에 내는 파일 전부의 합계 상한. 신분증 사본도 포함한다. */
export const MAX_TOTAL_BYTES = 30 * MB
/** 한 번에 내는 파일 개수 상한. 신분증 사본 1개를 포함해 10개다. */
export const MAX_FILE_COUNT = 10
/** 신청 때 증빙 서류 상한(신분증 사본 1개를 빼고). 보완 제출도 같다. */
export const MAX_EVIDENCE_COUNT = 9

/** `<input accept>` 값. 고르는 창에서 걸러 줄 뿐이라 검사는 따로 한다. */
export const OBJECTION_FILE_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"

export type ObjectionFileKind = "PDF" | "PNG" | "JPEG"

const EXTENSION_KIND: Record<string, ObjectionFileKind> = {
  pdf: "PDF",
  png: "PNG",
  jpg: "JPEG",
  jpeg: "JPEG",
}

/** 형식별 파일 앞 바이트. PDF `%PDF-`, PNG 8바이트 서명, JPEG SOI 와 첫 표지 */
const SIGNATURES: [ObjectionFileKind, number[]][] = [
  ["PDF", [0x25, 0x50, 0x44, 0x46, 0x2d]],
  ["PNG", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["JPEG", [0xff, 0xd8, 0xff]],
]

const SIGNATURE_LENGTH = 8

export const kindFromFileName = (name: string): ObjectionFileKind | null => {
  const dot = name.lastIndexOf(".")
  if (dot < 0) return null
  return EXTENSION_KIND[name.slice(dot + 1).toLowerCase()] ?? null
}

export const kindFromBytes = (bytes: Uint8Array): ObjectionFileKind | null => {
  const found = SIGNATURES.find(([, signature]) =>
    signature.every((byte, index) => bytes[index] === byte),
  )
  return found ? found[0] : null
}

/** 파일 앞 바이트를 읽어 형식을 본다. 전체를 읽지 않는다. */
export const readFileKind = async (
  file: Blob,
): Promise<ObjectionFileKind | null> => {
  const head = await file.slice(0, SIGNATURE_LENGTH).arrayBuffer()
  return kindFromBytes(new Uint8Array(head))
}

const ALLOWED_TYPES_TEXT = "PDF, PNG, JPG"

/**
 * 파일 하나를 검사한다. 문제가 없으면 `null`, 있으면 고객에게 보일 문구다.
 * 확장자, 크기를 먼저 보고 바이트는 마지막에 읽는다.
 */
export const inspectObjectionFile = async (
  file: File,
): Promise<string | null> => {
  const byName = kindFromFileName(file.name)
  if (byName == null) {
    return `${file.name}: ${ALLOWED_TYPES_TEXT} 파일만 올릴 수 있습니다.`
  }
  if (file.size === 0) {
    return `${file.name}: 내용이 없는 파일입니다. 파일을 다시 확인하세요.`
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name}: 파일 하나는 ${formatFileSize(MAX_FILE_BYTES)}까지 올릴 수 있습니다. 지금 ${formatFileSize(file.size)}입니다.`
  }
  const byBytes = await readFileKind(file)
  if (byBytes == null || byBytes !== byName) {
    return `${file.name}: 파일 내용이 ${ALLOWED_TYPES_TEXT} 형식이 아닙니다. 확장자만 바꾼 파일은 올릴 수 없습니다.`
  }
  return null
}

const totalBytes = (files: readonly File[]) =>
  files.reduce((sum, file) => sum + file.size, 0)

export type FileSelection = {
  /** 기존 파일 뒤에 받아들인 파일을 붙인 목록 */
  files: File[]
  /** 받지 않은 파일마다 한 줄. 비어 있으면 전부 받았다 */
  errors: string[]
}

/**
 * 고른 파일을 검사해 목록에 붙인다.
 *
 * 파일마다 형식과 크기를 보고, 통과한 파일만 개수 상한과 합계 상한 안에서 앞에서부터
 * 받는다. 넘치는 파일만 빼고 나머지는 받는다 — 한 개가 넘친다고 전부 버리면 고객이
 * 처음부터 다시 골라야 한다.
 *
 * @param otherFiles 같은 제출에 실리는 다른 칸의 파일. 합계와 개수에 함께 센다
 */
export const selectObjectionFiles = async ({
  current,
  incoming,
  maxCount,
  otherFiles = [],
}: {
  current: readonly File[]
  incoming: readonly File[]
  maxCount: number
  otherFiles?: readonly File[]
}): Promise<FileSelection> => {
  const problems = await Promise.all(incoming.map(inspectObjectionFile))
  const files = [...current]
  const errors: string[] = []
  let countExceeded = false

  incoming.forEach((file, index) => {
    const problem = problems[index]
    if (problem != null) {
      errors.push(problem)
      return
    }
    if (
      files.length >= maxCount ||
      files.length + otherFiles.length >= MAX_FILE_COUNT
    ) {
      countExceeded = true
      return
    }
    const nextTotal = totalBytes(files) + totalBytes(otherFiles) + file.size
    if (nextTotal > MAX_TOTAL_BYTES) {
      errors.push(
        `${file.name}: 첨부 파일 합계는 ${formatFileSize(MAX_TOTAL_BYTES)}까지입니다. 이 파일을 넣으면 ${formatFileSize(nextTotal)}입니다.`,
      )
      return
    }
    files.push(file)
  })

  if (countExceeded) {
    errors.push(
      `파일은 ${maxCount}개까지 올릴 수 있습니다. 넘는 파일은 넣지 않았습니다.`,
    )
  }
  return { files, errors }
}

/** 확인 화면과 제출 중 안내에 쓰는 합계. */
export const summarizeFiles = (files: readonly File[]) => ({
  count: files.length,
  totalBytes: totalBytes(files),
})

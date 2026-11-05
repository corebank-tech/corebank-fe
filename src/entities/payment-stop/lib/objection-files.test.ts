import { describe, expect, it } from "vitest"
import {
  MAX_FILE_BYTES,
  inspectObjectionFile,
  kindFromBytes,
  selectObjectionFiles,
} from "@/entities/payment-stop/lib/objection-files"

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PDF_HEAD = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]
const MB = 1024 * 1024

/** 앞 바이트만 진짜로 두고 크기는 덮어쓴다. 큰 파일을 실제로 만들지 않기 위해서다 */
const makeFile = (name: string, head: number[], size?: number) => {
  const file = new File([new Uint8Array([...head, 0, 0, 0, 0])], name)
  if (size != null) Object.defineProperty(file, "size", { value: size })
  return file
}

describe("kindFromBytes", () => {
  it("PDF, PNG, JPEG 서명을 알아본다", () => {
    expect(kindFromBytes(new Uint8Array(PDF_HEAD))).toBe("PDF")
    expect(kindFromBytes(new Uint8Array(PNG_HEAD))).toBe("PNG")
    expect(kindFromBytes(new Uint8Array(JPEG_HEAD))).toBe("JPEG")
    expect(kindFromBytes(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBeNull()
  })
})

describe("inspectObjectionFile", () => {
  it("허용 형식이고 내용이 확장자와 맞으면 통과한다", async () => {
    expect(await inspectObjectionFile(makeFile("a.PDF", PDF_HEAD))).toBeNull()
    expect(await inspectObjectionFile(makeFile("b.jpeg", JPEG_HEAD))).toBeNull()
    expect(await inspectObjectionFile(makeFile("c.jpg", JPEG_HEAD))).toBeNull()
  })

  it("허용하지 않는 확장자는 바이트를 읽기 전에 거부한다", async () => {
    expect(await inspectObjectionFile(makeFile("memo.txt", PDF_HEAD))).toMatch(
      "memo.txt: PDF, PNG, JPG 파일만",
    )
  })

  it("이름만 바꾼 파일은 매직 바이트로 거부한다", async () => {
    expect(
      await inspectObjectionFile(makeFile("scan.pdf", [0x50, 0x4b, 3, 4])),
    ).toMatch("확장자만 바꾼 파일")
    // 확장자와 내용 형식이 서로 다르면 둘 다 허용 형식이어도 거부한다
    expect(
      await inspectObjectionFile(makeFile("photo.png", JPEG_HEAD)),
    ).toMatch("확장자만 바꾼 파일")
  })

  it("10MB 를 넘거나 빈 파일이면 거부한다", async () => {
    expect(
      await inspectObjectionFile(
        makeFile("big.pdf", PDF_HEAD, MAX_FILE_BYTES + 1),
      ),
    ).toMatch("파일 하나는 10MB까지")
    expect(
      await inspectObjectionFile(makeFile("ok.pdf", PDF_HEAD, MAX_FILE_BYTES)),
    ).toBeNull()
    expect(await inspectObjectionFile(makeFile("empty.pdf", [], 0))).toMatch(
      "내용이 없는 파일",
    )
  })
})

describe("selectObjectionFiles", () => {
  it("개수 상한을 넘는 파일만 빼고 나머지는 받는다", async () => {
    const current = Array.from({ length: 8 }, (_, i) =>
      makeFile(`e${i}.png`, PNG_HEAD),
    )
    const result = await selectObjectionFiles({
      current,
      incoming: [makeFile("n1.png", PNG_HEAD), makeFile("n2.png", PNG_HEAD)],
      maxCount: 9,
    })
    expect(result.files.map((file) => file.name)).toContain("n1.png")
    expect(result.files).toHaveLength(9)
    expect(result.errors).toEqual([
      "파일은 9개까지 올릴 수 있습니다. 넘는 파일은 넣지 않았습니다.",
    ])
  })

  it("다른 칸의 파일까지 합쳐 30MB 를 넘으면 그 파일을 받지 않는다", async () => {
    const idCopy = makeFile("id.png", PNG_HEAD, 9 * MB)
    const result = await selectObjectionFiles({
      current: [makeFile("a.pdf", PDF_HEAD, 9 * MB)],
      incoming: [
        makeFile("b.pdf", PDF_HEAD, 9 * MB),
        makeFile("c.pdf", PDF_HEAD, 4 * MB),
      ],
      maxCount: 9,
      otherFiles: [idCopy],
    })
    expect(result.files.map((file) => file.name)).toEqual(["a.pdf", "b.pdf"])
    expect(result.errors).toEqual([
      "c.pdf: 첨부 파일 합계는 30MB까지입니다. 이 파일을 넣으면 31MB입니다.",
    ])
  })
})

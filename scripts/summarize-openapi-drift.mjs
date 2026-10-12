import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

/**
 * 갱신된 스냅샷과 커밋된 스냅샷을 비교해 바뀐 엔드포인트·스키마를 적는다.
 *
 * "스펙이 바뀌었다"만 알리면 받는 사람이 9천 줄 diff 를 직접 읽어야 한다.
 * 무엇이 바뀌었는지가 있어야 반영 범위를 바로 가늠할 수 있다.
 */
const SNAPSHOT_PATH = "openapi.snapshot.json"

const committed = JSON.parse(
  execFileSync("git", ["show", `HEAD:${SNAPSHOT_PATH}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  }),
)
const current = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"))

/** 추가 · 삭제 · 변경을 나눠 센다. 변경 판정은 직렬화 결과 비교로 한다. */
const compare = (before = {}, after = {}) => {
  const beforeKeys = Object.keys(before)
  const afterKeys = Object.keys(after)
  return {
    added: afterKeys.filter((key) => !(key in before)),
    removed: beforeKeys.filter((key) => !(key in after)),
    changed: afterKeys.filter(
      (key) =>
        key in before &&
        JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    ),
  }
}

const paths = compare(committed.paths, current.paths)
const schemas = compare(
  committed.components?.schemas,
  current.components?.schemas,
)

const section = (title, diff) => {
  const lines = [
    ...diff.added.map((key) => `+ ${key}`),
    ...diff.removed.map((key) => `- ${key}`),
    ...diff.changed.map((key) => `~ ${key}`),
  ]
  if (lines.length === 0) return []
  return [`### ${title}`, "", "```", ...lines, "```", ""]
}

const out = [
  "## 스냅샷이 서버 스펙과 어긋났습니다",
  "",
  `감지: ${new Date().toISOString()}`,
  "",
  "`+` 추가 · `-` 삭제 · `~` 변경",
  "",
  ...section("엔드포인트", paths),
  ...section("스키마", schemas),
  "### 반영",
  "",
  "```bash",
  "pnpm snapshot:update",
  "pnpm codegen",
  "pnpm check",
  "```",
  "",
  "타입이 바뀌어 깨진 호출부는 **같은 PR 에서 함께 고친다.**",
  "스냅샷만 올리면 `dev` 가 빨개진다 — `docs/api-codegen.md` 참고.",
]

console.log(out.join("\n"))

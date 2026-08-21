import * as React from "react"
import { ChevronsUpDown, ChevronUp, ChevronDown } from "lucide-react"
import { Checkbox } from "@/shared/ui/checkbox"
import { Skeleton } from "@/shared/ui/skeleton"
import { EmptyState } from "@/shared/ui/empty-state"
import { cn } from "@/shared/lib/utils"

type Align = "left" | "right" | "center"

export type DataGridColumn<Row> = {
  key: string
  header: React.ReactNode
  align?: Align
  sortable?: boolean
  /** Fixed column width in px. */
  width?: number
  /** Cell renderer. Falls back to the raw value at `key`. */
  render?: (row: Row, rowIndex: number) => React.ReactNode
  /** Comparable value used when this column is sorted. */
  sortValue?: (row: Row) => string | number
  className?: string
}

type DataGridProps<Row> = {
  columns: DataGridColumn<Row>[]
  rows: Row[]
  loading?: boolean
  emptyMessage?: string
  selectable?: boolean
  /**
   * 선택 상태를 부모가 소유할 때 넘긴다. 넘기지 않으면 그리드가 내부에서
   * 관리한다 — rows가 바뀌어도 내부 Set은 그대로라 부모가 들고 있는 선택
   * 목록과 어긋날 수 있으므로, 서버 페이지네이션처럼 rows가 갈리는 화면은
   * 이 prop으로 넘기는 쪽을 쓴다.
   */
  selectedKeys?: string[]
  onSelectionChange?: (selectedKeys: string[]) => void
  /** Stable row identity. Defaults to the row index. */
  rowKey?: (row: Row, index: number) => string
  /** Number of skeleton rows while loading. */
  skeletonRows?: number
  hoverable?: boolean
  rowClassName?: (row: Row, index: number) => string | undefined
}

const SELECT_COLUMN_WIDTH_PX = 44

const ALIGN_CLASSES: Record<Align, string> = {
  left: "justify-start text-left",
  right: "justify-end text-right",
  center: "justify-center text-center",
}

export const DataGrid = <Row,>({
  columns,
  rows,
  loading = false,
  emptyMessage = "조회 결과가 없습니다.",
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowKey,
  rowClassName,
  skeletonRows = 6,
  hoverable = true,
}: DataGridProps<Row>) => {
  const [sort, setSort] = React.useState<{
    key: string
    dir: "asc" | "desc"
  } | null>(null)
  const [uncontrolledSelected, setUncontrolledSelected] = React.useState<
    Set<string>
  >(new Set())
  const controlled = selectedKeys != null
  const selected = React.useMemo(
    () => (controlled ? new Set(selectedKeys) : uncontrolledSelected),
    [controlled, selectedKeys, uncontrolledSelected],
  )

  const keyOf = React.useCallback(
    (row: Row, index: number) => rowKey?.(row, index) ?? String(index),
    [rowKey],
  )

  const sortedRows = React.useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return rows
    const getVal = col.sortValue
    return [...rows].sort((a, b) => {
      const av = getVal(a)
      const bv = getVal(b)
      if (av < bv) return sort.dir === "asc" ? -1 : 1
      if (av > bv) return sort.dir === "asc" ? 1 : -1
      return 0
    })
  }, [rows, sort, columns])

  const emitSelection = (next: Set<string>) => {
    if (!controlled) setUncontrolledSelected(next)
    onSelectionChange?.(Array.from(next))
  }

  const allKeys = sortedRows.map((r, i) => keyOf(r, i))
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k))

  // 로딩 중에는 본문이 스켈레톤이지만 rows는 아직 이전 응답이다(keepPreviousData).
  // 그대로 전체 선택을 허용하면 화면에 보이지 않는 이전 페이지의 행이 선택된다.
  const toggleAll = () => {
    if (loading) return
    emitSelection(allSelected ? new Set() : new Set(allKeys))
  }

  const toggleOne = (key: string) => {
    const next = new Set(selected)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    emitSelection(next)
  }

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "asc" }
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" }
    })
  }

  const totalCols = columns.length + (selectable ? 1 : 0)

  return (
    <div className="overflow-x-auto border-t-2 border-b border-border border-t-navy">
      <table className="w-full border-collapse text-base">
        <colgroup>
          {selectable && <col style={{ width: SELECT_COLUMN_WIDTH_PX }} />}
          {columns.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>

        <thead>
          <tr className="bg-surface">
            {selectable && (
              <th className="border-b border-border px-3 py-2.5">
                <div className="flex items-center justify-center">
                  <Checkbox
                    aria-label="전체 선택"
                    checked={allSelected && !loading}
                    disabled={loading}
                    onChange={toggleAll}
                  />
                </div>
              </th>
            )}
            {columns.map((col) => {
              const active = sort?.key === col.key
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={
                    active
                      ? sort?.dir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  className={cn(
                    "border-r border-b border-border px-3 py-2.5 text-base font-bold whitespace-nowrap text-ink last:border-r-0",
                    ALIGN_CLASSES[col.align ?? "left"],
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cn(
                        "inline-flex items-center gap-1 font-bold hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        col.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {col.header}
                      {active ? (
                        sort?.dir === "asc" ? (
                          <ChevronUp
                            className="h-3.5 w-3.5 text-primary"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronDown
                            className="h-3.5 w-3.5 text-primary"
                            aria-hidden="true"
                          />
                        )
                      ) : (
                        <ChevronsUpDown
                          className="h-3.5 w-3.5 text-ink-faint"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {selectable && (
                  <td className="border-b border-border px-3 py-2.5">
                    <Skeleton className="mx-auto h-4.5 w-4.5" />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="border-r border-b border-border px-3 py-2.5 last:border-r-0"
                  >
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : sortedRows.length === 0 ? (
            <tr>
              <td colSpan={totalCols} className="p-0">
                <EmptyState message={emptyMessage} />
              </td>
            </tr>
          ) : (
            sortedRows.map((row, i) => {
              const key = keyOf(row, i)
              const isSelected = selected.has(key)
              return (
                <tr
                  key={key}
                  className={cn(
                    hoverable && "hover:bg-surface",
                    isSelected &&
                      cn(
                        "bg-primary-tint",
                        hoverable && "hover:bg-primary-tint",
                      ),
                    rowClassName?.(row, i),
                  )}
                >
                  {selectable && (
                    <td className="border-b border-border px-3 py-2.5">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          aria-label={`${i + 1}행 선택`}
                          checked={isSelected}
                          onChange={() => toggleOne(key)}
                        />
                      </div>
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "border-r border-b border-border px-3 py-2.5 text-base whitespace-nowrap text-ink last:border-r-0",
                        ALIGN_CLASSES[col.align ?? "left"],
                        col.className,
                      )}
                    >
                      {col.render
                        ? col.render(row, i)
                        : ((row as Record<string, React.ReactNode>)[col.key] ??
                          null)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

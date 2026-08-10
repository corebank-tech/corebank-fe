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
  onSelectionChange?: (selectedKeys: string[]) => void
  /** Stable row identity. Defaults to the row index. */
  rowKey?: (row: Row, index: number) => string
  /** Number of skeleton rows while loading. */
  skeletonRows?: number
  hoverable?: boolean
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
  onSelectionChange,
  rowKey,
  skeletonRows = 6,
  hoverable = true,
}: DataGridProps<Row>) => {
  const [sort, setSort] = React.useState<{
    key: string
    dir: "asc" | "desc"
  } | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

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
    setSelected(next)
    onSelectionChange?.(Array.from(next))
  }

  const allKeys = sortedRows.map((r, i) => keyOf(r, i))
  const allSelected =
    allKeys.length > 0 && allKeys.every((k) => selected.has(k))

  const toggleAll = () => {
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
      <table className="w-full border-collapse text-[14px]">
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
                    checked={allSelected}
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
                    "border-r border-b border-border px-3 py-2.5 text-[14px] font-bold whitespace-nowrap text-ink last:border-r-0",
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
                        "border-r border-b border-border px-3 py-2.5 text-[14px] whitespace-nowrap text-ink last:border-r-0",
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

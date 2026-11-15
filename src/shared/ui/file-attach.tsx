import * as React from "react"
import { FileText, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { formatFileSize } from "@/shared/lib/file-size"
import { Spinner } from "@/shared/ui/spinner"

type FileAttachProps = {
  id: string
  /** 칸 이름. 파일 선택 입력의 접근 가능한 이름이 `"{label} 파일 선택"` 이 된다 */
  label: string
  files: readonly File[]
  /**
   * 고른 파일. 검사와 목록 합치기는 호출자가 한다. 검사 중에 또 골라도 넘기므로
   * 호출자는 검사가 겹쳐도 최신 목록에 합쳐야 한다
   */
  onSelect: (files: File[]) => void
  onRemove: (index: number) => void
  multiple?: boolean
  accept?: string
  disabled?: boolean
  /** 고른 파일을 검사하는 중 */
  busy?: boolean
  hint?: React.ReactNode
  /** 받지 않은 파일이나 빠진 파일 안내. 한 줄에 하나 */
  errors?: readonly string[]
  required?: boolean
}

/**
 * 파일 첨부 칸. 파일 선택 버튼, 첨부 목록, 파일별 삭제, 오류 안내를 묶는다.
 *
 * 선택 입력은 네이티브 `<input type="file">` 를 화면에서만 감추고 그대로 둔다. Tab 으로
 * 닿고 Enter 나 Space 로 고르는 창이 열리며, 그 위의 `label` 이 버튼 모양과 초점 표시를
 * 맡는다. 같은 파일을 지웠다가 다시 고를 수 있게 고른 뒤 값을 비운다.
 */
export const FileAttach = ({
  id,
  label,
  files,
  onSelect,
  onRemove,
  multiple = false,
  accept,
  disabled = false,
  busy = false,
  hint,
  errors = [],
  required = false,
}: FileAttachProps) => {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const hasError = errors.length > 0
  const describedBy =
    [hint != null ? hintId : null, hasError ? errorId : null]
      .filter((value) => value != null)
      .join(" ") || undefined

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? [])
    event.target.value = ""
    // 검사 중이라고 버리지 않는다. 버리면 고른 파일이 안내 없이 사라진다
    if (picked.length > 0) onSelect(picked)
  }

  const handleRemove = (index: number) => {
    onRemove(index)
    // 지운 버튼이 사라지면 초점이 문서 처음으로 튄다. 선택 입력으로 돌려놓는다.
    inputRef.current?.focus()
  }

  const inactive = disabled || busy

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="peer sr-only"
          multiple={multiple}
          accept={accept}
          // 검사 중에도 막지 않는다. 초점이 있는 입력을 막으면 초점이 문서 처음으로 튄다
          disabled={disabled}
          aria-label={`${label} 파일 선택`}
          aria-describedby={describedBy}
          aria-invalid={hasError || undefined}
          aria-required={required || undefined}
          onChange={handleChange}
        />
        <label
          htmlFor={id}
          aria-hidden="true"
          className={cn(
            "inline-flex h-10 shrink-0 items-center justify-center rounded-md border px-4 text-base font-bold whitespace-nowrap transition-colors",
            "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1",
            disabled
              ? "cursor-not-allowed border-border bg-surface text-ink-faint"
              : "cursor-pointer border-primary bg-surface-elevated text-primary hover:bg-primary-tint",
          )}
        >
          {multiple
            ? "파일 추가"
            : files.length > 0
              ? "파일 바꾸기"
              : "파일 선택"}
        </label>
        {busy && (
          <span
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted"
            role="status"
          >
            <Spinner size="sm" />
            파일을 확인하는 중입니다.
          </span>
        )}
      </div>

      {hint != null && (
        <p id={hintId} className="text-2xs text-ink-muted">
          {hint}
        </p>
      )}

      {files.length > 0 && (
        <ul
          aria-label={`${label} 첨부 목록`}
          className="flex flex-col divide-y divide-border border border-border"
        >
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 bg-surface-elevated px-3 py-2"
            >
              <FileText
                className="h-4 w-4 shrink-0 text-ink-muted"
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1 truncate text-base text-ink">
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-ink-muted">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:text-ink-faint"
                aria-label={`${file.name} 삭제`}
                disabled={inactive}
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasError && (
        <div id={errorId} role="alert" className="flex flex-col gap-0.5">
          {errors.map((message) => (
            <p key={message} className="text-2xs text-danger">
              {message}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

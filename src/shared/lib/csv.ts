/**
 * Client-side CSV export. No network calls — builds a Blob from rows already
 * held in memory and triggers a browser download (REQ-INQR-015).
 */
function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: string[][],
): void {
  const lines = [headers, ...rows].map((line) =>
    line.map(escapeCsvCell).join(","),
  )
  const csv = "﻿" + lines.join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

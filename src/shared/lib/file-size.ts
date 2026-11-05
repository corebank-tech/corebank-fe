const KB = 1024
const MB = 1024 * KB

/**
 * 파일 크기 표기. 1MB 이상은 소수 한 자리 MB, 그 아래는 KB 로 올림한다.
 * 0바이트가 아닌 파일은 0KB 로 보이지 않게 최소 1KB 다.
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes >= MB) {
    const value = Math.round((bytes / MB) * 10) / 10
    return `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}MB`
  }
  if (bytes === 0) return "0KB"
  return `${Math.max(1, Math.ceil(bytes / KB))}KB`
}

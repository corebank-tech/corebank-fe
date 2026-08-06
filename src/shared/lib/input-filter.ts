/** 숫자 입력 필드에서 숫자가 아닌 문자를 제거하고 최대 길이로 자른다. */
export function onlyDigits(value: string, maxLength: number): string {
  return value.replace(/\D/g, "").slice(0, maxLength)
}

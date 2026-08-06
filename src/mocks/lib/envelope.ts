import { HttpResponse } from "msw"

const SUCCESS_CODE = "0000"
const SUCCESS_MESSAGE = "정상 처리되었습니다."

/** REQ-CMN-007 공통 봉투로 감싼 성공 응답. */
export const ok = <TData>(data: TData) =>
  HttpResponse.json({ code: SUCCESS_CODE, message: SUCCESS_MESSAGE, data })

/** REQ-CMN-007 공통 봉투로 감싼 오류 응답. */
export const fail = (code: string, message: string, status: number) =>
  HttpResponse.json({ code, message, data: null }, { status })

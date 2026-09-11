import { HttpResponse } from "msw"

const SUCCESS_CODE = "0000"
const SUCCESS_MESSAGE = "정상 처리되었습니다."

/** REQ-CMN-007 공통 봉투로 감싼 성공 응답. */
export const ok = <TData>(data: TData) =>
  HttpResponse.json({ code: SUCCESS_CODE, message: SUCCESS_MESSAGE, data })

/**
 * data 를 실은 오류 응답. 계좌비밀번호·OTP 처럼 실패 응답에 누적 오류 횟수를 싣는
 * 엔드포인트가 쓴다(화면은 `shared/api/attempt-failure-data` 로 읽는다).
 */
export const failWithData = (
  code: string,
  message: string,
  status: number,
  data: unknown,
) => HttpResponse.json({ code, message, data }, { status })

/** REQ-CMN-007 공통 봉투로 감싼 오류 응답. */
export const fail = (code: string, message: string, status: number) =>
  failWithData(code, message, status, null)

import { customFetch } from "@/shared/api/custom-fetch"
import { useGetInterbankBanks } from "@/shared/api/generated"

/**
 * D-01 입금은행 목록(FE B-8). 서버가 `bankCode` 오름차순으로 준다. 당행(088)은 목록에
 * 없다 — 당행 선택지는 화면이 붙인다(서버 interbank_transfer_fe_handoff.md §3).
 */
export const useInterbankBanksQuery = () => useGetInterbankBanks()

/**
 * 임시 래퍼 — corebank-server#680(타행 수취인 조회, 전문 `PYE001`)이 스펙에 올라오면
 * 생성 코드로 바꾸고 이 타입과 함수를 지운다. 화면은 `fetchPayeeFor` 만 부르므로
 * 바꿀 곳은 이 파일뿐이다.
 *
 * 모양은 #680 에서 합의한 것이다. 오류는 `TRF0201`(계좌 없음)·`TRF0301`(정지·해지)·
 * `TRF0006`·`TRF0007`(요청 형식), 상대 은행 무응답·장애는 `TRF0309`(409)다.
 */
type InterbankPayeeResponse = {
  /** 마스킹된 예금주명. 당행 `PayeeResponse.payeeName` 과 같은 규칙. */
  payeeName?: string
}

export const fetchInterbankPayee = (
  bankCode: string,
  accountNumber: string,
): Promise<InterbankPayeeResponse> =>
  customFetch<InterbankPayeeResponse>(
    `/transfers/interbank/payee?${new URLSearchParams({ bankCode, accountNumber })}`,
    { method: "GET" },
  )

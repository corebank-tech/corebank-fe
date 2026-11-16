# FDS 행동 흐름 및 관리자 조치 계약

## 책임 경계

- FE는 행동 이벤트를 순서대로 수집·전송하며 `backCount`, `hesitationWarning`, 정책 A/B를 판정하지 않는다.
- BE는 `backCount >= 2`, `amountRevisionCount >= 2`, `confirmActiveSeconds >= 60` 중 2개 이상이면 망설임으로 판정한다.
- 화면은 BE 응답의 `hesitationWarning`과 `policyCode`를 표시한다. fixture의 판정값도 서버 응답을 흉내 낸 값이지 FE 계산 결과가 아니다.

## STEP_BACK과 flowId

- D-02 확인 화면에서 D-01 입력 화면으로 실제 복귀할 때 `CONFIRM_LEAVE` 다음 `STEP_BACK`을 한 번 보낸다.
- 화면의 이전 버튼과 브라우저 뒤로가기는 같은 `returnToInput` 함수로 합쳐진다. 열린 확인 구간을 닫은 최초 호출만 이벤트를 추가하므로 라우터 이벤트가 겹쳐도 중복되지 않는다.
- 확인 화면에 다시 들어간 뒤 다시 복귀하면 새 확인 구간이므로 두 번째 `STEP_BACK`을 보낸다.
- 새 이체를 시작할 때 새 `flowId`를 만들고, 동일 이체의 재렌더링과 입력 수정에서는 유지한다. `backCount` 계산값은 요청에 싣지 않는다.

## 시간과 금액 수정

- 확인 활성 시간은 페이지가 visible인 `CONFIRM_ENTER`~`CONFIRM_LEAVE` 구간만 `performance.now()`로 합산하고 마지막 제출 배치에서 초 단위로 내림한다.
- 키 입력마다 `AMOUNT_EDITED`를 만들지 않는다. 이전에 확인 화면에서 확정한 금액과 다음 확인 진입 금액이 달라졌을 때 한 번 기록한다.
- `SUBMIT_REQUESTED` 전에는 열린 확인 구간을 `CONFIRM_LEAVE`로 닫는다.

## 시연 fixture

- 정책 A: 두 번의 확인→입력 복귀와 두 번의 확정 금액 변경을 포함하며 서버 판정값은 `backCount=2`, `amountRevisionCount=2`, `confirmActiveSeconds=65`, `hesitationWarning=true`, `policyCode=A`이다.
- 정책 B: 망설임 정책과 독립이며 기존 반복 이체 시나리오를 유지한다.

## 관리자 조치

| 조치 | 표시 사유 | API |
| --- | --- | --- |
| 일반 거절 | `CUSTOMER_DENIED` | `POST /admin/fds/holds/{id}/reject` |
| 위험 계좌 일치 거절 | `RISK_ACCOUNT_MATCH` | `POST /admin/fds/holds/{id}/reject` |
| 사기 확정 및 거절 | `FRAUD_CONFIRMED` | `POST /admin/fds/holds/{id}/fraud-reject` |

`FRAUD_CONFIRMED`는 일반 reject DTO의 `reasonCode`에 넣지 않는다. 승인·거절 뒤 완료 화면이나 별도 페이지 분기는 이 변경 범위에 포함하지 않는다.

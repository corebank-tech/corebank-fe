export type NavItem = {
  label: string
  /** 요구사항정의서 화면목록 기준 화면ID (추적성 대조용) */
  screenId: string
  /** 라우팅 경로 */
  path: string
}

export type NavGroup = {
  title: string
  items: NavItem[]
}

export type NavCategory = {
  id: string
  label: string
  groups: NavGroup[]
}

export const NAV: NavCategory[] = [
  {
    id: "inquiry",
    label: "조회",
    groups: [
      {
        title: "계좌조회",
        items: [
          { label: "전체계좌조회", screenId: "B-01", path: "/accounts" },
          {
            label: "예금/적금 계좌조회",
            screenId: "B-02",
            path: "/accounts/deposits",
          },
          { label: "거래내역조회", screenId: "B-03", path: "/inquiry" },
        ],
      },
    ],
  },
  {
    id: "transfer",
    label: "이체",
    groups: [
      {
        title: "즉시이체",
        items: [
          { label: "당행이체", screenId: "D-01", path: "/instant-transfer" },
          {
            label: "이체결과조회",
            screenId: "D-04",
            path: "/transfer/history",
          },
        ],
      },
      {
        title: "예약이체",
        items: [
          {
            label: "예약이체 등록",
            screenId: "E-01",
            path: "/transfer/reservation/new",
          },
          {
            label: "예약이체 조회/취소",
            screenId: "E-04",
            path: "/transfer/reservation",
          },
          {
            label: "예약이체 처리결과 조회",
            screenId: "E-05",
            path: "/transfer/reservation/history",
          },
        ],
      },
      {
        title: "자동이체",
        items: [
          {
            label: "자동이체 등록",
            screenId: "G-01",
            path: "/transfer/auto/new",
          },
          {
            label: "자동이체 조회/변경/해지",
            screenId: "G-04",
            path: "/transfer/auto",
          },
          {
            label: "자동이체결과 조회",
            screenId: "G-05",
            path: "/transfer/auto/history",
          },
        ],
      },
    ],
  },
  {
    id: "product",
    label: "금융상품",
    groups: [
      {
        title: "예금/적금",
        items: [
          { label: "상품목록", screenId: "C-01", path: "/products" },
          { label: "상품상세", screenId: "C-02", path: "/products/P001" },
        ],
      },
    ],
  },
  {
    id: "user",
    label: "사용자관리",
    groups: [
      {
        title: "개인정보",
        items: [
          { label: "고객정보 관리", screenId: "F-01", path: "/user/profile" },
        ],
      },
      {
        title: "계좌관리",
        items: [
          {
            label: "계좌비밀번호 변경",
            screenId: "B-04",
            path: "/user/accounts/password",
          },
          {
            label: "출금계좌관리",
            screenId: "B-05",
            path: "/user/accounts/withdrawal",
          },
          {
            label: "계좌별명 관리",
            screenId: "B-06",
            path: "/user/accounts/alias",
          },
          {
            label: "계좌순서 변경",
            screenId: "B-07",
            path: "/user/accounts/order",
          },
        ],
      },
      {
        title: "이체설정",
        items: [
          {
            label: "이체한도 관리",
            screenId: "D-05",
            path: "/user/transfer-limit",
          },
        ],
      },
    ],
  },
]

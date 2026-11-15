/** 거래 번호 묶음. 번호가 길어 글자 폭이 고른 서체로 칸을 나눠 보인다. */
export const TransactionNumberList = ({ numbers }: { numbers: string[] }) => (
  <span className="flex flex-wrap gap-1">
    {numbers.map((number) => (
      <code
        key={number}
        className="rounded-sm border border-border bg-surface-elevated px-1 font-mono text-2xs text-ink"
      >
        {number}
      </code>
    ))}
  </span>
)

import type { DocumentField, OcrBox } from "@/pages/demo-objection/model"
import { cn } from "@/shared/lib/utils"

/**
 * 고객이 첨부한 서류 이미지 위에 OCR 이 읽은 글자 영역을 겹쳐 그린다.
 * 박스 좌표는 이미지 크기 대비 비율이라 화면 크기와 상관없이 같은 자리에 붙는다.
 */
export const DocImage = ({
  src,
  boxes,
  fields,
  read,
  animate,
  hovered,
  onHover,
  className,
}: {
  src: string
  boxes: OcrBox[]
  fields: DocumentField[]
  /** 읽은 것으로 표시할 영역 */
  read: Set<string>
  /** 박스를 하나씩 차례로 켠다 */
  animate?: boolean
  hovered?: string
  onHover?: (id?: string) => void
  className?: string
}) => (
  <div className={cn("relative inline-block", className)}>
    <img
      src={src}
      alt="첨부 서류(시연용 견본)"
      className="block h-full w-auto border border-border-strong"
    />
    {boxes
      .filter((b) => read.has(b.id))
      .map((b, i) => {
        const f = fields.find((x) => x.id === b.id)
        return (
          <div
            key={b.id}
            onMouseEnter={() => onHover?.(b.id)}
            onMouseLeave={() => onHover?.(undefined)}
            className={cn(
              "absolute",
              animate ? "demo-ocr" : "outline-2 outline-[var(--demo-series-1)]",
              hovered === b.id && "bg-[#fff4e5]/60",
            )}
            style={{
              left: `${(b.x - 0.006) * 100}%`,
              top: `${(b.y - 0.004) * 100}%`,
              width: `${(b.w + 0.012) * 100}%`,
              height: `${(b.h + 0.008) * 100}%`,
              animationDelay: animate ? `${i * 450}ms` : undefined,
            }}
          >
            {f && (
              <span className="absolute top-1/2 left-full ml-1 -translate-y-1/2 bg-[var(--demo-series-1)] px-1 font-sans text-[10px] leading-4 font-bold whitespace-nowrap text-white">
                OCR {f.confidence.toFixed(2)}
              </span>
            )}
          </div>
        )
      })}
  </div>
)

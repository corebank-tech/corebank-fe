import * as React from "react"
import { Chip } from "@/shared/ui/chip"
import { TokenGallery } from "@/pages/design-system/token-gallery"
import { PrimitiveGallery } from "@/pages/design-system/primitive-gallery"
import { CompositionGallery } from "@/pages/design-system/composition-gallery"
import { PatternGallery } from "@/pages/design-system/pattern-gallery"
import { ModalFamilyGallery } from "@/pages/design-system/modal-family-gallery"

type TabId = "tokens" | "primitives" | "compositions" | "patterns"

const TABS: { id: TabId; label: string }[] = [
  { id: "tokens", label: "토큰" },
  { id: "primitives", label: "프리미티브" },
  { id: "compositions", label: "조합" },
  { id: "patterns", label: "패턴" },
]

/**
 * 개발자가 화면을 새로 만들 때 참조하는 실물 카탈로그. 토큰 값·컴포넌트 variant를
 * 실제로 렌더링해 보여준다 — 문서가 아니라 코드가 최신 상태를 보장한다.
 * 과거 `/dialogs`(feedback-demo.tsx)·`/result`(result-demo.tsx) 데모 라우트를 흡수했다.
 */
export const DesignSystemPage = () => {
  const [tab, setTab] = React.useState<TabId>("tokens")

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Chip
            key={t.id}
            tone={tab === t.id ? "active" : "default"}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {tab === "tokens" && <TokenGallery />}
      {tab === "primitives" && <PrimitiveGallery />}
      {tab === "compositions" && (
        <div className="flex flex-col gap-8">
          <ModalFamilyGallery />
          <CompositionGallery />
        </div>
      )}
      {tab === "patterns" && <PatternGallery />}
    </div>
  )
}

import { ArrowUp } from "lucide-react"
import { IconButton } from "@/shared/ui/icon-button"
import { Divider } from "@/shared/ui/divider"
import {
  CUSTOMER_CENTER_PHONE,
  CUSTOMER_CENTER_HOURS,
} from "@/shared/config/contact"

const FOOTER_LINKS = [
  "개인정보처리방침",
  "이용약관",
  "전자금융거래 이용약관",
  "이메일무단수집거부",
  "보안센터",
  "사이트맵",
]

export const Footer = () => {
  const scrollTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  return (
    <footer className="mt-12 border-t border-footer-divider bg-footer-bg text-footer-fg">
      <div className="mx-auto w-320 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {FOOTER_LINKS.map((link, i) => (
                <li key={link} className="flex items-center gap-4">
                  <a
                    href="#"
                    className="text-base text-footer-fg hover:text-footer-fg-strong hover:underline"
                  >
                    {link}
                  </a>
                  {i < FOOTER_LINKS.length - 1 && (
                    <Divider tone="footer-divider" />
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col gap-1 text-xs text-footer-fg-faint">
              <p>
                <span className="font-bold text-footer-fg-strong">
                  {`고객센터 ${CUSTOMER_CENTER_PHONE}`}
                </span>
                <span className="ml-2">
                  {`${CUSTOMER_CENTER_HOURS} (주말·공휴일 휴무)`}
                </span>
              </p>
              <p>서울특별시 중구 코어대로 100, CoreBank Tower</p>
              <p>
                &copy; {new Date().getFullYear()} CoreBank. All rights reserved.
              </p>
            </div>
          </div>

          <IconButton
            shape="circle"
            size="lg"
            onClick={scrollTop}
            className="border border-footer-divider text-footer-fg-strong hover:bg-footer-hover-bg focus-visible:ring-footer-fg-strong"
            aria-label="맨 위로 이동"
          >
            <ArrowUp className="h-5 w-5" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </footer>
  )
}

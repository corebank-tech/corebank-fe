/**
 * 시연용 제출 서류 이미지 생성기. 내용은 전부 가상이고 모든 이미지에 「시연용 견본」을 넣는다.
 * 신분증은 실물처럼 그리지 않고 가림 처리한 자리표시로만 만든다(공문서 모사 금지).
 * OCR 박스 위치는 렌더링한 요소의 좌표를 이미지 기준 비율로 저장한다.
 * 실행: node scripts/demo-docs/render.mjs  → public/demo-objection/*.png, src/pages/demo-objection/docs/*.ocr.json
 */
/* global document, innerWidth, innerHeight -- page.evaluate 와 $$eval 콜백은 브라우저 안에서 실행된다 */
import { chromium } from "@playwright/test"
import { writeFileSync } from "node:fs"

const OUT = new URL("../../public/demo-objection/", import.meta.url).pathname
const BOXES = new URL("../../src/pages/demo-objection/docs/", import.meta.url)
  .pathname
const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&family=Nanum+Pen+Script&family=Noto+Sans+KR:wght@400;700&display=block" rel="stylesheet">`

const WATERMARK = `<div class="wm">시연용 견본</div>`
const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { background: #d9d6cf; width: 1240px; height: 1754px; display: flex; align-items: center; justify-content: center }
  .paper { position: relative; width: 1120px; height: 1620px; background: #fbfaf6; padding: 90px 96px;
    font-family: 'Nanum Myeongjo', serif; color: #1d1d1b; transform: rotate(-0.7deg);
    box-shadow: 0 6px 18px rgba(0,0,0,.25); overflow: hidden }
  .paper::after { content: ""; position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(circle at 15% 10%, rgba(0,0,0,.035), transparent 40%), radial-gradient(circle at 90% 95%, rgba(0,0,0,.05), transparent 45%);
    filter: url(#noise) }
  .hand { font-family: 'Nanum Pen Script', cursive; color: #1f3a8a; font-size: 40px; line-height: 1 }
  .wm { position: absolute; top: 46%; left: 50%; transform: translate(-50%,-50%) rotate(-28deg);
    font-family: 'Noto Sans KR', sans-serif; font-weight: 700; font-size: 150px; color: rgba(214, 48, 49, .13); white-space: nowrap; letter-spacing: 12px }
  .seal { display: inline-flex; width: 58px; height: 58px; border: 4px solid rgba(200, 30, 30, .82); border-radius: 50%;
    color: rgba(200, 30, 30, .85); font-family: 'Nanum Myeongjo'; font-weight: 700; font-size: 24px; align-items: center; justify-content: center;
    transform: rotate(-12deg); margin-left: 10px; vertical-align: middle }
`
const NOISE = `<svg width="0" height="0" style="position:absolute"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .06 0"/><feComposite in2="SourceGraphic" operator="in"/></filter></svg>`

const contract = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
  h1 { text-align: center; font-size: 46px; letter-spacing: 18px; margin-bottom: 44px }
  p.lead { font-size: 23px; line-height: 1.8; margin-bottom: 30px }
  table { width: 100%; border-collapse: collapse; font-size: 23px; margin-bottom: 34px }
  th, td { border: 1.6px solid #333; padding: 14px 16px; height: 70px; text-align: left; vertical-align: middle }
  th { width: 210px; background: #f1efe8; font-weight: 700 }
  ol { font-size: 21px; line-height: 1.85; padding-left: 0; list-style: none; margin-bottom: 40px }
  .date { text-align: center; font-size: 25px; margin: 30px 0 40px }
  .party { display: grid; grid-template-columns: 230px 1fr; row-gap: 14px; font-size: 22px; margin-bottom: 26px; align-items: center }
  .party .hand { justify-self: start }
  .party b { font-size: 24px }
</style></head><body>${NOISE}<div class="paper">
  <h1>물품 매매 계약서</h1>
  <p class="lead">매도인(이하 "갑")과 매수인(이하 "을")은 아래 표시 물품의 매매에 관하여 다음과 같이 계약을 체결한다.</p>
  <table>
    <tr><th>물품명</th><td><span class="hand" data-ocr="f-item">캐논 EOS R6 (바디, 배터리 2개)</span></td></tr>
    <tr><th>수량</th><td><span class="hand">1대</span></td></tr>
    <tr><th>매매대금</th><td><span class="hand" data-ocr="f-amount">금 일백만원정 (₩1,000,000)</span></td></tr>
    <tr><th>대금 지급일</th><td><span class="hand" data-ocr="f-date">2026. 10. 30.</span></td></tr>
    <tr><th>지급 방법</th><td>계좌이체 (갑 명의 계좌)</td></tr>
  </table>
  <ol>
    <li>제1조 (목적물) 갑은 위 물품을 을에게 매도하고 을은 이를 매수한다.</li>
    <li>제2조 (대금) 을은 매매대금 전액을 대금 지급일에 갑 명의 계좌로 지급한다.</li>
    <li>제3조 (인도) 갑은 대금 수령과 동시에 물품을 을에게 인도한다.</li>
    <li>제4조 (하자) 중고 물품의 특성상 인도 후 단순 변심에 의한 반품은 하지 아니한다.</li>
  </ol>
  <p class="date">2026년 10월 30일</p>
  <div class="party"><b>매도인 (갑)</b><span></span>
    <span>성명</span><span class="hand">김○○<span class="seal">인</span></span>
    <span>사업자등록번호</span><span class="hand" data-ocr="f-biz">123-45-67890</span>
    <span>연락처</span><span class="hand">010-****-4821</span></div>
  <div class="party"><b>매수인 (을)</b><span></span>
    <span>성명</span><span class="hand">박○○<span class="seal">인</span></span>
    <span>연락처</span><span class="hand">010-****-7730</span></div>
  ${WATERMARK}</div></body></html>`

const idCard = `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE_CSS}
  body { width: 1240px; height: 820px }
  .card { position: relative; width: 860px; height: 540px; border-radius: 26px; background: #e9ecef; border: 2px solid #adb5bd;
    transform: rotate(-1.2deg); box-shadow: 0 6px 16px rgba(0,0,0,.25); font-family: 'Noto Sans KR'; padding: 46px; overflow: hidden }
  .label { font-size: 30px; font-weight: 700; color: #495057; margin-bottom: 30px }
  .row { height: 34px; background: #868e96; border-radius: 6px; margin-bottom: 22px }
  .photo { position: absolute; right: 54px; top: 110px; width: 220px; height: 280px; background: #ced4da; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; color: #495057; font-size: 24px }
  .note { position: absolute; bottom: 40px; left: 46px; font-size: 24px; color: #495057 }
  .wm { font-size: 92px }
</style></head><body>${NOISE}<div class="card">
  <p class="label">신분증 사본</p>
  <div class="row" style="width:360px"></div><div class="row" style="width:440px"></div>
  <div class="row" style="width:300px"></div><div class="row" style="width:400px"></div>
  <div class="photo">사진 가림</div>
  <p class="note">전 항목 가림 처리. 실제 신분증 양식을 모사하지 않음</p>
  ${WATERMARK}</div></body></html>`

const browser = await chromium.launch()
const render = async (name, html, size) => {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 })
  await page.setContent(html, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${OUT}${name}.png` })
  const boxes = await page.$$eval("[data-ocr]", (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return {
        id: el.dataset.ocr,
        x: r.left / innerWidth,
        y: r.top / innerHeight,
        w: r.width / innerWidth,
        h: r.height / innerHeight,
      }
    }),
  )
  if (boxes.length)
    writeFileSync(`${BOXES}${name}.ocr.json`, JSON.stringify(boxes, null, 2))
  await page.close()
  return boxes.length
}
console.log(
  "contract boxes:",
  await render("contract-a", contract, { width: 1240, height: 1754 }),
)
console.log(
  "id:",
  await render("id-masked-a", idCard, { width: 1240, height: 820 }),
)
await browser.close()

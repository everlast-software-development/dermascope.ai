import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900}})
await p.goto('http://localhost:4674/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
// pause the marquee so the target stays put
await p.evaluate(()=>{document.querySelectorAll('[style*="marquee"]').forEach(e=>e.style.animationPlayState='paused')})
await p.waitForTimeout(200)
const t = p.locator('img.ds-trust-logo[src*="EWMC"]').first()
const before = await t.evaluate(el=>getComputedStyle(el).filter)
await t.hover({ force:true })
await p.waitForTimeout(600)
const after = await t.evaluate(el=>getComputedStyle(el).filter)
const op = await t.evaluate(el=>getComputedStyle(el).opacity)
console.log('filter default:', before)
console.log('filter hover  :', after, ' opacity hover:', op)
await p.screenshot({ path:`${OUT}/trust-hover2.png`, clip:{x:0,y:800,width:1440,height:100} })
await b.close()

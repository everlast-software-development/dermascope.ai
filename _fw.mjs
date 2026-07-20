import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1200}})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://localhost:4684/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'start'})})
await p.waitForTimeout(1200)
const ov = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
console.log('overflow', ov, 'errors:', errs.length?errs.slice(0,3):'none')
// capture two frames ~1.5s apart to confirm rotation (cards moved) and uprightness
await p.screenshot({ path:`${OUT}/fw-a.png` })
await p.waitForTimeout(1600)
await p.screenshot({ path:`${OUT}/fw-b.png` })
await b.close()

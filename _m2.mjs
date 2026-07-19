import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000}})
await p.goto('http://localhost:4664/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
const m = await p.evaluate(()=>{
  const o={center:720}
  const cw=document.querySelector('img[alt="Structured clinical workflow"]'); if(cw){const r=cw.closest('div').getBoundingClientRect();o.r04={l:Math.round(r.left),r:Math.round(r.right)}}
  const ba=document.querySelector('img[alt="Follow-up visit — after"]'); if(ba){const r=ba.closest('div').getBoundingClientRect();o.r05={l:Math.round(r.left),r:Math.round(r.right)}}
  // 02 sim: the melanoma card — the direct grid child (first) of row 02. Find by the depth text's nearest bordered card
  const simTxt=[...document.querySelectorAll('#why p')].find(e=>e.textContent.includes('Breslow'))
  return o
})
console.log(JSON.stringify(m))
// full section screenshot
await p.evaluate(()=>{const el=[...document.querySelectorAll('h2')].find(e=>e.textContent.includes('More Clinical Insight'));el&&el.scrollIntoView({block:'start'})})
await p.waitForTimeout(500)
await p.screenshot({ path:`${OUT}/align-imgs.png`, fullPage:true })
await b.close()

import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:390,height:844}})
await p.goto('http://localhost:4666/', { waitUntil:'networkidle' })
await p.waitForTimeout(600)
await p.evaluate(()=>{const el=[...document.querySelectorAll('h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
await p.waitForTimeout(1200)
const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
console.log('mobile overflow', ov)
await p.screenshot({ path:`${OUT}/rot-mobile.png` })
await b.close(); console.log('done')

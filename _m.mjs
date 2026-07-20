import { chromium } from 'playwright'
const b = await chromium.launch()
for (const w of [390, 820]) {
  const p = await b.newPage({ viewport:{width:w,height:900}})
  await p.goto('http://localhost:4682/', { waitUntil:'networkidle' })
  await p.waitForTimeout(600)
  await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
  await p.waitForTimeout(400)
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
  console.log('w'+w+' overflow', ov)
  await p.close()
}
await b.close()

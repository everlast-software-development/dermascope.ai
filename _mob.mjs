import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
for (const [name,w,h] of [['mob',390,844],['tab',820,1180]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}})
  await p.goto('http://localhost:4684/', { waitUntil:'networkidle' })
  await p.waitForTimeout(700)
  await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'start'})})
  await p.waitForTimeout(500)
  const ov=await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
  console.log(name,'overflow',ov)
  if(name==='mob') await p.screenshot({ path:`${OUT}/fw-mob.png` })
  await p.close()
}
await b.close()

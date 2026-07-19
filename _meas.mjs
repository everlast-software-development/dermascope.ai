import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000}})
await p.goto('http://localhost:4662/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
const m = await p.evaluate(()=>{
  const out = {}
  const container = document.querySelector('#why > div').getBoundingClientRect()
  out.container = { l: Math.round(container.left), r: Math.round(container.right) }
  // 01 visual: the right column of AngleFeature — find DisplayCards area; approximate: the second child of AngleFeature grid
  // Use known images/components:
  const cw = document.querySelector('img[alt="Structured clinical workflow"]')
  if (cw){const r=cw.closest('div').getBoundingClientRect(); out.r04 = {l:Math.round(r.left), r:Math.round(r.right)}}
  const ba = document.querySelector('img[alt="Follow-up visit — after"]')
  if (ba){const r=ba.closest('div').getBoundingClientRect(); out.r05 = {l:Math.round(r.left), r:Math.round(r.right)}}
  // 02 sim: MelanomaDepthSim — find element containing "Breslow" text
  const sim = [...document.querySelectorAll('#why *')].find(e=>e.textContent && e.textContent.includes('Breslow depth') && e.querySelector('svg'))
  if (sim){const r=sim.getBoundingClientRect(); out.r02 = {l:Math.round(r.left), r:Math.round(r.right)}}
  return out
})
console.log(JSON.stringify(m,null,0))
await b.close()

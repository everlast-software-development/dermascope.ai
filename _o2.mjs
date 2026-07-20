import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1100}})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://localhost:4682/', { waitUntil:'networkidle' })
await p.waitForTimeout(700)
await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
await p.waitForTimeout(900)
const ov = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
console.log('overflow', ov)
const row = p.locator('#why h3', { hasText:'Multi-Angle' }).first().locator('xpath=ancestor::div[contains(@style,"grid")][1]')
await row.screenshot({ path:`${OUT}/o2-default.png` })
// click 40 node
await p.evaluate(()=>{const ns=[...document.querySelectorAll('.ds-orbit-node')];const n=ns.find(x=>x.textContent.includes('40'));n&&n.click()})
await p.waitForTimeout(700)
await row.screenshot({ path:`${OUT}/o2-click40.png` })
console.log('errors:', errs.length?errs.slice(0,3):'none')
await b.close()

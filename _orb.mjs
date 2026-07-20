import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:960}})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://localhost:4680/', { waitUntil:'networkidle' })
await p.waitForTimeout(700)
await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
await p.waitForTimeout(900)
// screenshot the whole row 01 (the AngleFeature Reveal)
const row = p.locator('#why h3', { hasText:'Multi-Angle' }).first().locator('xpath=ancestor::div[contains(@style,"grid")][1]')
await row.screenshot({ path:`${OUT}/orb-row.png` })
// click a node then screenshot tooltip
await p.evaluate(()=>{const n=document.querySelector('.ds-orbit-node'); n && n.click()})
await p.waitForTimeout(600)
await row.screenshot({ path:`${OUT}/orb-tip.png` })
console.log('errors:', errs.length?errs.slice(0,3):'none')
await b.close()

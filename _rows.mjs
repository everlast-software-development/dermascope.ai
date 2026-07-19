import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:920}})
await p.goto('http://localhost:4664/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
async function shot(t,name,block='center'){
  await p.evaluate(({t,block})=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes(t));el&&el.scrollIntoView({block})},{t,block})
  await p.waitForTimeout(700)
  await p.screenshot({ path:`${OUT}/${name}.png` })
}
await shot('AI Skin Intelligence','rows-0102','start')
await shot('Longitudinal Patient Monitoring','rows-0405','start')
await b.close(); console.log('done')

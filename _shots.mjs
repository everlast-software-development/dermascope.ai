import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const errs=[]
const p = await b.newPage({ viewport:{width:1440,height:860}})
p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()) })
await p.goto('http://localhost:4658/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
const secTop = await p.evaluate(()=>document.querySelector('#how').getBoundingClientRect().top + window.scrollY)
for (const [name,off] of [['s0',20],['s2',1300],['s5',3380]]) {
  await p.evaluate((y)=>window.scrollTo(0,y), secTop+off)
  await p.waitForTimeout(900)
  await p.screenshot({ path:`${OUT}/pin-${name}.png` })
}
console.log('console errors:', errs.length ? errs.slice(0,5) : 'none')
await b.close()

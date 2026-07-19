import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:860}})
await p.goto('http://localhost:4658/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
const secTop = await p.evaluate(()=>document.querySelector('#how').getBoundingClientRect().top + window.scrollY)
function readState(){
  return p.evaluate(()=>{
    const h2 = [...document.querySelectorAll('h2')].find(e=>e.textContent.includes('Simple. Fast'))
    const h2top = h2 ? Math.round(h2.getBoundingClientRect().top) : null
    const stepDivs = [...document.querySelectorAll('#how h3')].filter(h=>/^\d\d\./.test(h.textContent))
    let active = -1
    stepDivs.forEach((h,i)=>{ const wrap=h.closest('div[style*="cursor"]'); if(wrap){const op=parseFloat(getComputedStyle(wrap).opacity); if(op>0.9) active=i} })
    return { h2top, active, scrollY: Math.round(window.scrollY) }
  })
}
for (let k=0;k<=12;k++){
  await p.evaluate((y)=>window.scrollTo(0,y), secTop + k*430)
  await p.waitForTimeout(700)
  const r = await readState()
  console.log(`k=${k}`, JSON.stringify(r))
}
await b.close()

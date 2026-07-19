import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:950}})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://localhost:4666/', { waitUntil:'networkidle' })
await p.waitForTimeout(600)
await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
await p.waitForTimeout(1000)
function frontCard(){
  return p.evaluate(()=>{
    const cards=[...document.querySelectorAll('.ds-dc-card')]
    let best={z:-1,t:null}
    cards.forEach(c=>{const z=parseInt(getComputedStyle(c).zIndex)||0; const t=c.querySelector('.ds-dc-title')?.textContent; if(z>best.z) best={z,t}})
    return best.t
  })
}
const seq=[]
seq.push(await frontCard())
await p.screenshot({ path:`${OUT}/rot-0.png` })
for(let k=1;k<=3;k++){ await p.waitForTimeout(5200); seq.push(await frontCard()); await p.screenshot({ path:`${OUT}/rot-${k}.png` }) }
console.log('front sequence:', JSON.stringify(seq))
console.log('errors:', errs.length?errs.slice(0,3):'none')
await b.close()

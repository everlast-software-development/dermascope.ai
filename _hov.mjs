import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:950}})
await p.goto('http://localhost:4668/', { waitUntil:'networkidle' })
await p.waitForTimeout(600)
await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
await p.waitForTimeout(1000)
const front=()=>p.evaluate(()=>{const cs=[...document.querySelectorAll('.ds-dc-card')];let bz=-1,bt=null;cs.forEach(c=>{const z=parseInt(getComputedStyle(c).zIndex)||0;const t=c.querySelector('.ds-dc-title')?.textContent;if(z>bz){bz=z;bt=t}});return bt})
const boxOf=(title)=>p.evaluate((title)=>{const c=[...document.querySelectorAll('.ds-dc-card')].find(x=>x.querySelector('.ds-dc-title')?.textContent===title);const r=c.getBoundingClientRect();return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)}}, title)
console.log('front @start:', await front())
// hover the back card (40°) at its exposed top-left
const bx = await boxOf('40° Side View')
await p.mouse.move(bx.x+28, bx.y+28)
await p.waitForTimeout(1300)
console.log('front after hover 40:', await front())
// hold still 6s, sample for oscillation
const samples=[]
for(let k=0;k<3;k++){ await p.waitForTimeout(2000); samples.push(await front()) }
console.log('held-still samples (expect all 40):', JSON.stringify(samples))
// leave the section
await p.mouse.move(5,5)
await p.waitForTimeout(5600)
console.log('front after leave+5s (expect advanced):', await front())
await b.close()

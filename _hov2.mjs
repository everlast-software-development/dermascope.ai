import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:950}})
await p.goto('http://localhost:4668/', { waitUntil:'networkidle' })
await p.waitForTimeout(600)
await p.evaluate(()=>{const el=[...document.querySelectorAll('#why h3')].find(e=>e.textContent.includes('Multi-Angle'));el&&el.scrollIntoView({block:'center'})})
await p.waitForTimeout(1000)
const front=()=>p.evaluate(()=>{const cs=[...document.querySelectorAll('.ds-dc-card')];let bz=-1,bt=null;cs.forEach(c=>{const z=parseInt(getComputedStyle(c).zIndex)||0;const t=c.querySelector('.ds-dc-title')?.textContent;if(z>bz){bz=z;bt=t}});return bt})
const hover=(needle)=>p.evaluate((needle)=>{const c=[...document.querySelectorAll('.ds-dc-card')].find(x=>x.querySelector('.ds-dc-title')?.textContent.includes(needle));c.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}));c.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false}))},needle)
console.log('start:', await front())
await hover('40°'); await p.waitForTimeout(1200); console.log('hover 40 ->', await front())
await hover('75°'); await p.waitForTimeout(1200); console.log('hover 75 ->', await front())
await hover('90°'); await p.waitForTimeout(1200); console.log('hover 90 ->', await front())
// leave stack -> resume; current front is 90 so next auto should be 75
await p.evaluate(()=>{document.querySelector('.ds-dc-stack').dispatchEvent(new MouseEvent('mouseleave',{bubbles:false}))})
await p.waitForTimeout(5600); console.log('after leave+5s (resume ->):', await front())
await b.close()

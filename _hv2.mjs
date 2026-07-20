import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900}})
await p.goto('http://localhost:4674/', { waitUntil:'networkidle' })
await p.waitForTimeout(800)
await p.evaluate(()=>{document.querySelectorAll('[style*="marquee"]').forEach(e=>e.style.animationPlayState='paused')})
await p.waitForTimeout(200)
// pick the logo nearest horizontal center
const pick = await p.evaluate(()=>{
  const imgs=[...document.querySelectorAll('img.ds-trust-logo')]
  let best=null,bd=1e9
  imgs.forEach((im,idx)=>{const r=im.getBoundingClientRect();const cx=r.left+r.width/2;const d=Math.abs(cx-720);if(d<bd&&r.width>10){bd=d;best={idx,cx:Math.round(cx),cy:Math.round(r.top+r.height/2),src:im.getAttribute('src')}}})
  return best
})
console.log('target:', JSON.stringify(pick))
await p.mouse.move(pick.cx, pick.cy)
await p.waitForTimeout(600)
const st = await p.evaluate((idx)=>{const im=[...document.querySelectorAll('img.ds-trust-logo')][idx];return {filter:getComputedStyle(im).filter, opacity:getComputedStyle(im).opacity}}, pick.idx)
console.log('hovered state:', JSON.stringify(st))
await p.screenshot({ path:`${OUT}/trust-hover3.png`, clip:{x:0,y:800,width:1440,height:100} })
await b.close()

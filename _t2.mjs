import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900}})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://localhost:4676/', { waitUntil:'networkidle' })
await p.waitForTimeout(1000)
// verify assets loaded + no layout shift (mono overlays color exactly)
const info = await p.evaluate(()=>{
  const spans=[...document.querySelectorAll('.ds-trust-logo')]
  const imgs=[...document.querySelectorAll('.ds-trust-logo-img')]
  const okAll = imgs.every(i=>i.naturalWidth>0)
  // check mono overlay matches color box for first span
  const s=spans[4]; const c=s.querySelector('.ds-trust-logo-img:not(.ds-trust-logo-mono)').getBoundingClientRect(); const m=s.querySelector('.ds-trust-logo-mono').getBoundingClientRect()
  return { spans:spans.length, imgsOk:okAll, overlayMatch:{dx:Math.round(m.left-c.left),dy:Math.round(m.top-c.top),dw:Math.round(m.width-c.width),dh:Math.round(m.height-c.height)} }
})
console.log(JSON.stringify(info))
await p.evaluate(()=>{document.querySelectorAll('[style*="marquee"]').forEach(e=>e.style.animationPlayState='paused')})
await p.waitForTimeout(200)
await p.screenshot({ path:`${OUT}/t2-default.png`, clip:{x:0,y:800,width:1440,height:100} })
// hover a centered logo
const pick = await p.evaluate(()=>{const s=[...document.querySelectorAll('.ds-trust-logo')];let best,bd=1e9;s.forEach(el=>{const r=el.getBoundingClientRect();const cx=r.left+r.width/2;const d=Math.abs(cx-720);if(d<bd&&r.width>10){bd=d;best={cx:Math.round(cx),cy:Math.round(r.top+r.height/2)}}});return best})
await p.mouse.move(pick.cx, pick.cy); await p.waitForTimeout(500)
await p.screenshot({ path:`${OUT}/t2-hover.png`, clip:{x:0,y:800,width:1440,height:100} })
console.log('errors:', errs.length?errs.slice(0,3):'none')
await b.close()

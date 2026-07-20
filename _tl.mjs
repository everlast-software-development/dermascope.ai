import { chromium } from 'playwright'
const OUT = process.argv[2]
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900}})
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())})
await p.goto('http://localhost:4674/', { waitUntil:'networkidle' })
await p.waitForTimeout(1000)
// the trusted strip is at the bottom of the hero (first viewport). Screenshot bottom area.
const strip = p.locator('img.ds-trust-logo').first().locator('xpath=ancestor::div[3]')
await strip.screenshot({ path:`${OUT}/trust-default.png` })
// verify loaded
const info = await p.evaluate(()=>{
  const imgs=[...document.querySelectorAll('img.ds-trust-logo')]
  const uniq=[...new Set(imgs.map(i=>i.getAttribute('src')))]
  const okAll = imgs.every(i=>i.naturalWidth>0)
  const f = getComputedStyle(imgs[0]).filter
  return { count: imgs.length, uniq, okAll, filter: f, h: imgs[0].getBoundingClientRect().height }
})
console.log(JSON.stringify(info))
// hover one logo to show color
await p.evaluate(()=>{const im=[...document.querySelectorAll('img.ds-trust-logo')].find(x=>x.src.includes('EWMC'));im.dispatchEvent(new MouseEvent('mouseover',{bubbles:true}))})
// dispatch won't trigger :hover CSS; use real hover instead
const target = p.locator('img.ds-trust-logo[src*="EWMC"]').first()
await target.hover({ force:true })
await p.waitForTimeout(600)
await strip.screenshot({ path:`${OUT}/trust-hover.png` })
console.log('errors:', errs.length?errs.slice(0,3):'none')
await b.close()

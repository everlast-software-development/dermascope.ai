import { chromium } from 'playwright'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 390, height: 880 } })
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
for (let y=0; y<9000; y+=700){ await p.evaluate((v)=>window.scrollTo(0,v), y); await p.waitForTimeout(80) }
await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(400)
const info = await p.evaluate(() => {
  const how = document.getElementById('how')
  const h2 = how && how.querySelector('h2')
  const h3s = how ? [...how.querySelectorAll('h3')].map(e=>e.textContent) : []
  const imgs = how ? [...how.querySelectorAll('img')].map(i=>i.getAttribute('src')) : []
  return { top: how && Math.round(how.getBoundingClientRect().top + window.scrollY), h2: h2 && h2.textContent, h3s, imgs, scrollH: document.body.scrollHeight }
})
console.log(JSON.stringify(info, null, 2))
await b.close()

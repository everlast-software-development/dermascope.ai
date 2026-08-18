import { lazy, Suspense } from 'react'
import Hero from './components/Hero'
import FloatingEarlyAccess from './components/FloatingEarlyAccess'
import LazyMount from './components/LazyMount'
import { useHashScroll } from './hooks/useHashScroll'

// Everything below the hero is off-screen on first paint. Each section is its
// own chunk, and LazyMount gates the actual dynamic import() behind an
// IntersectionObserver so those chunks are only fetched once the section
// nears the viewport — plain React.lazy() alone still fetches immediately on
// first render, which would compete with the hero's critical rendering path.
// FloatingEarlyAccess stays eager since it's persistent, always-visible chrome,
// not a page section.
const PainPoints = lazy(() => import('./components/PainPoints'))
const WhyDermaScope = lazy(() => import('./components/WhyDermaScope'))
const WhyChoose = lazy(() => import('./components/WhyChoose'))
const HowItWorks = lazy(() => import('./components/HowItWorks'))
const DemoForm = lazy(() => import('./components/DemoForm'))
// import BattleWithAI from './components/BattleWithAI' // temporarily hidden
const WhoItsFor = lazy(() => import('./components/WhoItsFor'))
const FAQ = lazy(() => import('./components/FAQ'))
const PromoBanner = lazy(() => import('./components/PromoBanner'))
const CinematicFooter = lazy(() => import('./components/ui/CinematicFooter'))

export default function App() {
  // Makes /#early-access (and any other section deep link) land on the right
  // section even on a cold load, where the section's chunk mounts after the
  // browser has already given up on the hash.
  useHashScroll()

  return (
    <>
      {/* Fluid layout: no min-width lock so tablet/mobile can reflow. Desktop
          (>1024px) keeps its original proportions via each section's max-width
          containers. `overflowX: clip` still contains the decorative blobs. */}
      <div style={{ overflowX: 'clip' }}>
        <Hero />
        <main>
          <LazyMount>
            <Suspense fallback={null}>
              <PainPoints />
            </Suspense>
          </LazyMount>
          <LazyMount>
            <Suspense fallback={null}>
              <WhyDermaScope />
            </Suspense>
          </LazyMount>
          <LazyMount>
            <Suspense fallback={null}>
              <WhyChoose />
            </Suspense>
          </LazyMount>
          <LazyMount>
            <Suspense fallback={null}>
              <HowItWorks />
            </Suspense>
          </LazyMount>
          <LazyMount>
            <Suspense fallback={null}>
              <DemoForm />
            </Suspense>
          </LazyMount>
          {/* Live Battle with AI — temporarily hidden (kept for later use) */}
          {/* <BattleWithAI /> */}
          <LazyMount>
            <Suspense fallback={null}>
              <WhoItsFor />
            </Suspense>
          </LazyMount>
          <LazyMount>
            <Suspense fallback={null}>
              <FAQ />
            </Suspense>
          </LazyMount>
          {/* Promo banner — last block of content, directly above the footer.
              Tighter rootMargin than the shared default: every LazyMount wrapper
              is zero-height until its section renders, so on first paint they all
              sit stacked at the fold and the default 800px margin mounts the
              whole page at once — which pulled this banner's thumbnails into the
              initial load. */}
          <LazyMount rootMargin="0px">
            <Suspense fallback={null}>
              <PromoBanner />
            </Suspense>
          </LazyMount>
        </main>
        <LazyMount>
          <Suspense fallback={null}>
            <CinematicFooter />
          </Suspense>
        </LazyMount>
      </div>

      {/* Persistent CTA + slide-in Join Early Access drawer. Kept outside the
          overflow-clipped wrapper so the fixed elements are never clipped. */}
      <FloatingEarlyAccess />
    </>
  )
}

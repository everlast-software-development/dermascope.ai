import { lazy, Suspense } from 'react'
import Hero from './components/Hero'
import FloatingEarlyAccess from './components/FloatingEarlyAccess'
import LazyMount from './components/LazyMount'

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
const CinematicFooter = lazy(() => import('./components/ui/CinematicFooter'))

export default function App() {
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

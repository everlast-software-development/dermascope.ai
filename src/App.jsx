import Hero from './components/Hero'
import PainPoints from './components/PainPoints'
import WhyDermaScope from './components/WhyDermaScope'
import WhyChoose from './components/WhyChoose'
import HowItWorks from './components/HowItWorks'
import DemoForm from './components/DemoForm'
import BattleWithAI from './components/BattleWithAI'
import WhoItsFor from './components/WhoItsFor'
import CinematicFooter from './components/ui/CinematicFooter'
import FloatingEarlyAccess from './components/FloatingEarlyAccess'

export default function App() {
  return (
    <>
      {/* Fluid layout: no min-width lock so tablet/mobile can reflow. Desktop
          (>1024px) keeps its original proportions via each section's max-width
          containers. `overflowX: clip` still contains the decorative blobs. */}
      <div style={{ overflowX: 'clip' }}>
        <Hero />
        <PainPoints />
        <WhyDermaScope />
        <WhyChoose />
        <HowItWorks />
        <DemoForm />
        <BattleWithAI />
        <WhoItsFor />
        <CinematicFooter />
      </div>

      {/* Persistent CTA + slide-in Join Early Access drawer. Kept outside the
          overflow-clipped wrapper so the fixed elements are never clipped. */}
      <FloatingEarlyAccess />
    </>
  )
}

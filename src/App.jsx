import Navbar from './components/Navbar'
import Hero from './components/Hero'
import PainPoints from './components/PainPoints'
import WhyDermaScope from './components/WhyDermaScope'
import WhyChoose from './components/WhyChoose'
import HowItWorks from './components/HowItWorks'
import DemoForm from './components/DemoForm'
import BattleWithAI from './components/BattleWithAI'
import WhoItsFor from './components/WhoItsFor'
import CinematicFooter from './components/ui/CinematicFooter'

export default function App() {
  return (
    // The original design is a fixed desktop layout — keep the min-width so
    // proportions hold, and clip horizontal overflow from the decorative blobs.
    <div style={{ minWidth: 1100, overflowX: 'clip' }}>
      <Navbar />
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
  )
}

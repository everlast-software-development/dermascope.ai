import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useResponsive } from '../../hooks/useResponsive'

// Scroll-linked 3D reveal (adapted from Aceternity's ContainerScroll — the
// animation mechanic only, no card chrome). Children start tilted back on the
// X axis and flatten to their natural, upright state as the block scrolls into
// view, with a subtle scale settle. It wraps arbitrary content without altering
// it: the final resting state is rotateX(0)/scale(1), i.e. the untouched UI.
export default function ContainerScroll({ children, style }) {
  const ref = useRef(null)
  const { isMobile } = useResponsive()
  const reduce =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'center center'],
  })
  const rotateX = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.92, 1] : [1.05, 1])

  if (reduce) {
    return <div style={style}>{children}</div>
  }

  return (
    <div ref={ref} style={{ perspective: '1000px', ...style }}>
      <motion.div style={{ rotateX, scale, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  )
}

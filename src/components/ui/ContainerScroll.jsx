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

  // End the tween once the block is comfortably inside the viewport (its top
  // has reached ~35% down) rather than waiting for exact vertical centering.
  // With the old 'center center' endpoint, tall content only reaches the flat
  // rotateX(0)/scale(1) rest state right as it scrolls past the middle of the
  // screen — for most of the time it's actually being read it's still mid-tilt,
  // so the 3D-transformed/GPU-composited layer never renders at its crisp,
  // untransformed resolution. Settling earlier fixes that without changing the
  // animation itself (same start point, same tilt-to-flat motion).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'start 0.35'],
  })
  const rotateX = useTransform(scrollYProgress, [0, 1], [20, 0])
  const scale = useTransform(scrollYProgress, [0, 1], isMobile ? [0.92, 1] : [1.05, 1])

  if (reduce) {
    return <div style={style}>{children}</div>
  }

  return (
    <div ref={ref} style={{ perspective: '1000px', ...style }}>
      <motion.div style={{ rotateX, scale, transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}>
        {children}
      </motion.div>
    </div>
  )
}

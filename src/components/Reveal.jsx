import { useEffect, useRef, useState } from 'react'

// Fades + slides content in when it scrolls into view — mirrors the
// original page's [data-reveal] IntersectionObserver behavior.
export default function Reveal({ children, style, id, as: Tag = 'div', ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reduce =
      window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || !('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }

    // Already visible on load — don't hide it.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
      setVisible(true)
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <Tag
      ref={ref}
      id={id}
      className={`ds-reveal${visible ? ' ds-visible' : ''}`}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  )
}

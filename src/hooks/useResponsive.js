import { useEffect, useState } from 'react'

// Small media-query hook. Initialised synchronously (SPA — window is available)
// so the first paint already matches the viewport (no desktop→mobile flash).
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia(query).matches
      : false,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = () => setMatches(mql.matches)
    onChange()
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

// Project breakpoints:
//   mobile  : <= 640px
//   tablet  : 641px – 1024px
//   desktop : > 1024px  (both flags false — desktop design is never altered)
export function useResponsive() {
  const isMobile = useMediaQuery('(max-width: 640px)')
  const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
  return { isMobile, isTablet }
}

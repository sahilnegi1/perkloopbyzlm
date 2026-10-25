import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // Initial read deferred a tick — synchronous setState inside the effect
    // body trips the react-hooks cascading-render rule.
    const id = setTimeout(onChange, 0)
    return () => {
      clearTimeout(id)
      mql.removeEventListener("change", onChange)
    }
  }, [])

  return !!isMobile
}

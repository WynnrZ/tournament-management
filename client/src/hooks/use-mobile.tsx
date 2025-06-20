import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      // Check both screen size and user agent for better detection
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // Consider it mobile if either condition is true
      setIsMobile(isSmallScreen || isMobileUserAgent)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    mql.addEventListener("change", checkMobile)
    checkMobile()
    return () => mql.removeEventListener("change", checkMobile)
  }, [])

  return !!isMobile
}

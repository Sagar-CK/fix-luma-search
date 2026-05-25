import { useEffect, useState } from "react"

const SCROLL_THRESHOLD_PX = 360
const STORAGE_KEY = "luma-advisor-scroll-prompt-dismissed"
const MOBILE_MAX_WIDTH_PX = 639

function isMobileViewport() {
  return window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH_PX}px)`).matches
}

export function useAdvisorScrollPrompt(advisorOpen: boolean) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (advisorOpen) {
      return
    }

    if (sessionStorage.getItem(STORAGE_KEY) === "1") {
      return
    }

    function evaluateScroll() {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        return
      }

      if (isMobileViewport()) {
        return
      }

      if (window.scrollY >= SCROLL_THRESHOLD_PX) {
        setVisible(true)
      }
    }

    evaluateScroll()
    window.addEventListener("scroll", evaluateScroll, { passive: true })

    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_MAX_WIDTH_PX}px)`,
    )
    mediaQuery.addEventListener("change", evaluateScroll)

    return () => {
      window.removeEventListener("scroll", evaluateScroll)
      mediaQuery.removeEventListener("change", evaluateScroll)
    }
  }, [advisorOpen])

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1")
    setVisible(false)
  }

  return {
    visible: visible && !advisorOpen,
    dismiss,
  }
}

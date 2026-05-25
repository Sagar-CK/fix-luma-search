import { useEffect, useState } from "react"

const SCROLL_THRESHOLD_PX = 360
const STORAGE_KEY = "luma-advisor-scroll-prompt-dismissed"

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
      if (window.scrollY >= SCROLL_THRESHOLD_PX) {
        setVisible(true)
      }
    }

    evaluateScroll()
    window.addEventListener("scroll", evaluateScroll, { passive: true })

    return () => {
      window.removeEventListener("scroll", evaluateScroll)
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

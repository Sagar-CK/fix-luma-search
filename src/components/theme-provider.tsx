import * as React from "react"

type ThemeProviderProps = {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  React.useEffect(() => {
    const root = document.documentElement
    root.classList.remove("dark")
    root.classList.add("light")
    root.style.colorScheme = "light"
  }, [])

  return children
}

export function useTheme() {
  return {
    theme: "light" as const,
    setTheme: () => {},
  }
}

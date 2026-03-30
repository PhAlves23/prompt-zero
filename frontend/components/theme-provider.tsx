"use client"

import * as React from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = "pz_theme"

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark"
    }
    return "light"
  }
  return theme
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setThemeState] = React.useState<Theme>("system")
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light")

  React.useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY) as Theme | null
    const nextTheme: Theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
      ? storedTheme
      : "system"
    const nextResolvedTheme = resolveTheme(nextTheme)
    setThemeState(nextTheme)
    setResolvedTheme(nextResolvedTheme)
  }, [])

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const applyResolvedTheme = (currentResolvedTheme: "light" | "dark") => {
      const root = document.documentElement
      if (currentResolvedTheme === "dark") {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }

    applyResolvedTheme(resolvedTheme)

    const handleChange = () => {
      if (theme === "system") {
        const systemTheme = media.matches ? "dark" : "light"
        setResolvedTheme(systemTheme)
        applyResolvedTheme(systemTheme)
      }
    }

    media.addEventListener("change", handleChange)
    return () => media.removeEventListener("change", handleChange)
  }, [theme, resolvedTheme])

  const setTheme = React.useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, nextTheme)
    const nextResolvedTheme = resolveTheme(nextTheme)
    setThemeState(nextTheme)
    setResolvedTheme(nextResolvedTheme)
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

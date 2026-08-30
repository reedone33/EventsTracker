/**
 * Light / dark / system appearance, replacing the iOS app's Appearance menu.
 *
 * The iOS version stored "system", "light" or "dark" in AppStorage and handed
 * it to SwiftUI's preferredColorScheme. This does the same job by writing a
 * data-theme attribute onto the page, which the stylesheet reacts to.
 *
 * "System" writes NO attribute at all — that leaves the stylesheet's
 * prefers-color-scheme rule in charge, so the app follows the device and keeps
 * following it if the device switches at sunset.
 */

import { useCallback, useEffect, useState } from 'react'

export type ThemeChoice = 'system' | 'light' | 'dark'

/** Remembers the choice between visits. */
const THEME_KEY = 'eventstracker.theme'

/** The colour behind the phone's status bar, matching each appearance. */
const STATUS_BAR_COLORS: Record<'light' | 'dark', string> = {
  light: '#f2f2f7',
  dark: '#1c1c1e',
}

function readStoredChoice(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  } catch {
    // Blocked storage just means no remembered choice.
  }
  return 'system'
}

/** What the app is actually showing right now, once "system" is resolved. */
function resolveTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice !== 'system') return choice
  if (typeof window === 'undefined' || !window.matchMedia) return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export interface Theme {
  /** What the user picked: system, light or dark. */
  choice: ThemeChoice
  /** What is on screen right now, with "system" resolved to one or the other. */
  resolved: 'light' | 'dark'
  setChoice: (choice: ThemeChoice) => void
}

export function useTheme(): Theme {
  const [choice, setChoiceState] = useState<ThemeChoice>(readStoredChoice)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(readStoredChoice()))

  // Put the choice on the page and remember it.
  useEffect(() => {
    const root = document.documentElement

    if (choice === 'system') {
      // No attribute: the stylesheet's own media query takes over.
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', choice)
    }

    setResolved(resolveTheme(choice))

    try {
      window.localStorage.setItem(THEME_KEY, choice)
    } catch {
      // Not remembering the choice is harmless.
    }
  }, [choice])

  // While on "system", follow the device if it changes — at sunset, say.
  useEffect(() => {
    if (choice !== 'system' || !window.matchMedia) return

    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => setResolved(query.matches ? 'dark' : 'light')

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [choice])

  // Keep the phone's status bar in step with the app behind it. Without this,
  // an installed app on a light theme still gets a dark bar above it.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', STATUS_BAR_COLORS[resolved])
  }, [resolved])

  const setChoice = useCallback((next: ThemeChoice) => setChoiceState(next), [])

  return { choice, resolved, setChoice }
}

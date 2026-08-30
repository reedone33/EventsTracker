/**
 * Translation for the whole app.
 *
 * The iOS project had six .lproj folders but every one of them was empty, so
 * the phone app was English-only in practice. These are real translations.
 *
 * How it works: a dictionary per language, a `t('key')` function to look
 * strings up, and a React context so any component can reach it. No library —
 * the whole thing is about eighty lines, and a dependency would be more code to
 * understand, not less.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { en } from './locales/en'
import type { TranslationKey, Translations } from './locales/en'
import { enGB } from './locales/en-GB'
import { de } from './locales/de'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { it } from './locales/it'

export type { TranslationKey, Translations }

/** The languages on offer, each named in its own language. */
export const LANGUAGES = {
  en: 'English',
  'en-GB': 'English (UK)',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
} as const

export type LanguageCode = keyof typeof LANGUAGES

/**
 * British English is a thin overlay on the base file — only the words that
 * actually differ are listed, and everything else falls through to English.
 */
const DICTIONARIES: Record<LanguageCode, Translations> = {
  en,
  'en-GB': { ...en, ...enGB },
  de,
  es,
  fr,
  it,
}

/** Remembers the choice between visits. */
const LANGUAGE_KEY = 'eventstracker.language'

/**
 * Work out which language to start in:
 * a previous choice, else the browser's preference, else English.
 */
export function detectLanguage(): LanguageCode {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_KEY)
    if (stored && stored in LANGUAGES) return stored as LanguageCode
  } catch {
    // Blocked storage just means no remembered choice.
  }

  const preferences = typeof navigator !== 'undefined' ? navigator.languages ?? [] : []
  for (const preference of preferences) {
    // An exact match first, so "en-GB" beats plain "en".
    if (preference in LANGUAGES) return preference as LanguageCode
    // Then the base language, so "de-AT" or "fr-CA" find German and French.
    const base = preference.split('-')[0]
    if (base in LANGUAGES) return base as LanguageCode
  }

  return 'en'
}

/** Values substituted into a string's {placeholders}. */
export type TranslationValues = Record<string, string | number>

/**
 * Fill {placeholders} in a string.
 * An unknown placeholder is left as it is rather than becoming "undefined",
 * so a mistake shows up as visible text instead of silently reading wrong.
 */
function interpolate(template: string, values?: TranslationValues): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  )
}

export interface I18n {
  language: LanguageCode
  setLanguage: (language: LanguageCode) => void
  /** Look up a string, filling in any placeholders. */
  t: (key: TranslationKey, values?: TranslationValues) => string
  /**
   * Look up a string that changes with a number, e.g. "1 entry" / "3 entries".
   * Pass the base key; the singular and plural forms are `key_one` and
   * `key_other`. Which one is used follows the rules of the current language,
   * not English's — some languages count differently.
   */
  tc: (baseKey: string, count: number, values?: TranslationValues) => string
}

const I18nContext = createContext<I18n | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(detectLanguage)

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next)
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next)
    } catch {
      // Not remembering the choice is harmless.
    }
  }, [])

  const value = useMemo<I18n>(() => {
    const dictionary = DICTIONARIES[language]

    const t = (key: TranslationKey, values?: TranslationValues) =>
      interpolate(dictionary[key] ?? en[key] ?? key, values)

    const tc = (baseKey: string, count: number, values?: TranslationValues) => {
      // Intl knows each language's own plural rules, which is why this isn't
      // just `count === 1`.
      const rule = new Intl.PluralRules(language).select(count)
      const specific = `${baseKey}_${rule}` as TranslationKey
      const fallback = `${baseKey}_other` as TranslationKey
      const template = dictionary[specific] ?? dictionary[fallback] ?? baseKey
      return interpolate(template, { count, ...values })
    }

    return { language, setLanguage, t, tc }
  }, [language, setLanguage])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Reach the translations from any component. */
export function useI18n(): I18n {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used inside an I18nProvider')
  }
  return context
}

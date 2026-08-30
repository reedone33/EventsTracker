/**
 * Tests that keep the translations honest.
 *
 * The one that matters most is completeness: it fails the moment a new English
 * string is added without the other languages catching up, which is how
 * translations normally rot.
 */

import { describe, expect, it } from 'vitest'
import { en } from './locales/en'
import { enGB } from './locales/en-GB'
import { de } from './locales/de'
import { es } from './locales/es'
import { fr } from './locales/fr'
import { it as italian } from './locales/it'

const FULL_LANGUAGES = { de, es, fr, it: italian }
const englishKeys = Object.keys(en).sort()

describe('translation completeness', () => {
  for (const [code, dictionary] of Object.entries(FULL_LANGUAGES)) {
    it(`${code} has every English key`, () => {
      const missing = englishKeys.filter((key) => !(key in dictionary))
      expect(missing).toEqual([])
    })

    it(`${code} has no keys English doesn't`, () => {
      // Catches typos in a key name, which would otherwise be a string that
      // silently never appears.
      const extra = Object.keys(dictionary).filter((key) => !(key in en))
      expect(extra).toEqual([])
    })

    it(`${code} has no empty strings`, () => {
      const blank = Object.entries(dictionary)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => key)
      expect(blank).toEqual([])
    })
  }

  it('British English only overrides keys that exist', () => {
    const extra = Object.keys(enGB).filter((key) => !(key in en))
    expect(extra).toEqual([])
  })
})

describe('placeholders', () => {
  /** Pull {placeholder} names out of a string. */
  function placeholdersIn(text: string): string[] {
    return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  }

  for (const [code, dictionary] of Object.entries(FULL_LANGUAGES)) {
    it(`${code} uses the same placeholders as English`, () => {
      // A translation that drops {name} would render a sentence with a hole in
      // it, and one that invents {nom} would print the word "{nom}" on screen.
      const mismatches: string[] = []
      for (const key of englishKeys) {
        const expected = placeholdersIn(en[key as keyof typeof en])
        const actual = placeholdersIn((dictionary as Record<string, string>)[key] ?? '')
        if (expected.join(',') !== actual.join(',')) {
          mismatches.push(`${key}: expected ${expected.join('|')}, got ${actual.join('|')}`)
        }
      }
      expect(mismatches).toEqual([])
    })
  }
})

describe('plural forms', () => {
  it('every _one key has a matching _other key, and the reverse', () => {
    const singulars = englishKeys.filter((key) => key.endsWith('_one'))
    const plurals = englishKeys.filter((key) => key.endsWith('_other'))

    const missingPlural = singulars.filter(
      (key) => !plurals.includes(key.replace(/_one$/, '_other')),
    )
    const missingSingular = plurals.filter(
      (key) => !singulars.includes(key.replace(/_other$/, '_one')),
    )

    expect(missingPlural).toEqual([])
    expect(missingSingular).toEqual([])
  })

  it('every plural string can report its own count', () => {
    // A plural string that never mentions {count} is almost always a mistake.
    const withoutCount = englishKeys
      .filter((key) => key.endsWith('_one') || key.endsWith('_other'))
      .filter((key) => !en[key as keyof typeof en].includes('{count}'))
    expect(withoutCount).toEqual([])
  })
})

/**
 * Tests for reading saved files.
 *
 * The important one is the Swift date format: the iPhone app writes dates as a
 * number of seconds since 2001, and getting that wrong would silently place
 * every imported log in 1970. These tests fail loudly if that breaks.
 */

import { describe, expect, it } from 'vitest'
import { normalizeThings } from './normalize'
import { parseAppDate, startOfDay } from '../domain/dates'

describe('parseAppDate', () => {
  it('reads the number format Swift writes (seconds since 2001)', () => {
    // 0 seconds since the Swift reference date is exactly 1 Jan 2001, UTC.
    const parsed = parseAppDate(0)
    expect(parsed?.toISOString()).toBe('2001-01-01T00:00:00.000Z')
  })

  it('reads a realistic iPhone-saved date correctly', () => {
    // 776_000_000 seconds after 1 Jan 2001 lands in 2025, not 1970.
    const parsed = parseAppDate(776_000_000)
    expect(parsed?.getUTCFullYear()).toBe(2025)
  })

  it('still accepts ISO text, which is what this web app writes', () => {
    const parsed = parseAppDate('2026-08-29T15:30:00.000Z')
    expect(parsed?.toISOString()).toBe('2026-08-29T15:30:00.000Z')
  })

  it('accepts a plain Unix timestamp without misreading it as a Swift date', () => {
    // 1_800_000_000 is a Unix timestamp in 2027. Treated as a Swift reference
    // date it would wrongly become 2058, so the importer must tell them apart.
    const parsed = parseAppDate(1_800_000_000)
    expect(parsed?.getUTCFullYear()).toBe(2027)
  })

  it('returns null for values it cannot understand, instead of a bad date', () => {
    expect(parseAppDate(null)).toBeNull()
    expect(parseAppDate('not a date')).toBeNull()
    expect(parseAppDate({})).toBeNull()
  })
})

describe('startOfDay', () => {
  it('uses local time, not UTC', () => {
    // A late-evening local time must stay on its own local day. Using
    // toISOString() here would roll it into the next day in any timezone
    // behind UTC, which is the classic bug this migration has to avoid.
    const evening = new Date(2026, 7, 29, 23, 30) // 29 Aug 2026, 11:30pm local
    const start = startOfDay(evening)
    expect(start.getDate()).toBe(29)
    expect(start.getHours()).toBe(0)
  })
})

describe('normalizeThings', () => {
  /** A miniature version of what the iOS app's things.json actually looks like. */
  const iosFile = [
    {
      id: 'E621E1F8-C36C-495A-93FC-0C247A3E6E5F',
      name: 'Coffee',
      color: { red: 0.6, green: 0.3, blue: 0.1 },
      creationDate: 700_000_000,
      logs: [
        { id: 'A1', date: 776_000_000, location: { latitude: 34.02, longitude: -84.19 }, note: 'morning' },
        { id: 'A2', date: 776_086_400, location: null, note: null },
      ],
    },
  ]

  it('imports an iOS file and converts its dates', () => {
    const { things } = normalizeThings(iosFile)
    expect(things).toHaveLength(1)
    expect(things[0].name).toBe('Coffee')
    expect(things[0].logs).toHaveLength(2)
    // Dates come out as ISO text in a sensible year, not 1970.
    expect(new Date(things[0].logs[0].date).getUTCFullYear()).toBe(2025)
  })

  it('keeps location and note data intact', () => {
    const { things } = normalizeThings(iosFile)
    expect(things[0].logs[0].location).toEqual({ latitude: 34.02, longitude: -84.19 })
    expect(things[0].logs[0].note).toBe('morning')
  })

  it('also accepts this app own export format', () => {
    const { things } = normalizeThings({ schemaVersion: 1, things: iosFile })
    expect(things).toHaveLength(1)
  })

  it('skips logs with unreadable dates and reports how many', () => {
    const broken = [{ name: 'Tea', color: { red: 0, green: 1, blue: 0 }, logs: [{ id: 'B1', date: 'rubbish' }] }]
    const { things, warnings } = normalizeThings(broken)
    expect(things[0].logs).toHaveLength(0)
    const skipped = warnings.find((warning) => warning.key === 'warn.skippedLogs')
    expect(skipped?.count).toBe(1)
  })

  it('warns about duplicate names, which broke charts in the iOS app', () => {
    const duplicates = [
      { name: 'Coffee', color: { red: 1, green: 0, blue: 0 }, logs: [] },
      { name: 'coffee', color: { red: 0, green: 0, blue: 1 }, logs: [] },
    ]
    const { warnings } = normalizeThings(duplicates)
    const duplicate = warnings.find((warning) => warning.key === 'warn.duplicateNames')
    expect(duplicate?.values?.names).toContain('coffee')
  })

  it('refuses a file that is not a list, rather than importing nothing silently', () => {
    const { things, warnings } = normalizeThings({ nope: true })
    expect(things).toHaveLength(0)
    expect(warnings).toEqual([{ key: 'warn.notAList' }])
  })
})

/**
 * Tests for writing CSV, focused on matching the iPhone's output exactly and on
 * round-tripping: what this app writes, this app must be able to read back.
 */

import { describe, expect, it } from 'vitest'
import type { Thing } from '../domain/types'
import { buildCsv, escapeCsvField, exportFilename } from './csvExport'
import { csvToThings } from './csv'

function thingWith(name: string, logs: Array<{ date: string; note?: string; lat?: number; lon?: number }>): Thing {
  return {
    id: `id-${name}`,
    name,
    color: { red: 1, green: 0, blue: 0 },
    creationDate: new Date(2026, 0, 1).toISOString(),
    logs: logs.map((log, index) => ({
      id: `${name}-${index}`,
      date: log.date,
      location: log.lat !== undefined && log.lon !== undefined ? { latitude: log.lat, longitude: log.lon } : null,
      note: log.note ?? null,
    })),
  }
}

const WIDE_RANGE = { startDate: new Date(2000, 0, 1), endDate: new Date(2035, 0, 1) }

describe('escapeCsvField', () => {
  it('leaves ordinary text alone', () => {
    expect(escapeCsvField('Coffee')).toBe('Coffee')
  })

  it('quotes fields containing a comma', () => {
    expect(escapeCsvField('strong, black')).toBe('"strong, black"')
  })

  it('doubles quotes inside a quoted field', () => {
    expect(escapeCsvField('she said "hi"')).toBe('"she said ""hi"""')
  })

  it('quotes fields containing a line break', () => {
    expect(escapeCsvField('one\ntwo')).toBe('"one\ntwo"')
  })
})

describe('buildCsv', () => {
  const coffee = thingWith('Coffee', [
    { date: new Date(2026, 2, 1, 9, 0).toISOString(), note: 'morning', lat: 34.02, lon: -84.19 },
    { date: new Date(2026, 2, 5, 15, 0).toISOString() },
  ])

  it('writes the same header as the iOS app', () => {
    const csv = buildCsv([coffee], { selectedThingIds: new Set(['id-Coffee']), ...WIDE_RANGE })
    expect(csv.split('\n')[0]).toBe('Thing Name,Timestamp,Latitude,Longitude,Note')
  })

  it('drops the milliseconds JavaScript adds, matching the phone', () => {
    const csv = buildCsv([coffee], { selectedThingIds: new Set(['id-Coffee']), ...WIDE_RANGE })
    expect(csv).not.toContain('.000Z')
    expect(csv).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/)
  })

  it('leaves location columns empty when there is no location', () => {
    const csv = buildCsv([coffee], { selectedThingIds: new Set(['id-Coffee']), ...WIDE_RANGE })
    const lastRow = csv.trim().split('\n')[2]
    expect(lastRow.endsWith(',,,')).toBe(true)
  })

  it('exports only the selected things', () => {
    const tea = thingWith('Tea', [{ date: new Date(2026, 2, 2, 9, 0).toISOString() }])
    const csv = buildCsv([coffee, tea], { selectedThingIds: new Set(['id-Tea']), ...WIDE_RANGE })
    expect(csv).toContain('Tea')
    expect(csv).not.toContain('Coffee')
  })

  it('includes logs on the end date itself', () => {
    const lateNight = thingWith('Night', [{ date: new Date(2026, 2, 5, 23, 45).toISOString() }])
    const csv = buildCsv([lateNight], {
      selectedThingIds: new Set(['id-Night']),
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 5),
    })
    expect(csv.trim().split('\n')).toHaveLength(2) // header + the one row
  })

  it('excludes logs outside the range', () => {
    const csv = buildCsv([coffee], {
      selectedThingIds: new Set(['id-Coffee']),
      startDate: new Date(2026, 2, 1),
      endDate: new Date(2026, 2, 2),
    })
    expect(csv.trim().split('\n')).toHaveLength(2)
  })

  it('returns just the header when nothing matches', () => {
    const csv = buildCsv([coffee], { selectedThingIds: new Set(), ...WIDE_RANGE })
    expect(csv.trim()).toBe('Thing Name,Timestamp,Latitude,Longitude,Note')
  })

  it('round-trips: what it writes, the importer reads back', () => {
    const tricky = thingWith('Coffee', [
      { date: new Date(2026, 2, 1, 9, 0).toISOString(), note: 'strong, with a "kick"', lat: 34.02, lon: -84.19 },
    ])
    const csv = buildCsv([tricky], { selectedThingIds: new Set(['id-Coffee']), ...WIDE_RANGE })
    const { things } = csvToThings(csv)

    expect(things).toHaveLength(1)
    expect(things[0].name).toBe('Coffee')
    expect(things[0].logs).toHaveLength(1)
    expect(things[0].logs[0].note).toBe('strong, with a "kick"')
    expect(things[0].logs[0].location).toEqual({ latitude: 34.02, longitude: -84.19 })
  })
})

describe('exportFilename', () => {
  it('leads with the date so exports sort by name', () => {
    expect(exportFilename()).toMatch(/^\d{4}-\d{2}-\d{2}-eventstracker-export\.csv$/)
  })

  it('includes a tidied thing name when exporting just one', () => {
    expect(exportFilename("Cleaned Lucky's Ears")).toContain('cleaned-lucky-s-ears')
  })
})

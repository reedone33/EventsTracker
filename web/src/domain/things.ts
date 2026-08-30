/**
 * Helper operations on Things and their logs.
 *
 * Everything here is a PURE function: it takes values in and returns new values
 * out, never changing what it was given and never touching the screen or
 * storage. That keeps this file testable on its own and makes the React code
 * simpler, because React needs new objects to notice that something changed.
 */

import type { LogEntry, LocationData, SortOption, Thing } from './types'
import { parseAppDate } from './dates'

/**
 * Generate a unique id.
 * `crypto.randomUUID` is built into modern browsers; the fallback covers
 * older browsers and non-secure (plain http) pages where it is unavailable.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

/** Build a brand-new Thing, ready to add to the list. */
export function createThing(name: string, color: Thing['color']): Thing {
  return {
    id: newId(),
    name: name.trim(),
    color,
    logs: [],
    creationDate: new Date().toISOString(),
  }
}

/** Build a new log entry for "this happened just now". */
export function createLogEntry(location?: LocationData | null, note?: string | null): LogEntry {
  return {
    id: newId(),
    date: new Date().toISOString(),
    location: location ?? null,
    note: note ?? null,
  }
}

/** The date of the most recent log, or null if the thing has never been logged. */
export function lastLogDate(thing: Thing): Date | null {
  let latest: Date | null = null
  for (const log of thing.logs) {
    const date = parseAppDate(log.date)
    if (!date) continue
    if (!latest || date > latest) latest = date
  }
  return latest
}

/** Logs newest-first, which is how every list in the app displays them. */
export function logsNewestFirst(thing: Thing): LogEntry[] {
  return [...thing.logs].sort((a, b) => {
    const dateA = parseAppDate(a.date)?.getTime() ?? 0
    const dateB = parseAppDate(b.date)?.getTime() ?? 0
    return dateB - dateA
  })
}

/**
 * Apply the search box and the sort menu, exactly as the iOS ContentView does.
 *
 * Note "manual" deliberately returns the list untouched: in that mode the order
 * IS the stored order, because the user arranged it by hand.
 */
export function visibleThings(
  things: Thing[],
  searchText: string,
  sortOption: SortOption,
): Thing[] {
  const query = searchText.trim().toLowerCase()
  const matching = query
    ? things.filter((thing) => thing.name.toLowerCase().includes(query))
    : things

  switch (sortOption) {
    case 'dateCreated': {
      // Newest first. Things with no creation date are treated as oldest,
      // matching the iOS app's use of `.distantPast` for missing dates.
      return [...matching].sort((a, b) => {
        const dateA = parseAppDate(a.creationDate)?.getTime() ?? -Infinity
        const dateB = parseAppDate(b.creationDate)?.getTime() ?? -Infinity
        return dateB - dateA
      })
    }
    case 'ascending':
      return [...matching].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      )
    case 'descending':
      return [...matching].sort((a, b) =>
        b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }),
      )
    case 'manual':
    default:
      return matching
  }
}

/** Total number of logs across every thing — used for import/export summaries. */
export function totalLogCount(things: Thing[]): number {
  return things.reduce((sum, thing) => sum + thing.logs.length, 0)
}

/**
 * Move one thing to a new position in the list.
 *
 * This is what "Manual" sorting stores: the order of the array IS the order on
 * screen, so rearranging the tiles means rearranging this list. Ported from the
 * iOS `moveThing(from:to:)`.
 *
 * Returns a NEW array — the original is left alone, which is what React needs
 * in order to notice that anything changed.
 */
export function moveThing(things: Thing[], fromIndex: number, toIndex: number): Thing[] {
  // Out-of-range or pointless moves return the list untouched, so a stray drag
  // can never scramble or drop an item.
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= things.length ||
    toIndex >= things.length
  ) {
    return things
  }

  const next = [...things]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

/** The same move, expressed as "put THIS thing where THAT one is". */
export function moveThingById(things: Thing[], movedId: string, targetId: string): Thing[] {
  return moveThing(
    things,
    things.findIndex((thing) => thing.id === movedId),
    things.findIndex((thing) => thing.id === targetId),
  )
}

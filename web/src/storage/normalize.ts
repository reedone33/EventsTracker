/**
 * Turning an unknown file's contents into trustworthy Thing objects.
 *
 * This is what lets the iOS app's things.json load into the web app. It is
 * deliberately forgiving about FORMAT (numbers vs text dates, missing optional
 * fields) and deliberately strict about SHAPE (anything that isn't recognisably
 * a Thing is skipped and reported, never silently half-imported).
 */

import type { ColorData, LocationData, LogEntry, Thing } from '../domain/types'
import { parseAppDate } from '../domain/dates'
import { newId } from '../domain/things'

/**
 * A note about something the import skipped or repaired.
 *
 * These are TRANSLATION KEYS, not finished sentences. The import code runs
 * nowhere near the screen and has no idea what language the user reads, so it
 * reports what happened and the interface decides how to say it.
 */
export interface ImportWarning {
  /** A key from the translation files, e.g. 'warn.skippedRows'. */
  key: string
  /** When present, the message has singular and plural forms chosen by this. */
  count?: number
  /** Extra values to fill into the message's {placeholders}. */
  values?: Record<string, string | number>
}

/** What happened during an import, so the user can be shown a real summary. */
export interface NormalizeResult {
  things: Thing[]
  /** Notes about anything that was skipped or repaired. */
  warnings: ImportWarning[]
}

/** Type guard: is this value a plain object we can read properties from? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read a colour, falling back to mid-grey if it is missing or malformed. */
function normalizeColor(value: unknown): ColorData {
  if (isRecord(value)) {
    const red = Number(value.red)
    const green = Number(value.green)
    const blue = Number(value.blue)
    if (Number.isFinite(red) && Number.isFinite(green) && Number.isFinite(blue)) {
      return { red, green, blue }
    }
  }
  return { red: 0.5, green: 0.5, blue: 0.5 }
}

/** Read a coordinate pair, or null if there wasn't a usable one. */
function normalizeLocation(value: unknown): LocationData | null {
  if (!isRecord(value)) return null
  const latitude = Number(value.latitude)
  const longitude = Number(value.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return { latitude, longitude }
}

/** Read one log entry. Returns null when there is no usable date, since a log without a date can't be charted. */
function normalizeLog(value: unknown): LogEntry | null {
  if (!isRecord(value)) return null

  const date = parseAppDate(value.date)
  if (!date) return null

  return {
    id: typeof value.id === 'string' && value.id ? value.id : newId(),
    date: date.toISOString(),
    location: normalizeLocation(value.location),
    note: typeof value.note === 'string' ? value.note : null,
  }
}

/**
 * Read a whole saved file.
 *
 * Accepts either the raw array the iOS app writes, or an object with a `things`
 * property (the shape this web app exports, which also carries a version tag).
 */
export function normalizeThings(raw: unknown): NormalizeResult {
  const warnings: ImportWarning[] = []

  // Unwrap our own export format if that's what we were given.
  let list: unknown = raw
  if (isRecord(raw) && Array.isArray(raw.things)) {
    list = raw.things
  }

  if (!Array.isArray(list)) {
    return { things: [], warnings: [{ key: 'warn.notAList' }] }
  }

  const things: Thing[] = []
  let skippedThings = 0
  let skippedLogs = 0

  for (const entry of list) {
    if (!isRecord(entry) || typeof entry.name !== 'string') {
      skippedThings += 1
      continue
    }

    const rawLogs = Array.isArray(entry.logs) ? entry.logs : []
    const logs: LogEntry[] = []
    for (const rawLog of rawLogs) {
      const log = normalizeLog(rawLog)
      if (log) {
        logs.push(log)
      } else {
        skippedLogs += 1
      }
    }

    const creationDate = parseAppDate(entry.creationDate)

    things.push({
      id: typeof entry.id === 'string' && entry.id ? entry.id : newId(),
      name: entry.name,
      color: normalizeColor(entry.color),
      logs,
      creationDate: creationDate ? creationDate.toISOString() : null,
    })
  }

  if (skippedThings > 0) {
    warnings.push({ key: 'warn.skippedThings', count: skippedThings })
  }
  if (skippedLogs > 0) {
    warnings.push({ key: 'warn.skippedLogs', count: skippedLogs })
  }

  // The iOS analytics code keys data by NAME, so two things sharing a name
  // silently merged into one series there. The web version keys by id instead,
  // but duplicate names are still confusing in a legend, so flag them.
  const nameCounts = new Map<string, number>()
  for (const thing of things) {
    const key = thing.name.toLowerCase()
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1)
  }
  const duplicates = [...nameCounts.entries()].filter(([, count]) => count > 1)
  if (duplicates.length > 0) {
    warnings.push({
      key: 'warn.duplicateNames',
      values: { names: duplicates.map(([name]) => name).join(', ') },
    })
  }

  return { things, warnings }
}

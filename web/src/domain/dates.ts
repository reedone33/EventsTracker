/**
 * Date handling — the single most error-prone part of this migration.
 *
 * TWO separate problems are solved in this file:
 *
 * 1. READING iOS DATES.
 *    Swift's JSONEncoder, when no date strategy is set (which is the case in
 *    the iOS app's DataStore), writes dates as a PLAIN NUMBER: seconds since
 *    1 January 2001. JavaScript counts from 1 January 1970. So an imported
 *    date arrives looking like 776500000, not like "2026-08-29". Feeding that
 *    straight to `new Date()` gives a date in 1970. `parseAppDate` fixes it.
 *
 * 2. GROUPING BY LOCAL TIME.
 *    The iOS app groups logs using Calendar.current, i.e. the phone's local
 *    timezone. The obvious JavaScript shortcut, `date.toISOString()`, uses UTC
 *    instead. In New York that shifts anything logged after 8pm into the next
 *    day, silently producing different numbers than the iOS app. Every helper
 *    below therefore uses the local-time getters (getFullYear, getMonth, ...)
 *    and never toISOString for grouping.
 */

/** Seconds between 1 Jan 1970 (JavaScript's zero) and 1 Jan 2001 (Swift's zero). */
const SWIFT_REFERENCE_DATE_OFFSET_SECONDS = 978_307_200

/**
 * Any number this large, read as a Swift reference date, would land after the
 * year 2039 — implausible for a log entry. So a number above this is assumed to
 * already be a normal Unix timestamp instead. This lets the importer accept
 * both formats without guessing wrong on real data.
 */
const IMPLAUSIBLE_SWIFT_SECONDS = 1_200_000_000

/**
 * Convert whatever a saved file contains into a real Date.
 * Accepts: Swift reference-date numbers, Unix timestamps, and ISO text.
 * Returns null if the value can't be understood, so callers can skip bad rows
 * rather than crashing on them.
 */
export function parseAppDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const seconds =
      value > IMPLAUSIBLE_SWIFT_SECONDS
        ? value // Already a Unix timestamp.
        : value + SWIFT_REFERENCE_DATE_OFFSET_SECONDS // Swift reference date.
    const date = new Date(seconds * 1000)
    return Number.isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

/** Store dates as ISO text. Used whenever we write to storage or export. */
export function toIsoString(date: Date): string {
  return date.toISOString()
}

/**
 * Midnight at the start of the given day, in LOCAL time.
 * Equivalent to Swift's `Calendar.current.startOfDay(for:)`.
 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Midnight on the first day of the month, local time. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

/** Midnight on 1 January of the year, local time. */
export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1)
}

/** Add whole days, correctly crossing month, year and daylight-saving boundaries. */
export function addDays(date: Date, count: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

/** True if the two dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * How the tile shows the most recent log, matching the iOS app's rule:
 * a time if it happened today, otherwise a short date.
 */
export function formatLastLogDate(date: Date): string {
  const now = new Date()
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return date.toLocaleDateString(undefined, {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Full date and time, used in log lists and detail screens. */
export function formatFullDateTime(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })
}

/** The "YYYY-MM-DD" text a browser date input expects, in LOCAL time. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The "YYYY-MM-DDTHH:MM" text a browser date-and-time input expects, in LOCAL
 * time. Built from the local parts rather than from toISOString(), which would
 * hand the input a UTC time and silently shift it.
 */
export function toDateTimeInputValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Read a date-and-time input back into a Date, treating what the user typed as
 * their local time. Returns null if the text isn't a usable date.
 */
export function parseDateTimeInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  const [, year, month, day, hour, minute] = match.map(Number)
  const date = new Date(year, month - 1, day, hour, minute)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Writing the CSV export — the mirror image of csv.ts, and a port of the iOS
 * ExportView.
 *
 * The output deliberately matches what the iPhone produces, column for column
 * and quote for quote. That means a file exported here can be opened by
 * anything that read the phone's exports, and can be imported straight back
 * into this app.
 */

import type { Thing } from '../domain/types'
import { addDays, parseAppDate, startOfDay } from '../domain/dates'

/** The column order, matching the iOS exporter exactly. */
const HEADERS = ['Thing Name', 'Timestamp', 'Latitude', 'Longitude', 'Note']

/**
 * Wrap a field in quotes if it contains anything that would otherwise break the
 * row, doubling any quotes inside it. Same rule as the iOS `escapeCSVField`.
 */
export function escapeCsvField(field: string): string {
  if (field === '') return ''
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

/**
 * Format a timestamp the way the iPhone does: ISO, in UTC, without the
 * fractional seconds JavaScript adds by default. Trimming them keeps the two
 * apps' files byte-identical in shape.
 */
function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export interface CsvExportOptions {
  /** Only these things are exported. */
  selectedThingIds: Set<string>
  /** Start of the range. Logs before this are left out. */
  startDate: Date
  /** End of the range, INCLUSIVE of the whole day. */
  endDate: Date
}

/** Build the CSV text. Returns headers only when nothing matched, never an empty string. */
export function buildCsv(things: Thing[], options: CsvExportOptions): string {
  const { selectedThingIds, startDate, endDate } = options

  // Same inclusive-end-date rule as everywhere else in the app: a date picker
  // hands over midnight, so the final day has to be reached to its end.
  const rangeStart = startDate.getTime()
  const rangeEnd = addDays(startOfDay(endDate), 1).getTime()

  const lines: string[] = [HEADERS.join(',')]

  for (const thing of things) {
    if (!selectedThingIds.has(thing.id)) continue

    // Oldest first, so the file reads chronologically.
    const logs = [...thing.logs].sort((a, b) => {
      const timeA = parseAppDate(a.date)?.getTime() ?? 0
      const timeB = parseAppDate(b.date)?.getTime() ?? 0
      return timeA - timeB
    })

    for (const log of logs) {
      const date = parseAppDate(log.date)
      if (!date) continue

      const time = date.getTime()
      if (time < rangeStart || time >= rangeEnd) continue

      lines.push(
        [
          escapeCsvField(thing.name),
          formatTimestamp(date),
          log.location ? String(log.location.latitude) : '',
          log.location ? String(log.location.longitude) : '',
          escapeCsvField(log.note ?? ''),
        ].join(','),
      )
    }
  }

  return `${lines.join('\n')}\n`
}

/** How many rows an export would contain, so the button can say so before it runs. */
export function countExportRows(things: Thing[], options: CsvExportOptions): number {
  // Subtract the header line, and the trailing newline's empty split.
  return buildCsv(things, options).trim().split('\n').length - 1
}

/**
 * A filename carrying the date it was made, so a folder of exports sorts
 * chronologically by name.
 */
export function exportFilename(thingName?: string): string {
  const stamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const suffix = thingName
    ? `-${thingName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
    : ''
  return `${stamp}-eventstracker-export${suffix}.csv`
}

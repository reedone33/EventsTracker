/**
 * Reading the iPhone app's CSV export.
 *
 * The iOS app can share a CSV but cannot hand over its internal save file, so
 * for most people this is the realistic way to bring history across.
 *
 * The export has five columns, always in this order:
 *
 *   Thing Name, Timestamp, Latitude, Longitude, Note
 *
 * What survives: every log, its exact time, its location and its note.
 * What does not: the colour of each thing (not a column), and the internal
 * IDs (which are regenerated). Colours are assigned from a validated set —
 * see domain/palette.ts — and can be changed afterwards.
 */

import type { LogEntry, LocationData, Thing } from '../domain/types'
import { parseAppDate } from '../domain/dates'
import { newId } from '../domain/things'
import { colorForIndex, DISTINCT_COLOR_COUNT } from '../domain/palette'
import type { ImportWarning, NormalizeResult } from './normalize'

/**
 * Split CSV text into rows of fields.
 *
 * Written by hand rather than pulled from a library because CSV has exactly
 * three rules and a library would be a whole dependency for them:
 *   - fields are separated by commas
 *   - a field wrapped in quotes may contain commas and line breaks
 *   - a doubled quote inside a quoted field means one literal quote
 * The iOS exporter follows all three, so notes containing commas survive.
 */
export function parseCsvRows(text: string): string[][] {
  // Strip the byte-order mark some programs add, which would otherwise become
  // part of the first column's name.
  const input = text.replace(/^﻿/, '')

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]

    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"' // A doubled quote is one real quote.
          index += 1
        } else {
          inQuotes = false // Closing quote.
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      // Treat CRLF as one break, not two.
      if (char === '\r' && input[index + 1] === '\n') index += 1
      row.push(field)
      field = ''
      rows.push(row)
      row = []
    } else {
      field += char
    }
  }

  // Whatever is left when the text runs out is the final row.
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  // Drop blank lines, which trailing newlines produce.
  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ''))
}

/** Read a coordinate, or null when the column was empty. */
function parseCoordinate(latitude: string, longitude: string): LocationData | null {
  if (latitude.trim() === '' || longitude.trim() === '') return null
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return { latitude: lat, longitude: lon }
}

/**
 * Turn CSV text into things ready to import.
 *
 * Rows are grouped by the name in the first column, so every log for "Coffee"
 * ends up inside one Coffee thing — reproducing the structure the app expects.
 */
export function csvToThings(text: string): NormalizeResult {
  const warnings: ImportWarning[] = []
  const rows = parseCsvRows(text)

  if (rows.length === 0) {
    return { things: [], warnings: [{ key: 'warn.fileEmpty' }] }
  }

  // Identify the header by testing whether its timestamp column is a real date.
  // Checking the data rather than the words means this works whatever language
  // the phone exported in — the iOS app translates its column headings.
  const firstRow = rows[0]
  const looksLikeHeader = firstRow.length < 2 || parseAppDate(firstRow[1]) === null
  const dataRows = looksLikeHeader ? rows.slice(1) : rows

  if (dataRows.length === 0) {
    return { things: [], warnings: [{ key: 'warn.headersOnly' }] }
  }

  // Group logs under their thing name, remembering the order names first appear
  // so colours are handed out predictably.
  const logsByName = new Map<string, LogEntry[]>()
  let skippedRows = 0

  for (const row of dataRows) {
    const name = (row[0] ?? '').trim()
    const date = parseAppDate(row[1] ?? '')

    if (name === '' || !date) {
      skippedRows += 1
      continue
    }

    const entry: LogEntry = {
      id: newId(),
      date: date.toISOString(),
      location: parseCoordinate(row[2] ?? '', row[3] ?? ''),
      note: (row[4] ?? '').trim() === '' ? null : row[4],
    }

    const existing = logsByName.get(name)
    if (existing) {
      existing.push(entry)
    } else {
      logsByName.set(name, [entry])
    }
  }

  const things: Thing[] = [...logsByName.entries()].map(([name, logs], index) => {
    // Oldest log stands in for a creation date, which the CSV doesn't carry.
    // It is the closest true statement available: the thing existed by then.
    const earliest = logs.reduce((oldest, log) => (log.date < oldest ? log.date : oldest), logs[0].date)

    return {
      id: newId(),
      name,
      color: colorForIndex(index),
      logs,
      creationDate: earliest,
    }
  })

  if (skippedRows > 0) {
    warnings.push({ key: 'warn.skippedRows', count: skippedRows })
  }

  warnings.push({ key: 'warn.colorsAssigned' })

  if (things.length > DISTINCT_COLOR_COUNT) {
    warnings.push({
      key: 'warn.tooManyColors',
      count: things.length,
      values: { limit: DISTINCT_COLOR_COUNT },
    })
  }

  return { things, warnings }
}

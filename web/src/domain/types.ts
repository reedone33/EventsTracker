/**
 * The domain model, ported one-for-one from the iOS app's Models.swift.
 *
 * IMPORTANT: these shapes intentionally match the Swift structs exactly, because
 * the iOS app's saved file (things.json) must load into this web app unchanged.
 * If you rename or restructure anything here, old data stops importing.
 *
 * One difference from Swift: dates are stored as ISO text strings
 * (e.g. "2026-08-29T14:30:00.000Z") rather than as Date objects. JavaScript
 * cannot store a real Date inside JSON, so text is the safe interchange format.
 * Code that needs to do date math converts with `new Date(entry.date)`.
 */

/** A colour, stored as three channels from 0.0 to 1.0 (matching SwiftUI). */
export interface ColorData {
  red: number
  green: number
  blue: number
}

/** A geographic coordinate captured when an event was logged. */
export interface LocationData {
  latitude: number
  longitude: number
}

/** A single occurrence of an event — one tap of a tile. */
export interface LogEntry {
  id: string
  /** ISO date string. Use `new Date(...)` to do maths on it. */
  date: string
  /** Where it happened, if location was available. */
  location?: LocationData | null
  /** Optional free-text note. */
  note?: string | null
}

/**
 * A tracked thing, e.g. "Coffee" or "Workout".
 *
 * Note that logs are stored INSIDE the thing rather than in a separate list.
 * This mirrors the iOS app and is what all the analytics code expects.
 */
export interface Thing {
  id: string
  name: string
  color: ColorData
  logs: LogEntry[]
  /** ISO date string, or missing on things created by very early app versions. */
  creationDate?: string | null
}

/** How the main grid is ordered. Mirrors SortOption in the iOS ContentView. */
export type SortOption = 'dateCreated' | 'ascending' | 'descending' | 'manual'

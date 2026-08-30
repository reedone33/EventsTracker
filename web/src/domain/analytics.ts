/**
 * The analytics engine, ported from AnalyticsView.swift.
 *
 * This file is the heart of the migration. Everything here is a pure
 * calculation: data in, data out, no React and no screen drawing. That is
 * deliberate — it means these numbers can be tested automatically and proven
 * to match the iPhone app before a single chart is drawn.
 *
 * TWO CHANGES were made on purpose while porting. Both are noted again where
 * they happen:
 *
 * 1. Data is keyed by a thing's ID rather than its NAME. The iOS version keyed
 *    by name, so two things both called "Coffee" silently merged into one and
 *    one of them lost all its data.
 *
 * 2. The per-thing chart and the comparison chart share one function here.
 *    iOS had two separate implementations that drifted apart.
 */

import type { ColorData, LogEntry, Thing } from './types'
import { addDays, parseAppDate, startOfDay, startOfMonth, startOfYear } from './dates'

// --- Options the user can pick, mirroring the iOS enums --------------------

/** How the frequency chart buckets time. Mirrors DateGranularity. */
export type DateGranularity = 'day' | 'month' | 'year'

/** How finely the time-of-day chart groups logs. Mirrors TimeDetailScale. */
export type TimeDetailScale = 'hourly' | 'byMinute'

/** Which chart is showing. Mirrors ChartType. */
export type ChartType = 'frequency' | 'timeOfDay'

// --- Shapes the charts consume --------------------------------------------

/** One point on the frequency chart: how many times a thing happened in one bucket. */
export interface FrequencyPoint {
  date: Date
  count: number
  thingId: string
  thingName: string
  color: ColorData
}

/** One point on the time-of-day chart: when in the day something happened. */
export interface TimeOfDayPoint {
  date: Date
  /** Time as a decimal, so 14:30 becomes 14.5. Matches the iOS calculation. */
  hour: number
  /** How many logs fell in this bucket. Drives the size of the dot. */
  count: number
  thingId: string
  thingName: string
  color: ColorData
}

/** One entry in the chart legend. */
export interface LegendEntry {
  thingId: string
  name: string
  color: ColorData
}

/** A thing paired with only the logs that passed the current filters. */
export interface FilteredThing {
  thing: Thing
  logs: LogEntry[]
}

// --- Filtering -------------------------------------------------------------

/**
 * Keep only the selected things, and only their logs inside the date range.
 *
 * The end date is INCLUSIVE of its whole day. A date picker hands over midnight
 * at the start of the chosen day, so without this adjustment the final day's
 * logs would all be excluded. The iOS code does exactly the same thing by
 * advancing to the start of the next day and comparing with "less than".
 */
export function filterThingsWithLogs(
  things: Thing[],
  selectedThingIds: Set<string>,
  startDate: Date,
  endDate: Date,
): FilteredThing[] {
  const rangeStart = startDate.getTime()
  const rangeEnd = addDays(startOfDay(endDate), 1).getTime()

  return things
    .filter((thing) => selectedThingIds.has(thing.id))
    .map((thing) => ({
      thing,
      logs: thing.logs.filter((log) => {
        const date = parseAppDate(log.date)
        if (!date) return false
        const time = date.getTime()
        return time >= rangeStart && time < rangeEnd
      }),
    }))
}

// --- Bucketing helpers -----------------------------------------------------

/**
 * Snap a date to the start of its bucket, in LOCAL time.
 * Local time matters: the iPhone groups by the phone's own calendar, so using
 * UTC here would move evening logs onto the following day.
 */
function bucketStart(date: Date, granularity: DateGranularity): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(date)
    case 'month':
      return startOfMonth(date)
    case 'year':
      return startOfYear(date)
  }
}

/** Move to the start of the next bucket. */
function nextBucket(date: Date, granularity: DateGranularity): Date {
  switch (granularity) {
    case 'day':
      return addDays(date, 1)
    case 'month':
      return new Date(date.getFullYear(), date.getMonth() + 1, 1)
    case 'year':
      return new Date(date.getFullYear() + 1, 0, 1)
  }
}

// --- Frequency chart -------------------------------------------------------

/**
 * Count how often each thing happened, bucket by bucket.
 *
 * The important behaviour: every bucket in the range gets a point for every
 * selected thing, INCLUDING buckets with no logs, which get a count of zero.
 * That zero-filling is what makes the chart show a continuous line with real
 * dates along the axis, rather than jumping across empty stretches. It is the
 * behaviour added in the iOS app's most recent commit, and it must be kept.
 */
export function buildFrequencyData(
  filtered: FilteredThing[],
  startDate: Date,
  endDate: Date,
  granularity: DateGranularity,
): FrequencyPoint[] {
  if (filtered.length === 0) return []

  // Count logs per thing per bucket.
  // Keyed by thing ID, NOT name — this is the duplicate-name bug fix.
  const countsByThing = new Map<string, Map<number, number>>()

  for (const { thing, logs } of filtered) {
    const buckets = new Map<number, number>()
    for (const log of logs) {
      const date = parseAppDate(log.date)
      if (!date) continue
      const key = bucketStart(date, granularity).getTime()
      buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }
    countsByThing.set(thing.id, buckets)
  }

  // Walk every bucket in the range, emitting a point per thing.
  const points: FrequencyPoint[] = []
  let current = bucketStart(startDate, granularity)
  const last = bucketStart(endDate, granularity)

  // A generous ceiling so a nonsensical range can never hang the browser.
  let guard = 0
  const MAX_BUCKETS = 20_000

  while (current.getTime() <= last.getTime() && guard < MAX_BUCKETS) {
    for (const { thing } of filtered) {
      points.push({
        date: new Date(current),
        count: countsByThing.get(thing.id)?.get(current.getTime()) ?? 0,
        thingId: thing.id,
        thingName: thing.name,
        color: thing.color,
      })
    }
    current = nextBucket(current, granularity)
    guard += 1
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// --- Time-of-day chart -----------------------------------------------------

/**
 * Work out what time of day each thing tends to happen.
 *
 * Logs are grouped by hour (or by minute), then plotted with the day along the
 * bottom and the time of day up the side. Where several logs share a bucket the
 * count rises, which the chart shows as a bigger dot.
 */
export function buildTimeOfDayData(
  filtered: FilteredThing[],
  scale: TimeDetailScale,
): TimeOfDayPoint[] {
  const points: TimeOfDayPoint[] = []

  for (const { thing, logs } of filtered) {
    // Group logs that share the same hour (or the same minute).
    const groups = new Map<string, { date: Date; count: number }>()

    for (const log of logs) {
      const date = parseAppDate(log.date)
      if (!date) continue

      // Build the grouping key from LOCAL time parts.
      const key =
        scale === 'hourly'
          ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
          : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`

      const existing = groups.get(key)
      if (existing) {
        existing.count += 1
      } else {
        groups.set(key, { date, count: 1 })
      }
    }

    for (const { date, count } of groups.values()) {
      points.push({
        // The day, used for the horizontal axis.
        date: startOfDay(date),
        // The time within that day, as a decimal. 14:30 becomes 14.5.
        hour: date.getHours() + date.getMinutes() / 60,
        count,
        thingId: thing.id,
        thingName: thing.name,
        color: thing.color,
      })
    }
  }

  return points.sort((a, b) => a.date.getTime() - b.date.getTime())
}

// --- Legend and axis -------------------------------------------------------

/**
 * Build the legend. Selected things appear even when they have no logs in the
 * chosen range, matching iOS, so a thing never silently vanishes from the key.
 * Sorted by name, as the iOS version does.
 */
export function buildLegend(things: Thing[], selectedThingIds: Set<string>): LegendEntry[] {
  return things
    .filter((thing) => selectedThingIds.has(thing.id))
    .map((thing) => ({ thingId: thing.id, name: thing.name, color: thing.color }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

/** The largest count in the data, used to scale the vertical axis. */
export function maxFrequencyCount(points: FrequencyPoint[]): number {
  return points.reduce((max, point) => Math.max(max, point.count), 0) || 1
}

/**
 * Pick a sensible gap between vertical axis labels, so a chart reaching 400
 * doesn't try to print 400 separate numbers.
 *
 * Ported directly from the iOS calculation: count every value below 10, and
 * above that use half the nearest power of ten (so 5, 50, 500 and so on).
 */
export function yAxisStride(maxCount: number): number {
  if (maxCount < 10) return 1
  const step = Math.pow(10, Math.floor(Math.log10(maxCount))) / 2
  return Math.max(1, Math.round(step))
}

/** The actual numbers to label on the vertical axis. */
export function yAxisValues(maxCount: number): number[] {
  const stride = yAxisStride(maxCount)
  if (stride <= 0) return []
  const values: number[] = []
  for (let value = 0; value <= maxCount + 1; value += stride) {
    values.push(value)
  }
  return values
}

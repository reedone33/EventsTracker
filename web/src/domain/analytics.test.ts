/**
 * Tests proving the ported analytics behave like the iPhone app.
 *
 * These exist because the numbers are the whole point of the app. A chart that
 * looks right but counts wrong is worse than no chart, and the failure would be
 * invisible without checks like these.
 */

import { describe, expect, it } from 'vitest'
import type { Thing } from './types'
import {
  buildFrequencyData,
  buildLegend,
  buildTimeOfDayData,
  filterThingsWithLogs,
  maxFrequencyCount,
  yAxisStride,
  yAxisValues,
} from './analytics'

/** Build a test thing quickly. Dates are given as local "YYYY-MM-DD HH:MM". */
function makeThing(id: string, name: string, logTimes: string[]): Thing {
  return {
    id,
    name,
    color: { red: 1, green: 0, blue: 0 },
    creationDate: new Date(2026, 0, 1).toISOString(),
    logs: logTimes.map((text, index) => {
      const [datePart, timePart = '12:00'] = text.split(' ')
      const [year, month, day] = datePart.split('-').map(Number)
      const [hour, minute] = timePart.split(':').map(Number)
      // Built with local-time parts on purpose, matching how a phone records them.
      return {
        id: `${id}-log-${index}`,
        date: new Date(year, month - 1, day, hour, minute).toISOString(),
        location: null,
        note: null,
      }
    }),
  }
}

describe('filterThingsWithLogs', () => {
  const coffee = makeThing('c1', 'Coffee', ['2026-03-01 09:00', '2026-03-05 09:00', '2026-04-01 09:00'])

  it('keeps only the selected things', () => {
    const tea = makeThing('t1', 'Tea', ['2026-03-02 09:00'])
    const result = filterThingsWithLogs([coffee, tea], new Set(['c1']), new Date(2026, 0, 1), new Date(2026, 11, 31))
    expect(result).toHaveLength(1)
    expect(result[0].thing.name).toBe('Coffee')
  })

  it('includes logs on the end date itself, right up to bedtime', () => {
    // The classic off-by-one: a date picker gives midnight, so an inclusive end
    // date has to reach to the end of that day.
    const lateNight = makeThing('n1', 'Night', ['2026-03-05 23:45'])
    const result = filterThingsWithLogs([lateNight], new Set(['n1']), new Date(2026, 2, 1), new Date(2026, 2, 5))
    expect(result[0].logs).toHaveLength(1)
  })

  it('excludes logs after the end date', () => {
    const result = filterThingsWithLogs([coffee], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 31))
    expect(result[0].logs).toHaveLength(2) // The 1 April log is outside the range.
  })
})

describe('buildFrequencyData', () => {
  it('fills empty days with zero so the line stays continuous', () => {
    // Two logs three days apart. The gap days must still produce points.
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 09:00', '2026-03-04 09:00'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 4))
    const points = buildFrequencyData(filtered, new Date(2026, 2, 1), new Date(2026, 2, 4), 'day')

    expect(points).toHaveLength(4) // 1, 2, 3 and 4 March.
    expect(points.map((point) => point.count)).toEqual([1, 0, 0, 1])
  })

  it('counts several logs in the same day together', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 08:00', '2026-03-01 14:00', '2026-03-01 20:00'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 1))
    const points = buildFrequencyData(filtered, new Date(2026, 2, 1), new Date(2026, 2, 1), 'day')
    expect(points).toHaveLength(1)
    expect(points[0].count).toBe(3)
  })

  it('keeps a late-evening log on its own local day, not the next one', () => {
    // This is the UTC trap. In New York, 11:45pm on 1 March is 4:45am on
    // 2 March in UTC — so a UTC-based grouping would put it on the wrong day.
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 23:45'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 2))
    const points = buildFrequencyData(filtered, new Date(2026, 2, 1), new Date(2026, 2, 2), 'day')

    const firstOfMarch = points.find((point) => point.date.getDate() === 1)
    const secondOfMarch = points.find((point) => point.date.getDate() === 2)
    expect(firstOfMarch?.count).toBe(1)
    expect(secondOfMarch?.count).toBe(0)
  })

  it('groups by month', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-01-05 09:00', '2026-01-20 09:00', '2026-03-02 09:00'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 0, 1), new Date(2026, 2, 31))
    const points = buildFrequencyData(filtered, new Date(2026, 0, 1), new Date(2026, 2, 31), 'month')

    expect(points).toHaveLength(3) // January, February, March.
    expect(points.map((point) => point.count)).toEqual([2, 0, 1])
  })

  it('groups by year', () => {
    const thing = makeThing('c1', 'Coffee', ['2024-06-01 09:00', '2026-06-01 09:00'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2024, 0, 1), new Date(2026, 11, 31))
    const points = buildFrequencyData(filtered, new Date(2024, 0, 1), new Date(2026, 11, 31), 'year')

    expect(points).toHaveLength(3) // 2024, 2025, 2026.
    expect(points.map((point) => point.count)).toEqual([1, 0, 1])
  })

  it('keeps two things with the SAME NAME separate', () => {
    // The iOS version keyed its data by name, so one of these silently
    // overwrote the other and its logs disappeared from the chart.
    const first = makeThing('a1', 'Coffee', ['2026-03-01 09:00'])
    const second = makeThing('b2', 'Coffee', ['2026-03-01 09:00', '2026-03-01 15:00'])

    const filtered = filterThingsWithLogs([first, second], new Set(['a1', 'b2']), new Date(2026, 2, 1), new Date(2026, 2, 1))
    const points = buildFrequencyData(filtered, new Date(2026, 2, 1), new Date(2026, 2, 1), 'day')

    expect(points).toHaveLength(2)
    expect(points.find((point) => point.thingId === 'a1')?.count).toBe(1)
    expect(points.find((point) => point.thingId === 'b2')?.count).toBe(2)
  })

  it('emits a point for every selected thing on every day', () => {
    const coffee = makeThing('c1', 'Coffee', ['2026-03-01 09:00'])
    const tea = makeThing('t1', 'Tea', [])
    const filtered = filterThingsWithLogs([coffee, tea], new Set(['c1', 't1']), new Date(2026, 2, 1), new Date(2026, 2, 2))
    const points = buildFrequencyData(filtered, new Date(2026, 2, 1), new Date(2026, 2, 2), 'day')

    expect(points).toHaveLength(4) // 2 things x 2 days.
  })

  it('returns nothing when no things are selected', () => {
    expect(buildFrequencyData([], new Date(2026, 2, 1), new Date(2026, 2, 5), 'day')).toEqual([])
  })

  it('returns nothing when the range runs backwards', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 09:00'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 5), new Date(2026, 2, 1))
    const points = buildFrequencyData(filtered, new Date(2026, 2, 5), new Date(2026, 2, 1), 'day')
    expect(points).toEqual([])
  })
})

describe('buildTimeOfDayData', () => {
  it('turns a clock time into a decimal hour', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 14:30'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 1))
    const points = buildTimeOfDayData(filtered, 'byMinute')

    expect(points).toHaveLength(1)
    expect(points[0].hour).toBe(14.5) // 14:30 is half past two.
  })

  it('merges logs in the same hour and raises the count', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 09:05', '2026-03-01 09:40'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 1))
    const points = buildTimeOfDayData(filtered, 'hourly')

    expect(points).toHaveLength(1)
    expect(points[0].count).toBe(2)
  })

  it('keeps them separate at the finer by-minute scale', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 09:05', '2026-03-01 09:40'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 1))
    const points = buildTimeOfDayData(filtered, 'byMinute')

    expect(points).toHaveLength(2)
    expect(points.every((point) => point.count === 1)).toBe(true)
  })

  it('places the point on the correct local day', () => {
    const thing = makeThing('c1', 'Coffee', ['2026-03-01 23:45'])
    const filtered = filterThingsWithLogs([thing], new Set(['c1']), new Date(2026, 2, 1), new Date(2026, 2, 1))
    const points = buildTimeOfDayData(filtered, 'hourly')

    expect(points[0].date.getDate()).toBe(1)
    expect(points[0].hour).toBeCloseTo(23.75)
  })
})

describe('buildLegend', () => {
  it('sorts by name and includes things with no logs', () => {
    const zebra = makeThing('z1', 'Zebra', [])
    const apple = makeThing('a1', 'Apple', ['2026-03-01 09:00'])
    const legend = buildLegend([zebra, apple], new Set(['z1', 'a1']))
    expect(legend.map((entry) => entry.name)).toEqual(['Apple', 'Zebra'])
  })

  it('leaves out things that are not selected', () => {
    const coffee = makeThing('c1', 'Coffee', [])
    const tea = makeThing('t1', 'Tea', [])
    expect(buildLegend([coffee, tea], new Set(['c1']))).toHaveLength(1)
  })
})

describe('vertical axis scaling', () => {
  it('labels every value on small charts', () => {
    expect(yAxisStride(1)).toBe(1)
    expect(yAxisStride(9)).toBe(1)
  })

  it('spreads labels out on larger charts', () => {
    expect(yAxisStride(10)).toBe(5)
    expect(yAxisStride(99)).toBe(5)
    expect(yAxisStride(100)).toBe(50)
  })

  it('produces labels from zero up past the maximum', () => {
    expect(yAxisValues(4)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it('never reports a maximum of zero, which would flatten the chart', () => {
    expect(maxFrequencyCount([])).toBe(1)
  })
})

/**
 * Tests for the date helpers that shape what appears on screen.
 *
 * The parsing and grouping helpers are covered in analytics.test.ts and
 * normalize.test.ts; these cover the formatting rules, which are easy to
 * change by accident and only noticed by eye.
 */

import { describe, expect, it } from 'vitest'
import { formatLastLogDate, isSameDay, startOfDay, toDateInputValue, toDateTimeInputValue } from './dates'

describe('formatLastLogDate', () => {
  it('shows a full date for something logged long ago', () => {
    const formatted = formatLastLogDate(new Date(2026, 5, 1, 9, 30))
    expect(formatted).toContain('2026')
    expect(formatted).toContain('6')
    expect(formatted).toContain('1')
  })

  it('ALSO shows a full date for something logged today, not a time', () => {
    // The iOS app showed a time here. On a grid of tiles that reads oddly,
    // and hides the date on exactly the tile you just tapped.
    const today = new Date()
    today.setHours(12, 37, 0, 0)

    const formatted = formatLastLogDate(today)
    expect(formatted).toContain(String(today.getFullYear()))
    // No AM/PM and no colon: this is a date, not a clock time.
    expect(formatted).not.toMatch(/[AP]M/i)
    expect(formatted).not.toContain(':')
  })

  it('formats every tile the same way, whatever the time of day', () => {
    const morning = new Date(2026, 2, 5, 6, 0)
    const night = new Date(2026, 2, 5, 23, 45)
    expect(formatLastLogDate(morning)).toBe(formatLastLogDate(night))
  })
})

describe('isSameDay', () => {
  it('is true within one local day', () => {
    expect(isSameDay(new Date(2026, 2, 5, 0, 1), new Date(2026, 2, 5, 23, 59))).toBe(true)
  })

  it('is false across midnight', () => {
    expect(isSameDay(new Date(2026, 2, 5, 23, 59), new Date(2026, 2, 6, 0, 1))).toBe(false)
  })
})

describe('input formatting', () => {
  it('writes a date input value in local time', () => {
    // Late evening must keep its own local date, not roll over in UTC.
    expect(toDateInputValue(new Date(2026, 2, 5, 23, 30))).toBe('2026-03-05')
  })

  it('writes a date-and-time input value in local time', () => {
    expect(toDateTimeInputValue(new Date(2026, 2, 5, 23, 30))).toBe('2026-03-05T23:30')
  })

  it('startOfDay keeps the local day', () => {
    expect(startOfDay(new Date(2026, 2, 5, 23, 30)).getDate()).toBe(5)
  })
})

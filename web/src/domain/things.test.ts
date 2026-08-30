/**
 * Tests for rearranging things — the "Manual" sort order.
 *
 * Reordering is the one operation that can silently lose or duplicate an item
 * if the index maths is wrong, so every case checks the list still holds
 * exactly what it started with.
 */

import { describe, expect, it } from 'vitest'
import type { Thing } from './types'
import { moveThing, moveThingById, visibleThings } from './things'

function make(id: string): Thing {
  return {
    id,
    name: id,
    color: { red: 1, green: 0, blue: 0 },
    logs: [],
    creationDate: new Date(2026, 0, 1).toISOString(),
  }
}

const list = [make('a'), make('b'), make('c'), make('d')]
const names = (things: Thing[]) => things.map((thing) => thing.id).join('')

describe('moveThing', () => {
  it('moves an item later in the list', () => {
    expect(names(moveThing(list, 0, 2))).toBe('bcad')
  })

  it('moves an item earlier in the list', () => {
    expect(names(moveThing(list, 3, 0))).toBe('dabc')
  })

  it('moves an item one place', () => {
    expect(names(moveThing(list, 1, 2))).toBe('acbd')
  })

  it('never loses or duplicates anything', () => {
    for (let from = 0; from < list.length; from += 1) {
      for (let to = 0; to < list.length; to += 1) {
        const result = moveThing(list, from, to)
        expect(result).toHaveLength(list.length)
        expect(new Set(result.map((thing) => thing.id)).size).toBe(list.length)
      }
    }
  })

  it('leaves the list alone for a move that goes nowhere', () => {
    expect(moveThing(list, 2, 2)).toBe(list)
  })

  it('leaves the list alone for out-of-range positions', () => {
    expect(moveThing(list, -1, 2)).toBe(list)
    expect(moveThing(list, 0, 99)).toBe(list)
  })

  it('does not modify the original list', () => {
    moveThing(list, 0, 3)
    expect(names(list)).toBe('abcd')
  })
})

describe('moveThingById', () => {
  it('puts one thing where another was', () => {
    expect(names(moveThingById(list, 'a', 'c'))).toBe('bcad')
  })

  it('ignores ids that are not in the list', () => {
    expect(moveThingById(list, 'a', 'zzz')).toBe(list)
  })
})

describe('visibleThings in manual mode', () => {
  it('returns the stored order, untouched', () => {
    // Manual sorting means the array order IS the order, so nothing may be
    // rearranged on the way to the screen.
    expect(names(visibleThings(list, '', 'manual'))).toBe('abcd')
  })

  it('still filters by the search box', () => {
    expect(names(visibleThings(list, 'b', 'manual'))).toBe('b')
  })
})

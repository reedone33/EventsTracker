/**
 * Tests for map grouping — mainly that the 300-foot rule behaves, and that two
 * things at the same spot stay on separate pins.
 */

import { describe, expect, it } from 'vitest'
import type { Thing } from './types'
import { boundsFor, countLocatedLogs, distanceInMetres, groupLocations } from './mapClusters'

/** Reed's rough neighbourhood, used as a realistic starting point. */
const HOME = { lat: 34.0289, lon: -84.1986 }

function thingAt(id: string, name: string, points: Array<{ lat: number; lon: number } | null>): Thing {
  return {
    id,
    name,
    color: { red: 1, green: 0, blue: 0 },
    creationDate: new Date(2026, 0, 1).toISOString(),
    logs: points.map((point, index) => ({
      id: `${id}-${index}`,
      date: new Date(2026, 2, 1, 9, index).toISOString(),
      location: point ? { latitude: point.lat, longitude: point.lon } : null,
      note: null,
    })),
  }
}

const asFiltered = (things: Thing[]) => things.map((thing) => ({ thing, logs: thing.logs }))

describe('distanceInMetres', () => {
  it('is zero for the same point', () => {
    expect(distanceInMetres(HOME.lat, HOME.lon, HOME.lat, HOME.lon)).toBe(0)
  })

  it('measures a known separation about right', () => {
    // 0.001 degrees of latitude is roughly 111 metres anywhere on Earth.
    const distance = distanceInMetres(HOME.lat, HOME.lon, HOME.lat + 0.001, HOME.lon)
    expect(distance).toBeGreaterThan(105)
    expect(distance).toBeLessThan(117)
  })
})

describe('groupLocations', () => {
  it('merges nearby logs of the same thing into one pin', () => {
    // Three logs within a few metres of each other.
    const thing = thingAt('t1', 'Water Porch', [
      { lat: HOME.lat, lon: HOME.lon },
      { lat: HOME.lat + 0.0001, lon: HOME.lon },
      { lat: HOME.lat, lon: HOME.lon + 0.0001 },
    ])

    const clusters = groupLocations(asFiltered([thing]))
    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(3)
  })

  it('keeps distant logs on separate pins', () => {
    // 0.01 degrees is over a kilometre — far beyond the 300-foot radius.
    const thing = thingAt('t1', 'Ring', [
      { lat: HOME.lat, lon: HOME.lon },
      { lat: HOME.lat + 0.01, lon: HOME.lon },
    ])

    expect(groupLocations(asFiltered([thing]))).toHaveLength(2)
  })

  it('keeps two different things at the same spot apart', () => {
    // The iOS version grouped on name and colour; this keys on id.
    const first = thingAt('t1', 'Water Porch', [{ lat: HOME.lat, lon: HOME.lon }])
    const second = thingAt('t2', 'Water FOH', [{ lat: HOME.lat, lon: HOME.lon }])

    const clusters = groupLocations(asFiltered([first, second]))
    expect(clusters).toHaveLength(2)
  })

  it('ignores logs with no location', () => {
    const thing = thingAt('t1', 'Entyvio', [null, null, { lat: HOME.lat, lon: HOME.lon }])
    const clusters = groupLocations(asFiltered([thing]))
    expect(clusters).toHaveLength(1)
    expect(clusters[0].count).toBe(1)
  })

  it('returns nothing when no log has a location', () => {
    const thing = thingAt('t1', 'Headache', [null, null])
    expect(groupLocations(asFiltered([thing]))).toEqual([])
  })
})

describe('boundsFor', () => {
  it('returns null when there is nothing to show', () => {
    expect(boundsFor([])).toBeNull()
  })

  it('puts a small box around a lone pin instead of a zero-sized one', () => {
    const thing = thingAt('t1', 'Ring', [{ lat: HOME.lat, lon: HOME.lon }])
    const bounds = boundsFor(groupLocations(asFiltered([thing])))
    expect(bounds).not.toBeNull()
    expect(bounds!.north).toBeGreaterThan(bounds!.south)
    expect(bounds!.east).toBeGreaterThan(bounds!.west)
  })

  it('covers every pin, with margin', () => {
    const thing = thingAt('t1', 'Ring', [
      { lat: HOME.lat, lon: HOME.lon },
      { lat: HOME.lat + 0.02, lon: HOME.lon + 0.02 },
    ])
    const bounds = boundsFor(groupLocations(asFiltered([thing])))!
    expect(bounds.south).toBeLessThan(HOME.lat)
    expect(bounds.north).toBeGreaterThan(HOME.lat + 0.02)
  })
})

describe('countLocatedLogs', () => {
  it('counts only logs that carry a location', () => {
    const thing = thingAt('t1', 'Ring', [{ lat: HOME.lat, lon: HOME.lon }, null, null])
    expect(countLocatedLogs([thing])).toBe(1)
  })
})

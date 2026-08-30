/**
 * Grouping log locations for the map — ported from SharedMapComponents.swift.
 *
 * Without grouping, logging the same thing at home fifty times draws fifty
 * identical pins on top of each other. Instead, logs of the SAME thing within
 * 300 feet of each other become one pin carrying a count.
 *
 * As elsewhere in this port, grouping is keyed by the thing's ID rather than
 * its name — the iOS version matched on name and colour, so two things sharing
 * a name would have had their pins merged.
 */

import type { ColorData, Thing } from './types'

/** 300 feet in metres — the iOS clustering distance, unchanged. */
export const CLUSTER_RADIUS_METRES = 300 * 0.3048

/** A pin on the map: a place, a count, and which thing it belongs to. */
export interface LocationCluster {
  id: string
  latitude: number
  longitude: number
  count: number
  thingId: string
  thingName: string
  color: ColorData
}

/** A rectangle covering every pin, for framing the map. */
export interface MapBounds {
  south: number
  west: number
  north: number
  east: number
}

/**
 * Distance in metres between two coordinates, using the haversine formula —
 * the great-circle distance across the Earth's surface. This is what
 * CLLocation.distance(from:) computes on iOS.
 */
export function distanceInMetres(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const EARTH_RADIUS_METRES = 6_371_000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const deltaLat = toRadians(latB - latA)
  const deltaLon = toRadians(lonB - lonA)

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(deltaLon / 2) ** 2

  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(a))
}

/**
 * Turn things and their logs into map pins.
 *
 * The method matches iOS exactly: walk the logs in order, and put each one into
 * the first existing group for the same thing that is close enough, otherwise
 * start a new group. Simple, and stable for the handful of places a person
 * actually logs things.
 */
export function groupLocations(things: Array<{ thing: Thing; logs: Thing['logs'] }>): LocationCluster[] {
  const clusters: LocationCluster[] = []

  for (const { thing, logs } of things) {
    for (const log of logs) {
      const location = log.location
      if (!location) continue

      const existing = clusters.find(
        (cluster) =>
          cluster.thingId === thing.id &&
          distanceInMetres(
            location.latitude,
            location.longitude,
            cluster.latitude,
            cluster.longitude,
          ) <= CLUSTER_RADIUS_METRES,
      )

      if (existing) {
        existing.count += 1
      } else {
        clusters.push({
          id: `${thing.id}-${clusters.length}`,
          latitude: location.latitude,
          longitude: location.longitude,
          count: 1,
          thingId: thing.id,
          thingName: thing.name,
          color: thing.color,
        })
      }
    }
  }

  return clusters
}

/**
 * The rectangle to frame the map on, with a margin so pins aren't jammed
 * against the edges. A single pin gets a small fixed box around it, since a
 * zero-sized rectangle would zoom the map in as far as it can go.
 */
export function boundsFor(clusters: LocationCluster[]): MapBounds | null {
  if (clusters.length === 0) return null

  if (clusters.length === 1) {
    const { latitude, longitude } = clusters[0]
    const halfSpan = 0.005 // Roughly half a kilometre.
    return {
      south: latitude - halfSpan,
      west: longitude - halfSpan,
      north: latitude + halfSpan,
      east: longitude + halfSpan,
    }
  }

  let south = clusters[0].latitude
  let north = clusters[0].latitude
  let west = clusters[0].longitude
  let east = clusters[0].longitude

  for (const cluster of clusters.slice(1)) {
    south = Math.min(south, cluster.latitude)
    north = Math.max(north, cluster.latitude)
    west = Math.min(west, cluster.longitude)
    east = Math.max(east, cluster.longitude)
  }

  // A 20% margin on each side, matching the iOS 40%-wider span.
  const latitudeMargin = Math.max((north - south) * 0.2, 0.001)
  const longitudeMargin = Math.max((east - west) * 0.2, 0.001)

  return {
    south: south - latitudeMargin,
    west: west - longitudeMargin,
    north: north + latitudeMargin,
    east: east + longitudeMargin,
  }
}

/** How many logs across these things carry a location at all. */
export function countLocatedLogs(things: Thing[]): number {
  return things.reduce(
    (total, thing) => total + thing.logs.filter((log) => log.location).length,
    0,
  )
}

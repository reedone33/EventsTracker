/**
 * The map, replacing the iOS AllItemsMapView and CategoryMapView.
 *
 * Those were two files doing almost the same thing — one for everything, one
 * for a single thing. Here it's one component: pass `singleThing` and it
 * behaves like the category map, leave it out and it behaves like the all-items
 * map with filters.
 *
 * Uses Leaflet with OpenStreetMap tiles: free, no account, no API key. Pins are
 * drawn circles rather than image markers, which means they can carry the
 * thing's own colour and its count, exactly as the iOS annotations did.
 */

import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Thing } from '../domain/types'
import type { LocationCluster } from '../domain/mapClusters'
import { boundsFor, groupLocations } from '../domain/mapClusters'
import { filterThingsWithLogs } from '../domain/analytics'
import { colorToCss, readableTextColor } from '../domain/color'
import { toDateInputValue } from '../domain/dates'
import { useI18n } from '../i18n'

interface MapScreenProps {
  things: Thing[]
  /** When set, the map shows only this thing and hides the filters. */
  singleThing?: Thing
}

/** Read a date input as local midnight. */
function parseDateInput(value: string): Date | null {
  const parts = value.split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

/** The iOS map opened on the last year. */
function defaultStartDate(): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  date.setHours(0, 0, 0, 0)
  return date
}

/**
 * Moves the map to fit the pins.
 *
 * Leaflet is controlled by calling methods on the map object rather than by
 * props, so this little component exists purely to reach the map and tell it
 * where to look whenever the pins change.
 */
function FitToPins({ clusters }: { clusters: LocationCluster[] }) {
  const map = useMap()

  useEffect(() => {
    const bounds = boundsFor(clusters)
    if (!bounds) return
    map.fitBounds(
      [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east],
      ],
      { padding: [24, 24], maxZoom: 17 },
    )
  }, [clusters, map])

  return null
}

export function MapScreen({ things, singleThing }: MapScreenProps) {
  const { t, tc } = useI18n()
  const isSingle = Boolean(singleThing)
  const availableThings = useMemo(
    () => (singleThing ? [singleThing] : things),
    [singleThing, things],
  )

  const [selectedThingIds, setSelectedThingIds] = useState<Set<string>>(
    () => new Set(availableThings.map((thing) => thing.id)),
  )
  const [startDate, setStartDate] = useState<Date>(defaultStartDate)
  const [endDate, setEndDate] = useState<Date>(() => new Date())

  // Drop ids that no longer exist, so a deleted thing can't linger in the filter.
  useEffect(() => {
    setSelectedThingIds((current) => {
      const availableIds = new Set(availableThings.map((thing) => thing.id))
      const stillValid = new Set([...current].filter((id) => availableIds.has(id)))
      if (stillValid.size === 0 && availableIds.size > 0) return availableIds
      return stillValid.size === current.size ? current : stillValid
    })
  }, [availableThings])

  const clusters = useMemo(() => {
    // The single-thing map shows the whole history, like the iOS category map.
    // The all-items map applies the date range, like the iOS all-items map.
    const filtered = isSingle
      ? availableThings.map((thing) => ({ thing, logs: thing.logs }))
      : filterThingsWithLogs(availableThings, selectedThingIds, startDate, endDate)
    return groupLocations(filtered)
  }, [isSingle, availableThings, selectedThingIds, startDate, endDate])

  const totalLogsShown = clusters.reduce((sum, cluster) => sum + cluster.count, 0)

  if (availableThings.length === 0) {
    return <p className="empty">{t('map.nothingToMap')}</p>
  }

  return (
    <section className="map-screen">
      {!isSingle && (
        <div className="controls">
          <div className="controls__row controls__row--wrap">
            <span className="controls__label">{t('chart.show')}</span>
            {availableThings.map((thing) => {
              const isOn = selectedThingIds.has(thing.id)
              return (
                <button
                  key={thing.id}
                  type="button"
                  className={`chip ${isOn ? 'chip--on' : ''}`}
                  style={
                    isOn
                      ? {
                          backgroundColor: colorToCss(thing.color),
                          color: readableTextColor(thing.color),
                        }
                      : undefined
                  }
                  onClick={() =>
                    setSelectedThingIds((current) => {
                      const next = new Set(current)
                      if (next.has(thing.id)) next.delete(thing.id)
                      else next.add(thing.id)
                      return next
                    })
                  }
                  aria-pressed={isOn}
                >
                  {thing.name}
                </button>
              )
            })}
            <button
              type="button"
              className="button button--small"
              onClick={() => setSelectedThingIds(new Set(availableThings.map((t) => t.id)))}
            >
              {t('action.all')}
            </button>
            <button
              type="button"
              className="button button--small"
              onClick={() => setSelectedThingIds(new Set())}
            >
              {t('action.none')}
            </button>
          </div>

          <div className="controls__row controls__row--wrap">
            <label className="controls__field">
              <span className="controls__label">{t('export.from')}</span>
              <input
                type="date"
                value={toDateInputValue(startDate)}
                max={toDateInputValue(endDate)}
                onChange={(event) => {
                  const date = parseDateInput(event.target.value)
                  if (date) setStartDate(date)
                }}
              />
            </label>
            <label className="controls__field">
              <span className="controls__label">{t('export.to')}</span>
              <input
                type="date"
                value={toDateInputValue(endDate)}
                min={toDateInputValue(startDate)}
                onChange={(event) => {
                  const date = parseDateInput(event.target.value)
                  if (date) setEndDate(date)
                }}
              />
            </label>
          </div>
        </div>
      )}

      {clusters.length === 0 ? (
        <p className="empty">{t('map.noLocations')}</p>
      ) : (
        <>
          <p className="hint">
            {t('map.summary', { places: clusters.length, entries: totalLogsShown })}
          </p>

          <div className="map">
            <MapContainer
              // A sensible starting view; FitToPins moves it immediately.
              center={[clusters[0].latitude, clusters[0].longitude]}
              zoom={13}
              scrollWheelZoom
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {clusters.map((cluster) => (
                <CircleMarker
                  key={cluster.id}
                  center={[cluster.latitude, cluster.longitude]}
                  // Bigger pin for more entries, sized by area so the growth
                  // looks proportional rather than runaway.
                  radius={Math.min(26, 10 + Math.sqrt(cluster.count) * 3)}
                  pathOptions={{
                    color: '#ffffff',
                    weight: 2,
                    fillColor: colorToCss(cluster.color),
                    fillOpacity: 0.85,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -8]}>
                    <strong>{cluster.thingName}</strong>
                    <br />
                    {tc('map.entriesHere', cluster.count)}
                  </Tooltip>
                </CircleMarker>
              ))}

              <FitToPins clusters={clusters} />
            </MapContainer>
          </div>
        </>
      )}
    </section>
  )
}

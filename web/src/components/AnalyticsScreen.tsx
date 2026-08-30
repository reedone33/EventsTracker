/**
 * The analytics screen, replacing the iOS AnalyticsView.
 *
 * This component owns the user's choices (which things, what dates, which
 * chart) and hands them to the pure functions in domain/analytics.ts. It does
 * no counting of its own — all the arithmetic lives in the tested code, so
 * what you see here is only about arranging things on screen.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Thing } from '../domain/types'
import type { ChartType, DateGranularity, TimeDetailScale } from '../domain/analytics'
import {
  buildFrequencyData,
  buildLegend,
  buildTimeOfDayData,
  filterThingsWithLogs,
} from '../domain/analytics'
import { colorToCss } from '../domain/color'
import { useI18n } from '../i18n'
import { AnalyticsControls } from './AnalyticsControls'
import { FrequencyChart } from './FrequencyChart'
import { TimeOfDayChart } from './TimeOfDayChart'

interface AnalyticsScreenProps {
  things: Thing[]
}

/**
 * How many things the chart starts with.
 *
 * The iOS app selected everything by default, which was fine when there were a
 * handful of things. With 27 it draws 27 overlapping lines that no one can
 * read, and past eight there are no longer enough visually distinct colours to
 * tell the lines apart anyway. So the chart opens with the most-logged few and
 * lets you add the rest — the All button is right there.
 */
const DEFAULT_SELECTION_COUNT = 5

/** The things with the most logs — the ones with enough history to show a trend. */
function defaultSelection(things: Thing[]): Set<string> {
  const busiest = [...things]
    .sort((a, b) => b.logs.length - a.logs.length)
    .slice(0, DEFAULT_SELECTION_COUNT)
  return new Set(busiest.map((thing) => thing.id))
}

/** The iOS screen opens showing the last three months. */
function defaultStartDate(): Date {
  const date = new Date()
  date.setMonth(date.getMonth() - 3)
  date.setHours(0, 0, 0, 0)
  return date
}

export function AnalyticsScreen({ things }: AnalyticsScreenProps) {
  const { t } = useI18n()
  const [chartType, setChartType] = useState<ChartType>('frequency')
  const [granularity, setGranularity] = useState<DateGranularity>('day')
  const [timeScale, setTimeScale] = useState<TimeDetailScale>('hourly')
  const [startDate, setStartDate] = useState<Date>(defaultStartDate)
  const [endDate, setEndDate] = useState<Date>(() => new Date())
  const [selectedThingIds, setSelectedThingIds] = useState<Set<string>>(() => defaultSelection(things))

  // Data arrives from storage a moment after the first render, so the opening
  // selection has to be made when it lands rather than on mount.
  const hasChosenOpeningSelection = useRef(things.length > 0)

  /**
   * Keep the selection honest when the underlying list changes.
   * Mirrors the iOS `onReceive` behaviour: drop ids that no longer exist, and
   * if that empties the selection, select everything rather than showing a
   * blank chart with no explanation.
   */
  useEffect(() => {
    if (things.length === 0) return

    // First time real data appears: open on the busiest few.
    if (!hasChosenOpeningSelection.current) {
      hasChosenOpeningSelection.current = true
      setSelectedThingIds(defaultSelection(things))
      return
    }

    setSelectedThingIds((current) => {
      const availableIds = new Set(things.map((thing) => thing.id))
      const stillValid = new Set([...current].filter((id) => availableIds.has(id)))

      // If deleting things wiped out a selection that existed, fall back to the
      // default rather than showing an empty chart with no explanation. An
      // empty selection the user made deliberately (the None button) is left
      // alone — it didn't get emptied by deletion, so there is nothing to fix.
      if (current.size > 0 && stillValid.size === 0) return defaultSelection(things)

      return stillValid.size === current.size ? current : stillValid
    })
  }, [things])

  // Each stage recalculates only when its own inputs change, so dragging a date
  // doesn't redo work that didn't depend on it.
  const filtered = useMemo(
    () => filterThingsWithLogs(things, selectedThingIds, startDate, endDate),
    [things, selectedThingIds, startDate, endDate],
  )

  const frequencyPoints = useMemo(
    () => (chartType === 'frequency' ? buildFrequencyData(filtered, startDate, endDate, granularity) : []),
    [chartType, filtered, startDate, endDate, granularity],
  )

  const timeOfDayPoints = useMemo(
    () => (chartType === 'timeOfDay' ? buildTimeOfDayData(filtered, timeScale) : []),
    [chartType, filtered, timeScale],
  )

  const legend = useMemo(
    () => buildLegend(things, selectedThingIds),
    [things, selectedThingIds],
  )

  function toggleThing(thingId: string) {
    setSelectedThingIds((current) => {
      const next = new Set(current)
      if (next.has(thingId)) {
        next.delete(thingId)
      } else {
        next.add(thingId)
      }
      return next
    })
  }

  if (things.length === 0) {
    return (
      <p className="empty">{t('chart.noThings')}</p>
    )
  }

  return (
    <section className="analytics">
      <AnalyticsControls
        things={things}
        selectedThingIds={selectedThingIds}
        chartType={chartType}
        granularity={granularity}
        timeScale={timeScale}
        startDate={startDate}
        endDate={endDate}
        onToggleThing={toggleThing}
        onSelectAll={() => setSelectedThingIds(new Set(things.map((thing) => thing.id)))}
        onClearAll={() => setSelectedThingIds(new Set())}
        onChartTypeChange={setChartType}
        onGranularityChange={setGranularity}
        onTimeScaleChange={setTimeScale}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
      />

      <h2 className="analytics__title">
        {chartType === 'frequency' ? t('chart.titleFrequency') : t('chart.timeOfDay')}
      </h2>

      {/* Explain the default rather than letting it look like data is missing. */}
      {selectedThingIds.size < things.length && (
        <p className="hint">
          {t('chart.showingCount', { shown: selectedThingIds.size, total: things.length })}
        </p>
      )}

      {selectedThingIds.size === 0 ? (
        <p className="empty">{t('chart.nothingSelected')}</p>
      ) : chartType === 'frequency' ? (
        <FrequencyChart points={frequencyPoints} legend={legend} granularity={granularity} />
      ) : (
        <TimeOfDayChart points={timeOfDayPoints} legend={legend} />
      )}

      {/* The legend sits below the chart, as it does on iOS, and lists every
          selected thing — including any with no data in this range, so nothing
          disappears without explanation. */}
      {legend.length > 0 && (
        <ul className="legend">
          {legend.map((entry) => (
            <li key={entry.thingId} className="legend__item">
              <span className="legend__swatch" style={{ backgroundColor: colorToCss(entry.color) }} />
              {entry.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

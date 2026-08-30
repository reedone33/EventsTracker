/**
 * The row of controls above the charts: which chart, which things, what date
 * range, and how finely to group. Ported from the top half of AnalyticsView.
 *
 * Keeping the controls in their own component leaves the chart component free
 * to be about drawing, and this one about choosing.
 */

import type { Thing } from '../domain/types'
import type { ChartType, DateGranularity, TimeDetailScale } from '../domain/analytics'
import { useI18n } from '../i18n'
import type { TranslationKey } from '../i18n'
import { colorToCss, readableTextColor } from '../domain/color'
import { toDateInputValue } from '../domain/dates'

interface AnalyticsControlsProps {
  things: Thing[]
  selectedThingIds: Set<string>
  chartType: ChartType
  granularity: DateGranularity
  timeScale: TimeDetailScale
  startDate: Date
  endDate: Date
  onToggleThing: (thingId: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  onChartTypeChange: (type: ChartType) => void
  onGranularityChange: (granularity: DateGranularity) => void
  onTimeScaleChange: (scale: TimeDetailScale) => void
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
}

/**
 * Turn the "YYYY-MM-DD" text from a date input into a Date at local midnight.
 * Passing the text straight to `new Date()` would read it as UTC and could
 * land on the previous day, which is the same trap the analytics code avoids.
 */
function parseDateInput(value: string): Date | null {
  const parts = value.split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

const GRANULARITIES: DateGranularity[] = ['day', 'month', 'year']
const TIME_SCALES: TimeDetailScale[] = ['hourly', 'byMinute']

export function AnalyticsControls(props: AnalyticsControlsProps) {
  const { t } = useI18n()
  const {
    things,
    selectedThingIds,
    chartType,
    granularity,
    timeScale,
    startDate,
    endDate,
    onToggleThing,
    onSelectAll,
    onClearAll,
    onChartTypeChange,
    onGranularityChange,
    onTimeScaleChange,
    onStartDateChange,
    onEndDateChange,
  } = props

  return (
    <div className="controls">
      {/* Which chart to show. */}
      <div className="controls__row" role="group" aria-label={t('chart.type')}>
        <button
          type="button"
          className={`segment ${chartType === 'frequency' ? 'segment--on' : ''}`}
          onClick={() => onChartTypeChange('frequency')}
        >
          {t('chart.frequency')}
        </button>
        <button
          type="button"
          className={`segment ${chartType === 'timeOfDay' ? 'segment--on' : ''}`}
          onClick={() => onChartTypeChange('timeOfDay')}
        >
          {t('chart.timeOfDay')}
        </button>
      </div>

      {/* Which things to include. Each chip wears its own colour, so the
          filter and the chart agree at a glance. */}
      <div className="controls__row controls__row--wrap">
        <span className="controls__label">{t('chart.show')}</span>
        {things.map((thing) => {
          const isOn = selectedThingIds.has(thing.id)
          return (
            <button
              key={thing.id}
              type="button"
              className={`chip ${isOn ? 'chip--on' : ''}`}
              style={
                isOn
                  ? { backgroundColor: colorToCss(thing.color), color: readableTextColor(thing.color) }
                  : undefined
              }
              onClick={() => onToggleThing(thing.id)}
              aria-pressed={isOn}
            >
              {thing.name}
            </button>
          )
        })}

        <button type="button" className="button button--small" onClick={onSelectAll}>
          {t('action.all')}
        </button>
        <button type="button" className="button button--small" onClick={onClearAll}>
          {t('action.none')}
        </button>
      </div>

      {/* Date range, plus the grouping option relevant to the current chart. */}
      <div className="controls__row controls__row--wrap">
        <label className="controls__field">
          <span className="controls__label">{t('export.from')}</span>
          <input
            type="date"
            value={toDateInputValue(startDate)}
            max={toDateInputValue(endDate)}
            onChange={(event) => {
              const date = parseDateInput(event.target.value)
              if (date) onStartDateChange(date)
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
              if (date) onEndDateChange(date)
            }}
          />
        </label>

        {chartType === 'frequency' ? (
          <label className="controls__field">
            <span className="controls__label">{t('chart.groupBy')}</span>
            <select
              value={granularity}
              onChange={(event) => onGranularityChange(event.target.value as DateGranularity)}
            >
              {GRANULARITIES.map((option) => (
                <option key={option} value={option}>
                  {t(`granularity.${option}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="controls__field">
            <span className="controls__label">{t('chart.detail')}</span>
            <select
              value={timeScale}
              onChange={(event) => onTimeScaleChange(event.target.value as TimeDetailScale)}
            >
              {TIME_SCALES.map((option) => (
                <option key={option} value={option}>
                  {t(`timescale.${option}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  )
}

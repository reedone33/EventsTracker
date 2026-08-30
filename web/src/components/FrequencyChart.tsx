/**
 * The frequency chart: how often each thing happened over time.
 *
 * Replaces the Swift Charts LineMark + PointMark version. One line per thing,
 * in that thing's own colour, with zero-filled gaps so the line stays
 * continuous — the behaviour preserved in the analytics port.
 */

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { FrequencyPoint, DateGranularity } from '../domain/analytics'
import { maxFrequencyCount, yAxisValues } from '../domain/analytics'
import type { LegendEntry } from '../domain/analytics'
import { colorToCss } from '../domain/color'
import { useI18n } from '../i18n'

interface FrequencyChartProps {
  points: FrequencyPoint[]
  legend: LegendEntry[]
  granularity: DateGranularity
}

/** One row per date, with a column per thing — the shape Recharts plots from. */
type ChartRow = Record<string, number>

/**
 * Reshape the analytics output for the chart library.
 *
 * The analytics produce a flat list ("Coffee, 3 on Monday"). Recharts wants a
 * row per date carrying every series ("Monday: Coffee 3, Tea 1"). Columns are
 * keyed by thing ID, never by name, so two things sharing a name stay separate.
 */
function toChartRows(points: FrequencyPoint[]): ChartRow[] {
  const rowsByTime = new Map<number, ChartRow>()

  for (const point of points) {
    const time = point.date.getTime()
    let row = rowsByTime.get(time)
    if (!row) {
      row = { time }
      rowsByTime.set(time, row)
    }
    row[point.thingId] = point.count
  }

  return [...rowsByTime.values()].sort((a, b) => a.time - b.time)
}

/** Format an axis date to suit the current grouping. */
function formatAxisDate(time: number, granularity: DateGranularity): string {
  const date = new Date(time)
  switch (granularity) {
    case 'day':
      return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
    case 'month':
      return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
    case 'year':
      return String(date.getFullYear())
  }
}

/**
 * The hover panel. Swift Charts had no equivalent — on a phone there is nowhere
 * to hover — but on a web page reading exact values is expected, so it is
 * included rather than leaving people to estimate from the axis.
 */
function FrequencyTooltip({
  active,
  payload,
  label,
  legend,
  granularity,
}: {
  active?: boolean
  payload?: Array<{ dataKey?: string | number; value?: number }>
  label?: number
  legend: LegendEntry[]
  granularity: DateGranularity
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null

  const heading = new Date(label).toLocaleDateString(
    undefined,
    granularity === 'year'
      ? { year: 'numeric' }
      : granularity === 'month'
        ? { month: 'long', year: 'numeric' }
        : { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
  )

  return (
    <div className="tooltip">
      <p className="tooltip__title">{heading}</p>
      <ul className="tooltip__list">
        {payload.map((item) => {
          const entry = legend.find((candidate) => candidate.thingId === item.dataKey)
          if (!entry) return null
          return (
            <li key={entry.thingId} className="tooltip__item">
              {/* The colour lives in the swatch, never in the text itself. */}
              <span className="tooltip__swatch" style={{ backgroundColor: colorToCss(entry.color) }} />
              <span className="tooltip__name">{entry.name}</span>
              <span className="tooltip__value">{item.value ?? 0}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Above this many dates, individual dots stop helping and start hurting: a
 * three-month daily chart draws a dot for every zero-filled day, which reads as
 * a dotted line along the bottom rather than as data. Past the threshold the
 * line alone carries the shape, and hovering still reveals any exact value.
 */
const MAX_DATES_WITH_VISIBLE_DOTS = 45

export function FrequencyChart({ points, legend, granularity }: FrequencyChartProps) {
  const { t } = useI18n()

  if (points.length === 0) {
    return <p className="empty">{t('chart.noData')}</p>
  }

  const rows = toChartRows(points)
  const showDots = rows.length <= MAX_DATES_WITH_VISIBLE_DOTS
  const isSingleSeries = legend.length === 1
  const maxCount = maxFrequencyCount(points)
  const ticks = yAxisValues(maxCount)

  return (
    <div className="chart">
      {/* ResponsiveContainer makes the chart fill whatever width it is given,
          which is how it adapts from a phone to a wide monitor. */}
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          {/* A soft fade under a lone line. Only ever used for a single series —
              with several lines, overlapping fills turn into mud. */}
          <defs>
            {legend.map((entry) => (
              <linearGradient
                key={entry.thingId}
                id={`fill-${entry.thingId}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={colorToCss(entry.color)} stopOpacity={0.28} />
                <stop offset="100%" stopColor={colorToCss(entry.color)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          {/* Dashed, faint horizontal rules only. Vertical grid lines and hard
              axis rules add weight without adding information. */}
          <CartesianGrid stroke="var(--grid)" strokeDasharray="4 6" vertical={false} />

          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(time: number) => formatAxisDate(time, granularity)}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickMargin={10}
            minTickGap={24}
          />

          <YAxis
            domain={[0, maxCount + 1]}
            ticks={ticks}
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickMargin={8}
            width={40}
          />

          <Tooltip
            content={<FrequencyTooltip legend={legend} granularity={granularity} />}
            cursor={{ stroke: 'var(--axis)', strokeWidth: 1, strokeDasharray: '4 4' }}
          />

          {legend.map((entry) =>
            isSingleSeries ? (
              <Area
                key={entry.thingId}
                type="monotone"
                dataKey={entry.thingId}
                name={entry.name}
                stroke={colorToCss(entry.color)}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={`url(#fill-${entry.thingId})`}
                dot={showDots ? { r: 3, strokeWidth: 0, fill: colorToCss(entry.color) } : false}
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface)' }}
                isAnimationActive={false}
                connectNulls
              />
            ) : (
              <Line
                key={entry.thingId}
                // "monotone" curves the line between points instead of joining
                // them with straight segments — the softer, more modern look.
                type="monotone"
                dataKey={entry.thingId}
                name={entry.name}
                stroke={colorToCss(entry.color)}
                strokeWidth={2.5}
                // Rounded ends and rounded corners where segments meet.
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={showDots ? { r: 3, strokeWidth: 0, fill: colorToCss(entry.color) } : false}
                // The ring in the surface colour lifts the hovered point off
                // whatever line happens to be behind it.
                activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--surface)' }}
                isAnimationActive={false}
                connectNulls
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

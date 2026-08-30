/**
 * The time-of-day chart: what time of day each thing tends to happen.
 *
 * Days run along the bottom, hours up the side (midnight at the bottom,
 * midnight again at the top). Each dot is a moment something was logged; a
 * bigger dot means several logs shared that slot. A thin stem drops from the
 * dot to the baseline, matching the RuleMark in the Swift version, which makes
 * it much easier to read a dot's time against the axis.
 */

import {
  CartesianGrid,
  Scatter,
  ScatterChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import type { LegendEntry, TimeOfDayPoint } from '../domain/analytics'
import { colorToCss } from '../domain/color'
import { useI18n } from '../i18n'

interface TimeOfDayChartProps {
  points: TimeOfDayPoint[]
  legend: LegendEntry[]
}

/** Turn 14.5 into "2:30 PM" for the axis and the tooltip. */
function formatHour(hour: number): string {
  const wholeHours = Math.floor(hour)
  const minutes = Math.round((hour - wholeHours) * 60)
  const date = new Date(2000, 0, 1, wholeHours, minutes)
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

/** Just the hour, for axis labels where minutes would be clutter. */
function formatHourLabel(hour: number): string {
  const date = new Date(2000, 0, 1, hour, 0)
  return date.toLocaleTimeString(undefined, { hour: 'numeric' })
}

/**
 * Draw one dot plus its stem down to the baseline.
 *
 * The chart library has no built-in "dot with a stem", so this supplies the
 * shape itself. It reads the vertical scale to find where zero sits on screen;
 * if that isn't available for any reason it quietly draws the dot alone rather
 * than failing, so a library change can never blank the chart.
 */
function DotWithStem(props: Record<string, unknown>) {
  const cx = props.cx as number | undefined
  const cy = props.cy as number | undefined
  const fill = props.fill as string | undefined
  const payload = props.payload as { count?: number } | undefined
  const yAxis = props.yAxis as { scale?: (value: number) => number } | undefined

  if (typeof cx !== 'number' || typeof cy !== 'number') return null

  // Area matches the iOS symbolSize formula (100 + 75 per extra log); radius is
  // derived from it so that a doubled count looks doubled, not quadrupled.
  const count = payload?.count ?? 1
  const area = 100 + (count - 1) * 75
  const radius = Math.max(4.5, Math.sqrt(area / Math.PI))

  const baseline = typeof yAxis?.scale === 'function' ? yAxis.scale(0) : null

  return (
    <g>
      {typeof baseline === 'number' && (
        <line
          x1={cx}
          y1={baseline}
          x2={cx}
          y2={cy}
          stroke={fill}
          strokeWidth={2}
          strokeLinecap="round"
          opacity={0.28}
        />
      )}
      {/* A thin ring in the surface colour keeps overlapping dots readable. */}
      <circle cx={cx} cy={cy} r={radius} fill={fill} stroke="var(--surface)" strokeWidth={1.5} />
    </g>
  )
}

/** Hover panel showing the exact day, time and number of logs. */
function TimeOfDayTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload?: TimeOfDayPoint }>
}) {
  const { t } = useI18n()

  if (!active || !payload || payload.length === 0) return null
  const point = payload[0]?.payload
  if (!point) return null

  return (
    <div className="tooltip">
      <p className="tooltip__title">{point.thingName}</p>
      <ul className="tooltip__list">
        <li className="tooltip__item">
          <span className="tooltip__name">
            {point.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <span className="tooltip__value">{formatHour(point.hour)}</span>
        </li>
        {point.count > 1 && (
          <li className="tooltip__item">
            <span className="tooltip__name">{t('chart.logsInSlot')}</span>
            <span className="tooltip__value">{point.count}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

export function TimeOfDayChart({ points, legend }: TimeOfDayChartProps) {
  const { t } = useI18n()

  if (points.length === 0) {
    return <p className="empty">{t('chart.noData')}</p>
  }

  // Recharts needs numbers on both axes, so the day becomes a timestamp.
  const rows = points.map((point) => ({ ...point, time: point.date.getTime() }))

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={560}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="var(--grid)" strokeDasharray="4 6" />

          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(time: number) =>
              new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            }
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickMargin={10}
            minTickGap={32}
          />

          <YAxis
            dataKey="hour"
            type="number"
            // A full day, always — so the same log sits in the same place
            // regardless of what else is on the chart.
            domain={[0, 24]}
            ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]}
            tickFormatter={formatHourLabel}
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            tickMargin={8}
            width={64}
          />

          {/* Declares the value that drives dot size. The custom shape does the
              actual sizing, but Recharts needs this to reserve the range. */}
          <ZAxis dataKey="count" range={[60, 400]} />

          <Tooltip content={<TimeOfDayTooltip />} cursor={{ strokeDasharray: '3 3' }} />

          {legend.map((entry) => (
            <Scatter
              key={entry.thingId}
              name={entry.name}
              data={rows.filter((row) => row.thingId === entry.thingId)}
              fill={colorToCss(entry.color)}
              shape={<DotWithStem />}
              isAnimationActive={false}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  )
}

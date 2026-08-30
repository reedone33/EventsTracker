/**
 * The chart's key and its filter, in one place below the chart.
 *
 * Collapsed, it is simply the legend: which things are on the chart and what
 * colour each one is. That is the everyday need — it answers "which line is
 * which" without asking for anything.
 *
 * Expanded, the same list becomes a set of switches. Filtering is the rarer
 * job, so it stays folded away rather than pushing the chart down the page.
 *
 * It sits BELOW the chart on purpose. The chart is what the screen is for; a
 * wall of filter chips above it means scrolling past the controls to reach the
 * thing you came to look at.
 */

import { useState } from 'react'
import type { Thing } from '../domain/types'
import type { LegendEntry } from '../domain/analytics'
import { colorToCss, readableTextColor } from '../domain/color'
import { useI18n } from '../i18n'

interface ThingFilterPanelProps {
  things: Thing[]
  legend: LegendEntry[]
  selectedThingIds: Set<string>
  onToggleThing: (thingId: string) => void
  onSelectAll: () => void
  onSelectBusiest: () => void
  onClearAll: () => void
}

export function ThingFilterPanel(props: ThingFilterPanelProps) {
  const {
    things,
    legend,
    selectedThingIds,
    onToggleThing,
    onSelectAll,
    onSelectBusiest,
    onClearAll,
  } = props

  const { t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)

  const shown = selectedThingIds.size
  const total = things.length

  return (
    <section className="filter-panel">
      {/* The legend. Always visible, because a chart with several coloured
          lines and no key is a puzzle rather than a chart. */}
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

      <button
        type="button"
        className="filter-panel__toggle"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        <span className={`filter-panel__chevron ${isOpen ? 'filter-panel__chevron--open' : ''}`}>
          ›
        </span>
        {t('chart.filter')}
        <span className="filter-panel__count">
          {shown === total
            ? t('chart.filterAllShown', { total })
            : t('chart.filterSomeShown', { shown, total })}
        </span>
      </button>

      {isOpen && (
        <div className="filter-panel__body">
          <div className="filter-panel__quick">
            <button type="button" className="button button--small" onClick={onSelectAll}>
              {t('action.all')}
            </button>
            {/* A quick way back to a readable chart when everything is on and
                the lines have become impossible to tell apart. */}
            <button type="button" className="button button--small" onClick={onSelectBusiest}>
              {t('chart.busiest')}
            </button>
            <button type="button" className="button button--small" onClick={onClearAll}>
              {t('action.none')}
            </button>
          </div>

          <div className="filter-panel__chips">
            {things.map((thing) => {
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
                  onClick={() => onToggleThing(thing.id)}
                  aria-pressed={isOn}
                >
                  {thing.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

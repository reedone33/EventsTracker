/**
 * The "export to CSV" controls, ported from the iOS ExportView.
 *
 * Same choices the phone offered: which things, and what date range. The button
 * says how many entries will be written before you press it, so an empty range
 * is obvious rather than producing a mysteriously empty file.
 */

import { useMemo, useState } from 'react'
import type { Thing } from '../domain/types'
import { buildCsv, countExportRows, exportFilename } from '../storage/csvExport'
import { downloadTextFile } from '../storage/storage'
import { colorToCss, readableTextColor } from '../domain/color'
import { toDateInputValue } from '../domain/dates'
import { useI18n } from '../i18n'

interface CsvExportSectionProps {
  things: Thing[]
}

/** Read a date input as local midnight, never as UTC. */
function parseDateInput(value: string): Date | null {
  const parts = value.split('-').map(Number)
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null
  return new Date(parts[0], parts[1] - 1, parts[2])
}

/** The iOS export screen opened on the last year. */
function defaultStartDate(): Date {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function CsvExportSection({ things }: CsvExportSectionProps) {
  const { t, tc } = useI18n()
  const [selectedThingIds, setSelectedThingIds] = useState<Set<string>>(
    () => new Set(things.map((thing) => thing.id)),
  )
  const [startDate, setStartDate] = useState<Date>(defaultStartDate)
  const [endDate, setEndDate] = useState<Date>(() => new Date())

  const options = useMemo(
    () => ({ selectedThingIds, startDate, endDate }),
    [selectedThingIds, startDate, endDate],
  )

  // Counting is cheap here and tells the user what they're about to get.
  const rowCount = useMemo(() => countExportRows(things, options), [things, options])

  function toggleThing(thingId: string) {
    setSelectedThingIds((current) => {
      const next = new Set(current)
      if (next.has(thingId)) next.delete(thingId)
      else next.add(thingId)
      return next
    })
  }

  function handleExport() {
    downloadTextFile(exportFilename(), buildCsv(things, options), 'text/csv')
  }

  return (
    <section className="panel-section">
      <h3 className="panel-section__title">{t('export.title')}</h3>
      <p className="panel-section__text">{t('export.text')}</p>

      <div className="controls__row controls__row--wrap">
        <span className="controls__label">{t('export.include')}</span>
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
              onClick={() => toggleThing(thing.id)}
              aria-pressed={isOn}
            >
              {thing.name}
            </button>
          )
        })}
        <button
          type="button"
          className="button button--small"
          onClick={() => setSelectedThingIds(new Set(things.map((thing) => thing.id)))}
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

      <button type="button" className="button" onClick={handleExport} disabled={rowCount === 0}>
        {rowCount === 0 ? t('export.empty') : tc('export.button', rowCount)}
      </button>
    </section>
  )
}

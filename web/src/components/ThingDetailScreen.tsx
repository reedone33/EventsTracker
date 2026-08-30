/**
 * Everything about one thing — replacing the iOS ThingDetailView.
 *
 * Shows its charts, then its full history newest-first, with the ability to
 * add, edit and delete individual entries. This is the screen that fixes a
 * mistaken tap, which the grid alone cannot do.
 *
 * The charts here reuse the SAME functions as the Analytics screen. The iOS app
 * had a second, separate implementation for this view that had drifted apart
 * from the main one; unifying them means a fix to the counting logic can only
 * ever be made in one place.
 */

import { useMemo, useState } from 'react'
import type { LogEntry, Thing } from '../domain/types'
import type { ChartType } from '../domain/analytics'
import { buildFrequencyData, buildTimeOfDayData } from '../domain/analytics'
import { formatFullDateTime, parseAppDate } from '../domain/dates'
import { logsNewestFirst } from '../domain/things'
import { colorToCss } from '../domain/color'
import { buildCsv, exportFilename } from '../storage/csvExport'
import { downloadTextFile } from '../storage/storage'
import { FrequencyChart } from './FrequencyChart'
import { TimeOfDayChart } from './TimeOfDayChart'
import { ConfirmDialog } from './ConfirmDialog'
import { LogEntryDialog } from './LogEntryDialog'
import { MapScreen } from './MapScreen'
import { useI18n } from '../i18n'

interface ThingDetailScreenProps {
  thing: Thing
  onClose: () => void
  onEditThing: () => void
  onAddLog: (date: Date, note: string | null) => void
  onUpdateLog: (logId: string, date: Date, note: string | null) => void
  onDeleteLog: (logId: string) => void
}

export function ThingDetailScreen(props: ThingDetailScreenProps) {
  const { t, tc } = useI18n()
  const { thing, onClose, onEditThing, onAddLog, onUpdateLog, onDeleteLog } = props

  const [view, setView] = useState<ChartType | 'map'>('frequency')
  const chartType = view
  const [addingLog, setAddingLog] = useState(false)
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null)
  const [deletingLog, setDeletingLog] = useState<LogEntry | null>(null)

  const sortedLogs = useMemo(() => logsNewestFirst(thing), [thing])

  /**
   * The chart covers first log to last log, as the iOS per-thing chart did —
   * there is no date filter on this screen, so the data decides the range.
   */
  const range = useMemo(() => {
    const times = thing.logs
      .map((log) => parseAppDate(log.date)?.getTime())
      .filter((time): time is number => typeof time === 'number')
    if (times.length === 0) return null
    return { start: new Date(Math.min(...times)), end: new Date(Math.max(...times)) }
  }, [thing.logs])

  // A one-entry legend, so the shared chart components get what they expect.
  const legend = useMemo(
    () => [{ thingId: thing.id, name: thing.name, color: thing.color }],
    [thing.id, thing.name, thing.color],
  )

  const filtered = useMemo(() => [{ thing, logs: thing.logs }], [thing])

  const frequencyPoints = useMemo(
    () =>
      chartType === 'frequency' && range
        ? buildFrequencyData(filtered, range.start, range.end, 'day')
        : [],
    [chartType, filtered, range],
  )

  const timeOfDayPoints = useMemo(
    () => (chartType === 'timeOfDay' ? buildTimeOfDayData(filtered, 'hourly') : []),
    [chartType, filtered],
  )

  function handleExport() {
    downloadTextFile(
      exportFilename(thing.name),
      buildCsv([thing], {
        selectedThingIds: new Set([thing.id]),
        // The whole history: this screen has no date filter, so neither does
        // its export. Use the Data panel for a narrower range.
        startDate: range ? range.start : new Date(0),
        endDate: range ? range.end : new Date(),
      }),
      'text/csv',
    )
  }

  return (
    <div className="overlay overlay--full" onClick={onClose} role="presentation">
      <div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-label={t('detail.aria', { name: thing.name })}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="detail__header">
          {/* The name gets its own row so the buttons below it can stay on a
              single line, even on a narrow phone. */}
          <div className="detail__titlerow">
            <span className="detail__swatch" style={{ backgroundColor: colorToCss(thing.color) }} />
            <h2 className="detail__title">{thing.name}</h2>
          </div>

          <div className="detail__actions">
            <button type="button" className="button" onClick={onEditThing}>
              {t('detail.rename')}
            </button>
            <button
              type="button"
              className="button"
              onClick={handleExport}
              disabled={thing.logs.length === 0}
            >
              {t('detail.exportCsv')}
            </button>
            <button type="button" className="button button--primary" onClick={() => setAddingLog(true)}>
              {t('detail.addEntry')}
            </button>
            <button type="button" className="button" onClick={onClose}>
              {t('action.done')}
            </button>
          </div>
        </header>

        <p className="detail__summary">
          {tc('detail.entries', thing.logs.length)}
          {range && (
            <>
              {' · '}
              {t('detail.range', {
                start: range.start.toLocaleDateString(),
                end: range.end.toLocaleDateString(),
              })}
            </>
          )}
        </p>

        {thing.logs.length > 0 && (
          <>
            <div className="controls__row" role="group" aria-label={t('chart.type')}>
              <button
                type="button"
                className={`segment ${view === 'frequency' ? 'segment--on' : ''}`}
                onClick={() => setView('frequency')}
              >
                {t('chart.frequency')}
              </button>
              <button
                type="button"
                className={`segment ${view === 'timeOfDay' ? 'segment--on' : ''}`}
                onClick={() => setView('timeOfDay')}
              >
                {t('chart.timeOfDay')}
              </button>
              <button
                type="button"
                className={`segment ${view === 'map' ? 'segment--on' : ''}`}
                onClick={() => setView('map')}
              >
                {t('tab.map')}
              </button>
            </div>

            <div className="detail__chart">
              {view === 'frequency' && (
                <FrequencyChart points={frequencyPoints} legend={legend} granularity="day" />
              )}
              {view === 'timeOfDay' && <TimeOfDayChart points={timeOfDayPoints} legend={legend} />}
              {view === 'map' && <MapScreen things={[thing]} singleThing={thing} />}
            </div>
          </>
        )}

        <h3 className="detail__section-title">{t('detail.history')}</h3>

        {sortedLogs.length === 0 ? (
          <p className="empty">{t('detail.noEntries')}</p>
        ) : (
          <ul className="log-list">
            {sortedLogs.map((log) => {
              const date = parseAppDate(log.date)
              return (
                <li key={log.id} className="log-list__item">
                  <div className="log-list__main">
                    <span className="log-list__date">
                      {date ? formatFullDateTime(date) : t('log.unreadableDate')}
                    </span>
                    {log.note && <span className="log-list__note">{log.note}</span>}
                    {log.location && (
                      <span className="log-list__location">
                        {log.location.latitude.toFixed(4)}, {log.location.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>

                  <div className="log-list__actions">
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setEditingLog(log)}
                    >
                      {t('action.edit')}
                    </button>
                    <button
                      type="button"
                      className="button button--small button--danger"
                      onClick={() => setDeletingLog(log)}
                    >
                      {t('action.delete')}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {(addingLog || editingLog) && (
        <LogEntryDialog
          log={editingLog}
          thingName={thing.name}
          onSave={(date, note) => {
            if (editingLog) {
              onUpdateLog(editingLog.id, date, note)
            } else {
              onAddLog(date, note)
            }
            setAddingLog(false)
            setEditingLog(null)
          }}
          onCancel={() => {
            setAddingLog(false)
            setEditingLog(null)
          }}
        />
      )}

      {deletingLog && (
        <ConfirmDialog
          title={t('log.deleteTitle')}
          message={t('log.deleteMessage', {
            when: parseAppDate(deletingLog.date)
              ? formatFullDateTime(parseAppDate(deletingLog.date) as Date)
              : t('log.unreadableDate'),
          })}
          confirmLabel={t('action.delete')}
          onConfirm={() => {
            onDeleteLog(deletingLog.id)
            setDeletingLog(null)
          }}
          onCancel={() => setDeletingLog(null)}
        />
      )}
    </div>
  )
}

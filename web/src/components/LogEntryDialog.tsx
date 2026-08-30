/**
 * Add or edit a single log entry — replacing the iOS AddLogEntryView and
 * EditLogEntryView, which were the same form with different starting values.
 *
 * A log is a moment in time plus an optional note. Location is shown when the
 * entry has one but is not editable here, matching the iOS behaviour of
 * capturing it automatically rather than by hand.
 */

import { useEffect, useState } from 'react'
import type { LogEntry } from '../domain/types'
import { parseAppDate, parseDateTimeInput, toDateTimeInputValue } from '../domain/dates'
import { useI18n } from '../i18n'

interface LogEntryDialogProps {
  /** The entry being edited, or null when adding a new one. */
  log: LogEntry | null
  thingName: string
  onSave: (date: Date, note: string | null) => void
  onCancel: () => void
}

export function LogEntryDialog({ log, thingName, onSave, onCancel }: LogEntryDialogProps) {
  const { t } = useI18n()
  const [dateText, setDateText] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Fill the form: an existing entry's own values, or now for a new one.
  useEffect(() => {
    const existing = log ? parseAppDate(log.date) : null
    setDateText(toDateTimeInputValue(existing ?? new Date()))
    setNote(log?.note ?? '')
    setError(null)
  }, [log])

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const date = parseDateTimeInput(dateText)
    if (!date) {
      setError(t('log.dateError'))
      return
    }
    onSave(date, note.trim() === '' ? null : note)
  }

  const location = log?.location ?? null

  return (
    <div className="overlay" onClick={onCancel} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={log ? t('log.editTitle', { name: thingName }) : t('log.addTitle', { name: thingName })}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">
          {log ? t('log.editTitle', { name: thingName }) : t('log.addTitle', { name: thingName })}
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">{t('log.when')}</span>
            <input
              type="datetime-local"
              className="field__input"
              value={dateText}
              onChange={(event) => setDateText(event.target.value)}
              autoFocus
            />
          </label>

          <label className="field">
            <span className="field__label">{t('log.note')}</span>
            <textarea
              className="field__input"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t('log.notePlaceholder')}
            />
          </label>

          {location && (
            <p className="panel-section__text">
              {t('log.locationRecorded', {
                latitude: location.latitude.toFixed(5),
                longitude: location.longitude.toFixed(5),
              })}
            </p>
          )}

          {error && <p className="notice notice--error">{error}</p>}

          <div className="dialog__buttons">
            <button type="button" className="button" onClick={onCancel}>
              {t('action.cancel')}
            </button>
            <button type="submit" className="button button--primary">
              {t('action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

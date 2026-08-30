/**
 * Import and export, which is how your existing iPhone data gets into the web app.
 *
 * Import deliberately shows you what it found and asks for confirmation BEFORE
 * replacing anything, because importing overwrites everything currently stored.
 */

import { useRef, useState } from 'react'
import type { AppData, Thing } from '../domain/types'
import { normalizeAppData } from '../storage/normalize'
import { csvToThings } from '../storage/csv'
import { CsvExportSection } from './CsvExportSection'
import { buildExportJson, downloadTextFile } from '../storage/storage'
import { totalLogCount } from '../domain/things'
import type { ImportWarning } from '../storage/normalize'
import { useI18n } from '../i18n'

interface DataPanelProps {
  things: Thing[]
  /** Everything stored, so a backup can carry the categories too. */
  appData: AppData
  onImport: (things: Thing[], warnings: ImportWarning[], data?: Partial<AppData>) => void
  onClose: () => void
}

/** What a chosen file turned out to contain, held while awaiting confirmation. */
interface PendingImport {
  filename: string
  source: 'csv' | 'json'
  things: Thing[]
  warnings: ImportWarning[]
  /**
   * A JSON backup brings its own categories. A CSV has none, so importing one
   * keeps the categories already set up and drops its things into the default.
   */
  data?: Partial<AppData>
}

export function DataPanel({ things, appData, onImport, onClose }: DataPanelProps) {
  const { t, tc } = useI18n()

  /**
   * Turn an import warning into a sentence in the current language.
   * The import code reports what happened as a key; choosing the words — and
   * the singular or plural form — happens here, where the language is known.
   */
  const formatWarning = (warning: ImportWarning) =>
    warning.count === undefined
      ? t(warning.key as Parameters<typeof t>[0], warning.values)
      : tc(warning.key, warning.count, warning.values)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingImport | null>(null)
  const [error, setError] = useState<string | null>(null)

  /** Read the chosen file and preview it — nothing is saved at this point. */
  async function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setPending(null)

    try {
      const text = await file.text()

      // Decide how to read it. The file extension is the hint, but the content
      // is the decider — a CSV renamed to .json should still import.
      const looksLikeJson = text.trim().startsWith('{') || text.trim().startsWith('[')
      const source: 'csv' | 'json' = looksLikeJson ? 'json' : 'csv'

      // A JSON backup is read as a whole app — things, categories and which
      // category is default. A CSV only ever carries things.
      const parsed = source === 'json' ? normalizeAppData(JSON.parse(text)) : null
      const result = parsed
        ? { things: parsed.data.things, warnings: parsed.warnings }
        : csvToThings(text)

      if (result.things.length === 0) {
        // Report the import's own explanation when it has one, since it is
        // more specific than the generic message.
        setError(
          result.warnings[0]
            ? formatWarning(result.warnings[0])
            : t('warn.noThingsFound'),
        )
        return
      }

      setPending({
        filename: file.name,
        source,
        things: result.things,
        warnings: result.warnings,
        data: parsed
          ? {
              categories: parsed.data.categories,
              defaultCategoryId: parsed.data.defaultCategoryId,
            }
          : undefined,
      })
    } catch {
      setError(t('data.importUnreadable'))
    } finally {
      // Reset the input so choosing the SAME file again still triggers a change event.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleExport() {
    const stamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    downloadTextFile(
      `${stamp}-eventstracker-backup.json`,
      buildExportJson(appData),
      'application/json',
    )
  }

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('data.aria')}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">{t('data.title')}</h2>

        <section className="panel-section">
          <h3 className="panel-section__title">{t('data.backupTitle')}</h3>
          <p className="panel-section__text">{t('data.backupText')}</p>
          <button type="button" className="button" onClick={handleExport} disabled={things.length === 0}>
            {t('data.backupButton', { things: things.length, logs: totalLogCount(things) })}
          </button>
        </section>

        {things.length > 0 && <CsvExportSection things={things} />}

        <section className="panel-section">
          <h3 className="panel-section__title">{t('data.importTitle')}</h3>
          <p className="panel-section__text">{t('data.importText1')}</p>
          <p className="panel-section__text">{t('data.importText2')}</p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,.json,application/json"
            onChange={handleFileChosen}
            className="field__file"
          />

          {error && <p className="notice notice--error">{error}</p>}

          {pending && (
            <div className="import-preview">
              <p className="panel-section__text">
                {t('data.importSummary', {
                  filename: pending.filename,
                  format: pending.source === 'csv' ? 'CSV' : 'JSON',
                  things: pending.things.length,
                  logs: totalLogCount(pending.things),
                })}
              </p>

              {pending.warnings.length > 0 && (
                <ul className="notice notice--warning">
                  {pending.warnings.map((warning) => (
                    <li key={warning.key}>{formatWarning(warning)}</li>
                  ))}
                </ul>
              )}

              <p className="notice notice--warning">
                {t('data.importReplaceWarning', { count: things.length })}
              </p>

              <div className="dialog__buttons">
                <button type="button" className="button" onClick={() => setPending(null)}>
                  {t('action.cancel')}
                </button>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    onImport(pending.things, pending.warnings, pending.data)
                    setPending(null)
                  }}
                >
                  {t('data.importConfirm')}
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="dialog__buttons">
          <button type="button" className="button" onClick={onClose}>
            {t('action.done')}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * The main screen, replacing the iOS ContentView.
 *
 * What it does: shows every tracked thing as a coloured tile, logs an event
 * when you tap one, and provides search, sorting, add/edit/delete, and
 * import/export.
 *
 * What it deliberately does NOT do yet: charts, the detail screen, maps and
 * CSV export. Those are the next steps in the migration plan.
 */

import { useMemo, useState } from 'react'
import type { ColorData, SortOption, Thing } from './domain/types'
import { useI18n, LANGUAGES } from './i18n'
import type { LanguageCode, TranslationKey } from './i18n'
import { visibleThings } from './domain/things'
import { useStore } from './state/useStore'
import { ThingTile } from './components/ThingTile'
import { ThingDialog } from './components/ThingDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DataPanel } from './components/DataPanel'
import { AnalyticsScreen } from './components/AnalyticsScreen'
import { ThingDetailScreen } from './components/ThingDetailScreen'
import { MapScreen } from './components/MapScreen'
import { useLocation } from './state/useLocation'
import { useTheme } from './state/useTheme'
import type { ThemeChoice } from './state/useTheme'
import type { ImportWarning } from './storage/normalize'

/** Which pop-up, if any, is currently open. */
type ActiveDialog =
  | { kind: 'none' }
  | { kind: 'addThing' }
  | { kind: 'editThing'; thing: Thing }
  | { kind: 'deleteThing'; thing: Thing }
  | { kind: 'data' }
  | { kind: 'detail'; thingId: string }

/** Which of the two top-level screens is showing. */
type Tab = 'things' | 'analytics' | 'map'

/** Details of the log just created, so it can be undone. */
interface UndoState {
  thingId: string
  logId: string
  thingName: string
}

/** The sort options, in the order they appear in the menu. */
const SORT_OPTIONS: SortOption[] = ['dateCreated', 'ascending', 'descending', 'manual']

export default function App() {
  const { t, tc, language, setLanguage } = useI18n()
  const store = useStore()
  const location = useLocation()
  const theme = useTheme()

  const [tab, setTab] = useState<Tab>('things')
  const [searchText, setSearchText] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('dateCreated')
  const [isEditing, setIsEditing] = useState(false)
  const [dialog, setDialog] = useState<ActiveDialog>({ kind: 'none' })
  const [undo, setUndo] = useState<UndoState | null>(null)

  /**
   * Work out which tiles to show, and in what order.
   * `useMemo` re-runs this only when the inputs actually change, so typing in
   * the search box doesn't re-sort the whole list on every keystroke.
   */
  const shownThings = useMemo(
    () => visibleThings(store.things, searchText, sortOption),
    [store.things, searchText, sortOption],
  )

  function handleLog(thing: Thing) {
    const logId = store.logEvent(thing.id, location.lastKnown)
    // Offer a brief undo, because a tile is easy to tap by accident.
    setUndo({ thingId: thing.id, logId, thingName: thing.name })
    window.setTimeout(() => {
      // Only clear the banner if it is still showing THIS log, so a newer
      // tap's undo option doesn't get cancelled by an older timer.
      setUndo((current) => (current?.logId === logId ? null : current))
    }, 5000)
  }

  function handleSaveThing(name: string, color: ColorData) {
    if (dialog.kind === 'editThing') {
      store.updateThing(dialog.thing.id, { name, color })
    } else {
      store.addThing(name, color)
    }
    setDialog({ kind: 'none' })
  }

  // --- Blocked state -------------------------------------------------------
  // Storage could not be read. Rather than showing an empty app (which would
  // look exactly like data loss, and would overwrite the damaged data on the
  // next tap), stop and let the user decide what to do.
  if (store.status === 'blocked') {
    return (
      <div className="app">
        <div className="blocked">
          <h1>{t('blocked.title')}</h1>
          <p>{t(store.loadError as TranslationKey)}</p>
          <p>{t('blocked.reassurance')}</p>

          {store.rawTextOnError && (
            <details className="blocked__details">
              <summary>{t('blocked.showRaw')}</summary>
              <pre className="blocked__raw">{store.rawTextOnError}</pre>
            </details>
          )}

          <button type="button" className="button button--danger" onClick={store.startFreshAfterError}>
            {t('blocked.discard')}
          </button>
        </div>
      </div>
    )
  }

  if (store.status === 'loading') {
    return <div className="app"><p className="loading">{t('loading')}</p></div>
  }

  // --- Normal state --------------------------------------------------------
  return (
    <div className="app">
      <header className="toolbar">
        <h1 className="toolbar__title">{t('app.title')}</h1>

        <div className="toolbar__controls">
          <div className="tabs" role="group" aria-label={t('toolbar.screen')}>
            <button
              type="button"
              className={`segment ${tab === 'things' ? 'segment--on' : ''}`}
              onClick={() => setTab('things')}
            >
              {t('tab.things')}
            </button>
            <button
              type="button"
              className={`segment ${tab === 'analytics' ? 'segment--on' : ''}`}
              onClick={() => setTab('analytics')}
            >
              {t('tab.analytics')}
            </button>
            <button
              type="button"
              className={`segment ${tab === 'map' ? 'segment--on' : ''}`}
              onClick={() => setTab('map')}
            >
              {t('tab.map')}
            </button>
          </div>

          {/* The location switch. Off by default: a permission prompt before
              the user has asked for anything is the classic web annoyance, and
              someone who only wants their charts should never see one. */}
          <button
            type="button"
            className={`button ${location.status === 'on' ? 'button--primary' : ''}`}
            onClick={() => (location.status === 'off' ? location.enable() : location.disable())}
            disabled={location.status === 'unsupported'}
            title={t('location.hint')}
          >
            {location.status === 'on'
              ? t('location.tagging')
              : location.status === 'requesting'
                ? t('location.locating')
                : t('location.tag')}
          </button>

          {tab === 'things' && (
            <>
          <input
            className="toolbar__search"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t('toolbar.search')}
            aria-label={t('toolbar.search')}
          />

          <label className="toolbar__sort">
            <span className="visually-hidden">{t('toolbar.sortBy')}</span>
            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value as SortOption)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {t(`sort.${option}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>

          <button type="button" className="button" onClick={() => setDialog({ kind: 'data' })}>
            {t('toolbar.data')}
          </button>

          <button
            type="button"
            className={`button ${isEditing ? 'button--primary' : ''}`}
            onClick={() => setIsEditing((current) => !current)}
          >
            {isEditing ? t('action.done') : t('toolbar.edit')}
          </button>
            </>
          )}

          {/* Every language is named in its own language, so someone who has
              landed in the wrong one can still find theirs. */}
          <label className="toolbar__language">
            <span className="visually-hidden">{t('appearance.label')}</span>
            <select
              value={theme.choice}
              onChange={(event) => theme.setChoice(event.target.value as ThemeChoice)}
              title={t('appearance.label')}
            >
              {(['system', 'light', 'dark'] as ThemeChoice[]).map((option) => (
                <option key={option} value={option}>
                  {t(`appearance.${option}` as TranslationKey)}
                </option>
              ))}
            </select>
          </label>

          <label className="toolbar__language">
            <span className="visually-hidden">{t('toolbar.language')}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as LanguageCode)}
            >
              {(Object.keys(LANGUAGES) as LanguageCode[]).map((code) => (
                <option key={code} value={code}>
                  {LANGUAGES[code]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {store.saveError && (
        <p className="notice notice--error">{t(store.saveError as TranslationKey)}</p>
      )}

      {location.message && (
        <p className="notice notice--warning">{t(location.message as TranslationKey)}</p>
      )}

      {store.warnings.length > 0 && (
        <div className="notice notice--warning">
          <ul>
            {store.warnings.map((warning) => (
              <li key={warning.key}>
                {warning.count === undefined
                  ? t(warning.key as TranslationKey, warning.values)
                  : tc(warning.key, warning.count, warning.values)}
              </li>
            ))}
          </ul>
          <button type="button" className="button button--small" onClick={store.dismissWarnings}>
            {t('action.dismiss')}
          </button>
        </div>
      )}

      {isEditing && tab === 'things' && (
        <p className="hint">{t('grid.editModeHint')}</p>
      )}

      {tab === 'things' && (
      <main className="grid">
        {shownThings.map((thing) => (
          <ThingTile
            key={thing.id}
            thing={thing}
            isEditing={isEditing}
            onLog={() => handleLog(thing)}
            onOpen={() => setDialog({ kind: 'detail', thingId: thing.id })}
            onEdit={() => setDialog({ kind: 'editThing', thing })}
            onDelete={() => setDialog({ kind: 'deleteThing', thing })}
          />
        ))}

        {/* The add button sits at the end of the grid, as it does on iOS.
            It is hidden while searching, where it would be confusing. */}
        {searchText.trim() === '' && (
          <button
            type="button"
            className="tile tile--add"
            onClick={() => setDialog({ kind: 'addThing' })}
            aria-label={t('tile.addAria')}
          >
            +
          </button>
        )}
      </main>
      )}

      {tab === 'analytics' && <AnalyticsScreen things={store.things} />}

      {tab === 'map' && <MapScreen things={store.things} />}

      {tab === 'things' && store.things.length === 0 && (
        <p className="empty">{t('grid.empty')}</p>
      )}

      {undo && (
        <div className="toast" role="status">
          <span>{t('toast.logged', { name: undo.thingName })}</span>
          <button
            type="button"
            className="button button--small"
            onClick={() => {
              store.deleteLog(undo.thingId, undo.logId)
              setUndo(null)
            }}
          >
            {t('action.undo')}
          </button>
        </div>
      )}

      {(dialog.kind === 'addThing' || dialog.kind === 'editThing') && (
        <ThingDialog
          thing={dialog.kind === 'editThing' ? dialog.thing : null}
          onSave={handleSaveThing}
          onCancel={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'deleteThing' && (
        <ConfirmDialog
          title={t('thing.deleteTitle', { name: dialog.thing.name })}
          message={tc('thing.deleteMessage', dialog.thing.logs.length)}
          confirmLabel={t('action.delete')}
          onConfirm={() => {
            store.deleteThing(dialog.thing.id)
            setDialog({ kind: 'none' })
          }}
          onCancel={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'detail' &&
        (() => {
          // Look the thing up by id on every render rather than holding a copy.
          // A held copy would go stale the moment a log was added, which is the
          // bug the iOS version worked around with a binding into the store.
          const thing = store.things.find((candidate) => candidate.id === dialog.thingId)
          if (!thing) return null

          return (
            <ThingDetailScreen
              thing={thing}
              onClose={() => setDialog({ kind: 'none' })}
              onEditThing={() => setDialog({ kind: 'editThing', thing })}
              onAddLog={(date, note) => store.addLog(thing.id, date, note)}
              onUpdateLog={(logId, date, note) => store.updateLog(thing.id, logId, { date, note })}
              onDeleteLog={(logId) => store.deleteLog(thing.id, logId)}
            />
          )
        })()}

      {dialog.kind === 'data' && (
        <DataPanel
          things={store.things}
          onImport={(things: Thing[], warnings: ImportWarning[]) => {
            store.replaceAll(things, warnings)
            setDialog({ kind: 'none' })
          }}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}
    </div>
  )
}

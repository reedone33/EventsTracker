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
import { orderedCategories, thingsInCategory } from './domain/categories'
import { useStore } from './state/useStore'
import { ThingDialog } from './components/ThingDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { DataPanel } from './components/DataPanel'
import { AnalyticsScreen } from './components/AnalyticsScreen'
import { ThingDetailScreen } from './components/ThingDetailScreen'
import { MapScreen } from './components/MapScreen'
import { CategorySection } from './components/CategorySection'
import { CategoryManager } from './components/CategoryManager'
import { IconMenu } from './components/IconMenu'
import type { MenuSection } from './components/IconMenu'
import {
  AppearanceIcon,
  LocationIcon,
  MenuIcon,
  SearchIcon,
  SortIcon,
} from './components/Icons'
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
  | { kind: 'categories' }

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

/** Where the chosen sort order is remembered between visits. */
const SORT_KEY = 'eventstracker.sort'

/** Which categories were left open. */
const EXPANDED_KEY = 'eventstracker.expandedCategories'

function readExpandedCategories(): Set<string> {
  try {
    const stored = window.localStorage.getItem(EXPANDED_KEY)
    if (stored) return new Set(JSON.parse(stored) as string[])
  } catch {
    // Blocked or damaged storage just means everything starts folded.
  }
  return new Set()
}

/**
 * The sort order to open with: whatever was chosen last time, or newest-first
 * for a first visit.
 *
 * This matters most for Manual: someone who has arranged their tiles by hand
 * wants to see that arrangement on opening, not have it silently replaced by
 * date order every time.
 */
function readStoredSort(): SortOption {
  try {
    const stored = window.localStorage.getItem(SORT_KEY)
    if (SORT_OPTIONS.includes(stored as SortOption)) return stored as SortOption
  } catch {
    // Blocked storage just means no remembered choice.
  }
  return 'dateCreated'
}

export default function App() {
  const { t, tc, language, setLanguage } = useI18n()
  const store = useStore()
  const location = useLocation()
  const theme = useTheme()

  const [tab, setTab] = useState<Tab>('things')
  const [searchText, setSearchText] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(readExpandedCategories)

  /** Fold or unfold a category, and remember it. */
  function toggleCategory(categoryId: string) {
    setExpandedCategories((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      try {
        window.localStorage.setItem(EXPANDED_KEY, JSON.stringify([...next]))
      } catch {
        // Not remembering which were open is harmless.
      }
      return next
    })
  }
  const [sortOption, setSortOptionState] = useState<SortOption>(readStoredSort)

  /** Change the sort order and remember it for next time. */
  function setSortOption(next: SortOption) {
    setSortOptionState(next)
    try {
      window.localStorage.setItem(SORT_KEY, next)
    } catch {
      // Not remembering the choice is harmless.
    }
  }
  const [isEditing, setIsEditing] = useState(false)
  const [dialog, setDialog] = useState<ActiveDialog>({ kind: 'none' })
  const [undo, setUndo] = useState<UndoState | null>(null)

  /**
   * Work out which tiles to show, and in what order.
   * `useMemo` re-runs this only when the inputs actually change, so typing in
   * the search box doesn't re-sort the whole list on every keystroke.
   */
  /**
   * Reordering is only possible in Manual sort, with the search box empty and
   * Reorder pressed — exactly the iOS rule. In any other sort the order comes
   * from the data, so a dragged tile would just spring back.
   */
  const canReorder = sortOption === 'manual' && searchText.trim() === '' && isEditing

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

  function handleSaveThing(name: string, color: ColorData, categoryId: string) {
    if (dialog.kind === 'editThing') {
      store.updateThing(dialog.thing.id, { name, color })
      store.setThingCategory(dialog.thing.id, categoryId)
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

        {/* Icons only, so the row still fits on a phone. Everything that used
            to be a labelled button is now either an icon with a menu behind
            it, or an entry in the main menu. */}
        <div className="toolbar__icons">
          <button
            type="button"
            className={`icon-btn ${isSearchOpen || searchText ? 'icon-btn--on' : ''}`}
            onClick={() => {
              // Closing the search also clears it — leaving a hidden filter in
              // place would silently hide tiles with no visible explanation.
              if (isSearchOpen) setSearchText('')
              setIsSearchOpen((open) => !open)
            }}
            aria-label={t('toolbar.search')}
            aria-expanded={isSearchOpen}
            title={t('toolbar.search')}
          >
            <SearchIcon />
          </button>

          <IconMenu
            icon={<SortIcon />}
            label={t('toolbar.sortBy')}
            sections={[
              {
                title: t('toolbar.sortBy'),
                items: SORT_OPTIONS.map((option) => ({
                  key: option,
                  label: t(`sort.${option}` as TranslationKey),
                  selected: sortOption === option,
                  onSelect: () => setSortOption(option),
                })),
              },
            ]}
          />

          <IconMenu
            icon={<AppearanceIcon />}
            label={t('appearance.label')}
            sections={[
              {
                title: t('appearance.label'),
                items: (['system', 'light', 'dark'] as ThemeChoice[]).map((option) => ({
                  key: option,
                  label: t(`appearance.${option}` as TranslationKey),
                  selected: theme.choice === option,
                  onSelect: () => theme.setChoice(option),
                })),
              },
            ]}
          />

          <button
            type="button"
            className={`icon-btn ${location.status === 'on' ? 'icon-btn--on' : ''}`}
            onClick={() => (location.status === 'off' ? location.enable() : location.disable())}
            disabled={location.status === 'unsupported'}
            aria-pressed={location.status === 'on'}
            aria-label={t('location.tag')}
            title={
              location.status === 'on'
                ? t('location.tagging')
                : location.status === 'requesting'
                  ? t('location.locating')
                  : t('location.hint')
            }
          >
            <LocationIcon />
          </button>

          {/* The main menu: which screen to show, the occasional actions, and
              the language. All things reached now and then rather than
              constantly, which is why they are behind one icon. */}
          <IconMenu
            icon={<MenuIcon />}
            label={t('toolbar.menu')}
            sections={
              [
                {
                  title: t('menu.view'),
                  items: (['things', 'analytics', 'map'] as Tab[]).map((option) => ({
                    key: option,
                    label: t(`tab.${option}` as TranslationKey),
                    selected: tab === option,
                    onSelect: () => setTab(option),
                  })),
                },
                {
                  title: t('menu.actions'),
                  items: [
                    {
                      key: 'categories',
                      label: t('category.manage'),
                      onSelect: () => setDialog({ kind: 'categories' }),
                    },
                    {
                      key: 'data',
                      label: t('toolbar.data'),
                      onSelect: () => setDialog({ kind: 'data' }),
                    },
                    {
                      key: 'edit',
                      label: isEditing
                        ? t('action.done')
                        : sortOption === 'manual'
                          ? t('toolbar.reorder')
                          : t('toolbar.edit'),
                      selected: isEditing,
                      onSelect: () => {
                        // Editing only means anything on the tile grid, so
                        // turning it on brings that screen with it.
                        setTab('things')
                        setIsEditing((current) => !current)
                      },
                    },
                  ],
                },
                {
                  title: t('toolbar.language'),
                  items: (Object.keys(LANGUAGES) as LanguageCode[]).map((code) => ({
                    key: code,
                    label: LANGUAGES[code],
                    selected: language === code,
                    onSelect: () => setLanguage(code),
                  })),
                },
              ] satisfies MenuSection[]
            }
          />
        </div>
      </header>

      {/* The search field appears under the toolbar when its icon is pressed,
          rather than taking up a permanent slot in the row. */}
      {isSearchOpen && (
        <div className="searchbar">
          <input
            className="searchbar__input"
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder={t('toolbar.search')}
            aria-label={t('toolbar.search')}
            autoFocus
          />
        </div>
      )}

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
        <p className="hint">
          {canReorder
            ? t('grid.reorderHint')
            : sortOption === 'manual' && searchText.trim() !== ''
              ? t('grid.reorderSearchHint')
              : sortOption === 'manual'
                ? t('grid.editModeHint')
                : t('grid.reorderNeedsManual')}
        </p>
      )}

      {tab === 'things' && (
        <main>
          {orderedCategories(store.appData).map((category) => {
            const isDefault = category.id === store.defaultCategoryId
            // Searching temporarily opens any category holding a match —
            // otherwise a search would appear to find nothing.
            const isSearching = searchText.trim() !== ''
            const inCategory = thingsInCategory(shownThings, category.id)

            // A folded category with no matches is hidden entirely while
            // searching, rather than leaving a row of empty headings.
            if (isSearching && inCategory.length === 0 && !isDefault) return null

            return (
              <CategorySection
                key={category.id}
                category={category}
                isDefault={isDefault}
                things={inCategory}
                isExpanded={isSearching || expandedCategories.has(category.id)}
                onToggleExpanded={() => toggleCategory(category.id)}
                isEditing={isEditing}
                canReorder={canReorder}
                onReorder={store.reorderThings}
                onLog={handleLog}
                onOpen={(thing) => setDialog({ kind: 'detail', thingId: thing.id })}
                onEditThing={(thing) => setDialog({ kind: 'editThing', thing })}
                onDeleteThing={(thing) => setDialog({ kind: 'deleteThing', thing })}
                onAddThing={
                  isDefault && !isSearching ? () => setDialog({ kind: 'addThing' }) : undefined
                }
              />
            )
          })}
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
          categories={store.categories}
          defaultCategoryId={store.defaultCategoryId}
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

      {dialog.kind === 'categories' && (
        <CategoryManager
          categories={store.categories}
          things={store.things}
          defaultCategoryId={store.defaultCategoryId}
          onAdd={store.addCategory}
          onRename={store.renameCategory}
          onSetDefault={store.setDefaultCategory}
          onMove={store.moveCategory}
          onDelete={store.deleteCategory}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}

      {dialog.kind === 'data' && (
        <DataPanel
          things={store.things}
          appData={store.appData}
          onImport={(things: Thing[], warnings: ImportWarning[], data) => {
            store.replaceAll(things, warnings, data)
            setDialog({ kind: 'none' })
          }}
          onClose={() => setDialog({ kind: 'none' })}
        />
      )}
    </div>
  )
}

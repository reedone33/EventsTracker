/**
 * The app's single source of truth, replacing the iOS DataStore.
 *
 * In SwiftUI, DataStore was an ObservableObject holding `@Published var things`.
 * The React equivalent is this custom hook: it holds the list in state, and
 * every function that changes the list also writes it to storage — mirroring
 * the iOS pattern of calling `store.save()` after each edit, but without the
 * risk of forgetting to call it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData, Category, LocationData, Thing } from '../domain/types'
import { createLogEntry, createThing, moveThingById, newId } from '../domain/things'
import {
  addCategory as addCategoryTo,
  deleteCategory as deleteCategoryFrom,
  ensureCategories,
  moveCategory as moveCategoryIn,
  renameCategory as renameCategoryIn,
  setDefaultCategory as setDefaultCategoryIn,
  setThingCategory as setThingCategoryIn,
} from '../domain/categories'
import type { DeleteCategoryMode } from '../domain/categories'
import { loadThings, saveAppData } from '../storage/storage'
import type { ImportWarning } from '../storage/normalize'

/**
 * 'loading' — still reading from storage on first render.
 * 'ready'   — safe to read and write.
 * 'blocked' — reading failed; saving is disabled so we can't destroy the data.
 */
export type StoreStatus = 'loading' | 'ready' | 'blocked'

export interface Store {
  things: Thing[]
  categories: Category[]
  defaultCategoryId: string
  status: StoreStatus
  /** Explanation shown when status is 'blocked'. */
  loadError: string | null
  /** The damaged text, offered to the user for rescue when loading failed. */
  rawTextOnError: string | null
  /** Non-fatal notes from the last load or import, as translation keys. */
  warnings: ImportWarning[]
  /** Set when a save fails, e.g. storage full. */
  saveError: string | null

  addThing: (name: string, color: Thing['color']) => void
  updateThing: (thingId: string, changes: Partial<Pick<Thing, 'name' | 'color'>>) => void
  deleteThing: (thingId: string) => void
  /** Rearrange the list: put one thing where another currently sits. */
  reorderThings: (movedThingId: string, targetThingId: string) => void
  /** Returns the id of the new log entry, so the caller can offer an undo. */
  logEvent: (thingId: string, location?: LocationData | null) => string
  /** Add a log at a chosen moment, rather than "now". */
  addLog: (thingId: string, date: Date, note: string | null) => void
  /** Change an existing log's time or note. */
  updateLog: (thingId: string, logId: string, changes: { date?: Date; note?: string | null }) => void
  deleteLog: (thingId: string, logId: string) => void
  replaceAll: (things: Thing[], warnings?: ImportWarning[], data?: Partial<AppData>) => void

  /** Everything the app stores, for exporting. */
  appData: AppData

  addCategory: (name: string, makeDefault?: boolean) => void
  renameCategory: (categoryId: string, name: string) => void
  setDefaultCategory: (categoryId: string) => void
  moveCategory: (movedId: string, targetId: string) => void
  deleteCategory: (categoryId: string, mode: DeleteCategoryMode) => void
  setThingCategory: (thingId: string, categoryId: string) => void
  /** Accept that stored data is unreadable and continue with an empty list. */
  startFreshAfterError: () => void
  dismissWarnings: () => void
}

/** An empty app, used until the stored data has been read. */
const EMPTY: AppData = { categories: [], things: [], defaultCategoryId: '' }

export function useStore(): Store {
  const [data, setData] = useState<AppData>(EMPTY)
  const [status, setStatus] = useState<StoreStatus>('loading')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rawTextOnError, setRawTextOnError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<ImportWarning[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)

  // `useRef` keeps a value that survives re-renders without causing one.
  // Here it guards against saving before the first load has finished.
  const canSave = useRef(false)

  // Load once, when the app first appears on screen.
  useEffect(() => {
    const result = loadThings()

    if (result.status === 'ok') {
      setData(result.data)
      setWarnings(result.warnings)
      setStatus('ready')
      canSave.current = true
    } else if (result.status === 'empty') {
      // A fresh install still needs its first category to exist.
      setData(ensureCategories({ things: [] }))
      setStatus('ready')
      canSave.current = true
    } else {
      // Damaged or blocked storage: show the problem, and do not allow saving,
      // because saving now would overwrite whatever is still recoverable.
      setLoadError(result.message)
      setRawTextOnError(result.rawText)
      setStatus('blocked')
      canSave.current = false
    }
  }, [])

  /**
   * Apply a change to the list and persist it in one step.
   * Taking a function (rather than a finished list) guarantees we always build
   * on the newest state, even if several taps land in quick succession.
   */
  const commit = useCallback((update: (current: AppData) => AppData) => {
    setData((current) => {
      const next = update(current)
      if (canSave.current) {
        const error = saveAppData(next)
        setSaveError(error)
      }
      return next
    })
  }, [])

  /** Shorthand for the many operations that only change the list of things. */
  const commitThings = useCallback(
    (update: (things: Thing[]) => Thing[]) => {
      commit((current) => ({ ...current, things: update(current.things) }))
    },
    [commit],
  )

  const addThing = useCallback(
    (name: string, color: Thing['color']) => {
      // A new thing joins the default category, which is what makes the default
      // "the one new things go into".
      commit((current) => ({
        ...current,
        things: [
          ...current.things,
          { ...createThing(name, color), categoryId: current.defaultCategoryId },
        ],
      }))
    },
    [commit],
  )

  const updateThing = useCallback(
    (thingId: string, changes: Partial<Pick<Thing, 'name' | 'color'>>) => {
      commitThings((things) =>
        things.map((thing) => (thing.id === thingId ? { ...thing, ...changes } : thing)),
      )
    },
    [commit],
  )

  const deleteThing = useCallback(
    (thingId: string) => {
      commitThings((things) => things.filter((thing) => thing.id !== thingId))
    },
    [commit],
  )

  const reorderThings = useCallback(
    (movedThingId: string, targetThingId: string) => {
      commitThings((things) => moveThingById(things, movedThingId, targetThingId))
    },
    [commit],
  )

  const logEvent = useCallback(
    (thingId: string, location?: LocationData | null) => {
      const entry = createLogEntry(location)
      commitThings((things) =>
        things.map((thing) =>
          thing.id === thingId ? { ...thing, logs: [...thing.logs, entry] } : thing,
        ),
      )
      return entry.id
    },
    [commit],
  )

  const addLog = useCallback(
    (thingId: string, date: Date, note: string | null) => {
      const entry = {
        id: newId(),
        date: date.toISOString(),
        location: null,
        note: note && note.trim() !== '' ? note : null,
      }
      commitThings((things) =>
        things.map((thing) =>
          thing.id === thingId ? { ...thing, logs: [...thing.logs, entry] } : thing,
        ),
      )
    },
    [commit],
  )

  const updateLog = useCallback(
    (thingId: string, logId: string, changes: { date?: Date; note?: string | null }) => {
      commitThings((things) =>
        things.map((thing) => {
          if (thing.id !== thingId) return thing
          return {
            ...thing,
            logs: thing.logs.map((log) => {
              if (log.id !== logId) return log
              return {
                ...log,
                // Only touch the fields actually being changed, so a log's
                // location survives an edit to its note.
                date: changes.date ? changes.date.toISOString() : log.date,
                note:
                  changes.note === undefined
                    ? log.note
                    : changes.note && changes.note.trim() !== ''
                      ? changes.note
                      : null,
              }
            }),
          }
        }),
      )
    },
    [commit],
  )

  const deleteLog = useCallback(
    (thingId: string, logId: string) => {
      commitThings((things) =>
        things.map((thing) =>
          thing.id === thingId
            ? { ...thing, logs: thing.logs.filter((log) => log.id !== logId) }
            : thing,
        ),
      )
    },
    [commit],
  )

  const replaceAll = useCallback(
    (nextThings: Thing[], nextWarnings: ImportWarning[] = [], nextData?: Partial<AppData>) => {
      // An import is allowed to unblock a previously unreadable store, because
      // the user has consciously chosen to replace the contents.
      canSave.current = true
      setStatus('ready')
      setLoadError(null)
      setRawTextOnError(null)
      setWarnings(nextWarnings)
      commit((current) =>
        ensureCategories({
          things: nextThings,
          categories: nextData?.categories ?? current.categories,
          defaultCategoryId: nextData?.defaultCategoryId ?? current.defaultCategoryId,
        }),
      )
    },
    [commit],
  )

  const startFreshAfterError = useCallback(() => {
    canSave.current = true
    setStatus('ready')
    setLoadError(null)
    setRawTextOnError(null)
    commit(() => ensureCategories({ things: [] }))
  }, [commit])

  const addCategory = useCallback(
    (name: string, makeDefault = false) => commit((current) => addCategoryTo(current, name, makeDefault)),
    [commit],
  )

  const renameCategory = useCallback(
    (categoryId: string, name: string) => commit((current) => renameCategoryIn(current, categoryId, name)),
    [commit],
  )

  const setDefaultCategory = useCallback(
    (categoryId: string) => commit((current) => setDefaultCategoryIn(current, categoryId)),
    [commit],
  )

  const moveCategory = useCallback(
    (movedId: string, targetId: string) => commit((current) => moveCategoryIn(current, movedId, targetId)),
    [commit],
  )

  const deleteCategory = useCallback(
    (categoryId: string, mode: DeleteCategoryMode) =>
      commit((current) => deleteCategoryFrom(current, categoryId, mode)),
    [commit],
  )

  const setThingCategory = useCallback(
    (thingId: string, categoryId: string) =>
      commit((current) => setThingCategoryIn(current, thingId, categoryId)),
    [commit],
  )

  const dismissWarnings = useCallback(() => setWarnings([]), [])

  return {
    things: data.things,
    categories: data.categories,
    defaultCategoryId: data.defaultCategoryId,
    appData: data,
    status,
    loadError,
    rawTextOnError,
    warnings,
    saveError,
    addThing,
    updateThing,
    deleteThing,
    reorderThings,
    logEvent,
    addLog,
    updateLog,
    deleteLog,
    replaceAll,
    addCategory,
    renameCategory,
    setDefaultCategory,
    moveCategory,
    deleteCategory,
    setThingCategory,
    startFreshAfterError,
    dismissWarnings,
  }
}

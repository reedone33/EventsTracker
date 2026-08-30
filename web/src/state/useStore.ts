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
import type { LocationData, Thing } from '../domain/types'
import { createLogEntry, createThing, newId } from '../domain/things'
import { loadThings, saveThings } from '../storage/storage'
import type { ImportWarning } from '../storage/normalize'

/**
 * 'loading' — still reading from storage on first render.
 * 'ready'   — safe to read and write.
 * 'blocked' — reading failed; saving is disabled so we can't destroy the data.
 */
export type StoreStatus = 'loading' | 'ready' | 'blocked'

export interface Store {
  things: Thing[]
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
  /** Returns the id of the new log entry, so the caller can offer an undo. */
  logEvent: (thingId: string, location?: LocationData | null) => string
  /** Add a log at a chosen moment, rather than "now". */
  addLog: (thingId: string, date: Date, note: string | null) => void
  /** Change an existing log's time or note. */
  updateLog: (thingId: string, logId: string, changes: { date?: Date; note?: string | null }) => void
  deleteLog: (thingId: string, logId: string) => void
  replaceAll: (things: Thing[], warnings?: ImportWarning[]) => void
  /** Accept that stored data is unreadable and continue with an empty list. */
  startFreshAfterError: () => void
  dismissWarnings: () => void
}

export function useStore(): Store {
  const [things, setThings] = useState<Thing[]>([])
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
      setThings(result.things)
      setWarnings(result.warnings)
      setStatus('ready')
      canSave.current = true
    } else if (result.status === 'empty') {
      setThings([])
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
  const commit = useCallback((update: (current: Thing[]) => Thing[]) => {
    setThings((current) => {
      const next = update(current)
      if (canSave.current) {
        const error = saveThings(next)
        setSaveError(error)
      }
      return next
    })
  }, [])

  const addThing = useCallback(
    (name: string, color: Thing['color']) => {
      commit((current) => [...current, createThing(name, color)])
    },
    [commit],
  )

  const updateThing = useCallback(
    (thingId: string, changes: Partial<Pick<Thing, 'name' | 'color'>>) => {
      commit((current) =>
        current.map((thing) => (thing.id === thingId ? { ...thing, ...changes } : thing)),
      )
    },
    [commit],
  )

  const deleteThing = useCallback(
    (thingId: string) => {
      commit((current) => current.filter((thing) => thing.id !== thingId))
    },
    [commit],
  )

  const logEvent = useCallback(
    (thingId: string, location?: LocationData | null) => {
      const entry = createLogEntry(location)
      commit((current) =>
        current.map((thing) =>
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
      commit((current) =>
        current.map((thing) =>
          thing.id === thingId ? { ...thing, logs: [...thing.logs, entry] } : thing,
        ),
      )
    },
    [commit],
  )

  const updateLog = useCallback(
    (thingId: string, logId: string, changes: { date?: Date; note?: string | null }) => {
      commit((current) =>
        current.map((thing) => {
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
      commit((current) =>
        current.map((thing) =>
          thing.id === thingId
            ? { ...thing, logs: thing.logs.filter((log) => log.id !== logId) }
            : thing,
        ),
      )
    },
    [commit],
  )

  const replaceAll = useCallback(
    (nextThings: Thing[], nextWarnings: ImportWarning[] = []) => {
      // An import is allowed to unblock a previously unreadable store, because
      // the user has consciously chosen to replace the contents.
      canSave.current = true
      setStatus('ready')
      setLoadError(null)
      setRawTextOnError(null)
      setWarnings(nextWarnings)
      commit(() => nextThings)
    },
    [commit],
  )

  const startFreshAfterError = useCallback(() => {
    canSave.current = true
    setStatus('ready')
    setLoadError(null)
    setRawTextOnError(null)
    commit(() => [])
  }, [commit])

  const dismissWarnings = useCallback(() => setWarnings([]), [])

  return {
    things,
    status,
    loadError,
    rawTextOnError,
    warnings,
    saveError,
    addThing,
    updateThing,
    deleteThing,
    logEvent,
    addLog,
    updateLog,
    deleteLog,
    replaceAll,
    startFreshAfterError,
    dismissWarnings,
  }
}

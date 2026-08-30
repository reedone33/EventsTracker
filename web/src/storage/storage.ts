/**
 * Saving and loading, replacing the iOS app's things.json file with the
 * browser's localStorage.
 *
 * localStorage is a small box of text the browser keeps for this site, on this
 * device. It survives closing the tab and restarting the computer. It is NOT
 * synced anywhere, so the export function below is the real backup.
 *
 * ONE IMPORTANT SAFETY RULE, which the iOS app got wrong:
 * if reading fails, we must NOT pretend the answer is "no data". The iOS
 * DataStore did exactly that, so a corrupt file looked identical to an empty
 * one — and the next save would overwrite the damaged file with an empty list,
 * destroying any chance of recovery. Here, a read error is reported as an
 * error, and the app refuses to save over it until the user decides.
 */

import type { Thing } from '../domain/types'
import { normalizeThings } from './normalize'
import type { ImportWarning } from './normalize'

/** The key the data is filed under inside the browser's storage. */
const STORAGE_KEY = 'eventstracker.things.v1'

/** Written into exported files so a future version can recognise old backups. */
const SCHEMA_VERSION = 1

/** The three things that can happen when we try to read saved data. */
export type LoadResult =
  | { status: 'ok'; things: Thing[]; warnings: ImportWarning[] }
  | { status: 'empty' }
  | { status: 'error'; message: string; rawText: string | null }

/** Read the saved data out of the browser. */
export function loadThings(): LoadResult {
  let rawText: string | null = null

  try {
    rawText = window.localStorage.getItem(STORAGE_KEY)
  } catch (error) {
    // Private browsing modes and locked-down browser settings can block storage entirely.
    return {
      status: 'error',
      // A translation key, resolved where the language is known.
      message: 'storage.readBlocked',
      rawText: null,
    }
  }

  if (rawText === null || rawText.trim() === '') {
    return { status: 'empty' }
  }

  try {
    const parsed = JSON.parse(rawText)
    const { things, warnings } = normalizeThings(parsed)
    return { status: 'ok', things, warnings }
  } catch (error) {
    return {
      status: 'error',
      message: 'storage.damaged',
      // Handing the raw text back means the user can still copy it out and rescue it.
      rawText,
    }
  }
}

/** Write the data back to the browser. Returns an error message, or null on success. */
export function saveThings(things: Thing[]): string | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(things))
    return null
  } catch (error) {
    // The usual cause is the ~5MB storage limit, which needs a real fix, not a retry.
    return 'storage.saveFailed'
  }
}

/** Build the text of a backup file, including a version tag and a timestamp. */
export function buildExportJson(things: Thing[]): string {
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      things,
    },
    null,
    2,
  )
}

/**
 * Hand the user a file to save.
 * The browser has no "save file" command, so the trick is to create a temporary
 * link pointing at the data, click it invisibly, then throw it away.
 */
export function downloadTextFile(filename: string, text: string, mimeType: string): void {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Release the memory the temporary file was using.
  URL.revokeObjectURL(url)
}

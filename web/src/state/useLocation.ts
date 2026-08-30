/**
 * Location capture for new logs — the browser's replacement for the iOS
 * LocationManager.
 *
 * HOW IT DIFFERS FROM THE PHONE, and why:
 *
 * The iOS app asked for location the moment it launched and then tracked
 * continuously. A website doing that is rude — a permission prompt before the
 * user has done anything is the classic web annoyance, and it would fire even
 * for someone who only wants to look at their charts.
 *
 * So here it is a switch the user turns on. Once on, it works exactly like the
 * phone: a watcher keeps the most recent position ready, so tapping a tile
 * stamps the log instantly rather than waiting for a fix.
 *
 * Logging NEVER waits for or depends on location. If the position isn't known,
 * the log is saved without one — the same as the iOS behaviour when no fix was
 * available.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { LocationData } from '../domain/types'

/** Remembers the choice between visits, so it isn't re-asked every time. */
const PREFERENCE_KEY = 'eventstracker.location.enabled'

export type LocationStatus =
  | 'off' // The user hasn't turned it on.
  | 'unsupported' // The browser has no geolocation at all.
  | 'requesting' // Waiting for permission or a first fix.
  | 'on' // Working; a position is known or coming.
  | 'denied' // Permission refused, or the position can't be obtained.

export interface LocationState {
  status: LocationStatus
  /** The most recent known position, or null. */
  lastKnown: LocationData | null
  /** Explanation to show when something went wrong. */
  message: string | null
  enable: () => void
  disable: () => void
}

function readStoredPreference(): boolean {
  try {
    return window.localStorage.getItem(PREFERENCE_KEY) === 'true'
  } catch {
    // Blocked storage isn't a reason to fail — just don't remember the choice.
    return false
  }
}

function writeStoredPreference(enabled: boolean): void {
  try {
    window.localStorage.setItem(PREFERENCE_KEY, String(enabled))
  } catch {
    // Not being able to remember the preference is harmless.
  }
}

export function useLocation(): LocationState {
  const [status, setStatus] = useState<LocationStatus>('off')
  const [lastKnown, setLastKnown] = useState<LocationData | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  // The id of the running position watcher, so it can be stopped later.
  const watchId = useRef<number | null>(null)

  const stopWatching = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchId.current)
      watchId.current = null
    }
  }, [])

  const startWatching = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported')
      setMessage('location.unsupported')
      return
    }

    if (watchId.current !== null) return // Already running.

    setStatus('requesting')
    setMessage(null)

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setLastKnown({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setStatus('on')
        setMessage(null)
      },
      (error) => {
        stopWatching()
        setStatus('denied')
        // Translation keys, resolved where the language is known.
        setMessage(
          error.code === error.PERMISSION_DENIED ? 'location.denied' : 'location.unavailable',
        )
        writeStoredPreference(false)
      },
      {
        enableHighAccuracy: true,
        // Accept a position up to a minute old rather than forcing a fresh fix
        // for every log — much easier on the battery, and a minute-old position
        // is plenty accurate for "where was I when I did this".
        maximumAge: 60_000,
        timeout: 15_000,
      },
    )
  }, [stopWatching])

  // Resume on load if it was switched on previously.
  useEffect(() => {
    if (readStoredPreference()) {
      startWatching()
    }
    return stopWatching
  }, [startWatching, stopWatching])

  const enable = useCallback(() => {
    writeStoredPreference(true)
    startWatching()
  }, [startWatching])

  const disable = useCallback(() => {
    writeStoredPreference(false)
    stopWatching()
    setStatus('off')
    setLastKnown(null)
    setMessage(null)
  }, [stopWatching])

  return { status, lastKnown, message, enable, disable }
}

/**
 * One square tile in the main grid, matching the iOS ThingGridItem:
 * the thing's colour, its name, a large log count, and when it was last logged.
 *
 * Tapping the tile logs an event. In edit mode, tapping is disabled and
 * edit/delete buttons appear instead — the same rule the iOS app uses.
 */

import { useState } from 'react'
import type { Thing } from '../domain/types'
import { colorToCss, readableTextColor } from '../domain/color'
import { formatLastLogDate } from '../domain/dates'
import { lastLogDate } from '../domain/things'
import { useI18n } from '../i18n'

interface ThingTileProps {
  thing: Thing
  isEditing: boolean
  onLog: () => void
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export function ThingTile({ thing, isEditing, onLog, onOpen, onEdit, onDelete }: ThingTileProps) {
  const { t } = useI18n()

  // Drives the brief shrink animation that confirms a tap registered.
  const [isPressed, setIsPressed] = useState(false)

  const lastDate = lastLogDate(thing)
  const textColor = readableTextColor(thing.color)

  function handleClick() {
    if (isEditing) return
    onLog()
    setIsPressed(true)
    window.setTimeout(() => setIsPressed(false), 180)
  }

  return (
    <div className="tile-wrapper">
      <button
        type="button"
        className={`tile ${isPressed ? 'tile--pressed' : ''}`}
        style={{ backgroundColor: colorToCss(thing.color), color: textColor }}
        onClick={handleClick}
        disabled={isEditing}
        // Screen readers announce this instead of just reading the numbers.
        aria-label={t('tile.logAria', { name: thing.name, count: thing.logs.length })}
      >
        <span className="tile__content">
          <span className="tile__name">{thing.name}</span>
          <span className="tile__count">{thing.logs.length === 0 ? '—' : thing.logs.length}</span>
          <span className="tile__last">
            {lastDate
              ? t('tile.last', { time: formatLastLogDate(lastDate) })
              : t('tile.never')}
          </span>
        </span>
      </button>

      {!isEditing && (
        <button
          type="button"
          className="tile__open"
          onClick={onOpen}
          aria-label={t('tile.openAria', { name: thing.name })}
          title={t('tile.history')}
        >
          ›
        </button>
      )}

      {isEditing && (
        <div className="tile__edit-actions">
          <button
            type="button"
            className="icon-button icon-button--edit"
            onClick={onEdit}
            aria-label={t('tile.editAria', { name: thing.name })}
            title={t('action.edit')}
          >
            ✎
          </button>
          <button
            type="button"
            className="icon-button icon-button--delete"
            onClick={onDelete}
            aria-label={t('tile.deleteAria', { name: thing.name })}
            title={t('action.delete')}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * The add / edit form, covering both the iOS AddThingView and EditThingView.
 * One component handles both because the fields are identical — only the title
 * and the starting values differ.
 */

import { useEffect, useState } from 'react'
import type { Category, ColorData, Thing } from '../domain/types'
import { colorToHex, hexToColor } from '../domain/color'
import { useI18n } from '../i18n'

interface ThingDialogProps {
  /** The thing being edited, or null when creating a new one. */
  thing: Thing | null
  categories: Category[]
  /** Where a new thing goes: the default category. */
  defaultCategoryId: string
  onSave: (name: string, color: ColorData, categoryId: string) => void
  onCancel: () => void
}

export function ThingDialog({
  thing,
  categories,
  defaultCategoryId,
  onSave,
  onCancel,
}: ThingDialogProps) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  // Red is the iOS app's default colour for a new thing.
  const [hex, setHex] = useState('#ff0000')
  const [categoryId, setCategoryId] = useState(defaultCategoryId)

  // Fill the form when an existing thing is opened for editing.
  useEffect(() => {
    if (thing) {
      setName(thing.name)
      setHex(colorToHex(thing.color))
      setCategoryId(thing.categoryId ?? defaultCategoryId)
    } else {
      setName('')
      setHex('#ff0000')
      setCategoryId(defaultCategoryId)
    }
  }, [thing, defaultCategoryId])

  const trimmedName = name.trim()
  const canSave = trimmedName.length > 0

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault() // Stop the browser reloading the page on submit.
    if (!canSave) return
    onSave(trimmedName, hexToColor(hex), categoryId)
  }

  return (
    // The dark backdrop. Clicking it cancels, like tapping outside an iOS sheet.
    <div className="overlay" onClick={onCancel} role="presentation">
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={thing ? t('thing.edit') : t('thing.new')}
        // Stop clicks inside the dialog from reaching the backdrop and closing it.
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="dialog__title">{thing ? t('thing.edit') : t('thing.new')}</h2>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">{t('thing.name')}</span>
            <input
              className="field__input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('thing.namePlaceholder')}
              autoFocus
              maxLength={80}
            />
          </label>

          <label className="field">
            <span className="field__label">{t('thing.color')}</span>
            <input
              type="color"
              className="field__color"
              value={hex}
              onChange={(event) => setHex(event.target.value)}
            />
          </label>

          {/* Only worth showing once there is more than one category to choose
              between — a dropdown with a single option is just noise. */}
          {categories.length > 1 && (
            <label className="field">
              <span className="field__label">{t('category.label')}</span>
              <select
                className="field__input"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="dialog__buttons">
            <button type="button" className="button" onClick={onCancel}>
              {t('action.cancel')}
            </button>
            <button type="submit" className="button button--primary" disabled={!canSave}>
              {t('action.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

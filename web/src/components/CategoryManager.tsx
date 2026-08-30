/**
 * Managing categories: add, rename, reorder, choose the default, delete.
 *
 * Deleting is the only dangerous thing here, so it gets its own confirmation
 * that states the count and offers the safe option first: move the things to
 * the default category, or delete them along with all their history.
 *
 * The default category has no delete button at all. That is not a restriction
 * for its own sake — it is what guarantees a deleted category's things always
 * have somewhere to go.
 */

import { useState } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Category, Thing } from '../domain/types'
import type { DeleteCategoryMode } from '../domain/categories'
import { thingsInCategory } from '../domain/categories'
import { useI18n } from '../i18n'

interface CategoryManagerProps {
  categories: Category[]
  things: Thing[]
  defaultCategoryId: string
  onAdd: (name: string, makeDefault: boolean) => void
  onRename: (categoryId: string, name: string) => void
  onSetDefault: (categoryId: string) => void
  onMove: (movedId: string, targetId: string) => void
  onDelete: (categoryId: string, mode: DeleteCategoryMode) => void
  onClose: () => void
}

/** One draggable row in the list. */
function CategoryRow({
  category,
  isDefault,
  count,
  onRename,
  onSetDefault,
  onRequestDelete,
}: {
  category: Category
  isDefault: boolean
  count: number
  onRename: (name: string) => void
  onSetDefault: () => void
  onRequestDelete: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState(category.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  })

  return (
    <li
      ref={setNodeRef}
      className={`cat-row ${isDragging ? 'cat-row--dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      {/* Only the grip starts a drag — the rest of the row holds a text field
          and buttons, which need ordinary taps to keep working. */}
      <span
        className="cat-row__grip"
        aria-label={t('category.reorder')}
        title={t('category.reorder')}
        {...attributes}
        {...listeners}
      >
        ⠿
      </span>

      <input
        className="cat-row__name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        // Saved when the field loses focus or Enter is pressed, rather than on
        // every keystroke, which would rewrite storage letter by letter.
        onBlur={() => onRename(name)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
        }}
        aria-label={t('category.name')}
      />

      <span className="cat-row__count">{count}</span>

      {isDefault ? (
        <span className="cat-row__badge">{t('category.default')}</span>
      ) : (
        <button type="button" className="button button--small" onClick={onSetDefault}>
          {t('category.makeDefault')}
        </button>
      )}

      {!isDefault && (
        <button
          type="button"
          className="button button--small button--danger"
          onClick={onRequestDelete}
        >
          {t('action.delete')}
        </button>
      )}
    </li>
  )
}

export function CategoryManager(props: CategoryManagerProps) {
  const { categories, things, defaultCategoryId, onAdd, onRename, onSetDefault, onMove, onDelete, onClose } =
    props

  const { t, tc } = useI18n()
  const [newName, setNewName] = useState('')
  const [makeDefault, setMakeDefault] = useState(false)
  const [deleting, setDeleting] = useState<Category | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onMove(String(active.id), String(over.id))
  }

  const deletingCount = deleting ? thingsInCategory(things, deleting.id).length : 0

  return (
    <div className="overlay overlay--full" onClick={onClose} role="presentation">
      <div
        className="detail"
        role="dialog"
        aria-modal="true"
        aria-label={t('category.manage')}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="detail__header">
          <div className="detail__titlerow">
            <h2 className="detail__title">{t('category.manage')}</h2>
          </div>
          <div className="detail__actions">
            <button type="button" className="button" onClick={onClose}>
              {t('action.done')}
            </button>
          </div>
        </header>

        <p className="panel-section__text">{t('category.explain')}</p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={categories.map((category) => category.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="cat-list">
              {categories.map((category) => (
                <CategoryRow
                  key={category.id}
                  category={category}
                  isDefault={category.id === defaultCategoryId}
                  count={thingsInCategory(things, category.id).length}
                  onRename={(name) => onRename(category.id, name)}
                  onSetDefault={() => onSetDefault(category.id)}
                  onRequestDelete={() => setDeleting(category)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <section className="panel-section">
          <h3 className="panel-section__title">{t('category.add')}</h3>

          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (newName.trim() === '') return
              onAdd(newName, makeDefault)
              setNewName('')
              setMakeDefault(false)
            }}
          >
            <div className="controls__row controls__row--wrap">
              <input
                className="field__input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t('category.namePlaceholder')}
                aria-label={t('category.name')}
              />
              <label className="cat-row__checkbox">
                <input
                  type="checkbox"
                  checked={makeDefault}
                  onChange={(event) => setMakeDefault(event.target.checked)}
                />
                {t('category.makeDefault')}
              </label>
              <button type="submit" className="button button--primary" disabled={newName.trim() === ''}>
                {t('category.add')}
              </button>
            </div>
          </form>
        </section>
      </div>

      {deleting && (
        <div className="overlay" onClick={() => setDeleting(null)} role="presentation">
          <div
            className="dialog dialog--narrow"
            role="alertdialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="dialog__title">{t('category.deleteTitle', { name: deleting.name })}</h2>

            <p className="dialog__message">
              {deletingCount === 0
                ? t('category.deleteEmpty')
                : tc('category.deleteQuestion', deletingCount)}
            </p>

            <div className="dialog__buttons dialog__buttons--stack">
              <button type="button" className="button" onClick={() => setDeleting(null)}>
                {t('action.cancel')}
              </button>

              {/* The safe option first, and worded as what happens rather than
                  as a yes/no — "Delete" alone would not say what happens to
                  everything inside. */}
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  onDelete(deleting.id, 'moveThings')
                  setDeleting(null)
                }}
              >
                {deletingCount === 0 ? t('action.delete') : t('category.deleteMoveThings')}
              </button>

              {deletingCount > 0 && (
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => {
                    onDelete(deleting.id, 'deleteThings')
                    setDeleting(null)
                  }}
                >
                  {tc('category.deleteAlsoThings', deletingCount)}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

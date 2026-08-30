/**
 * One category on the home screen: a heading you can fold, and the tiles inside.
 *
 * The default category is different in two ways — it always sits at the top and
 * it cannot be folded away. It is the one you reach for constantly, so making
 * it collapsible would only ever be a way to hide the thing you came for.
 *
 * Dragging to reorder happens INSIDE a section. Each section runs its own drag
 * context, which is what stops a tile being dragged from one category into
 * another by accident: a drop outside its own section simply does nothing.
 */

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
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import type { Category, Thing } from '../domain/types'
import { ThingTile } from './ThingTile'
import { SortableThingTile } from './SortableThingTile'
import { useI18n } from '../i18n'

interface CategorySectionProps {
  category: Category
  isDefault: boolean
  things: Thing[]
  isExpanded: boolean
  onToggleExpanded: () => void
  isEditing: boolean
  canReorder: boolean
  onReorder: (movedThingId: string, targetThingId: string) => void
  onLog: (thing: Thing) => void
  onOpen: (thing: Thing) => void
  onEditThing: (thing: Thing) => void
  onDeleteThing: (thing: Thing) => void
  /** The default category carries the "add a thing" tile, since that is where new things land. */
  onAddThing?: () => void
}

export function CategorySection(props: CategorySectionProps) {
  const {
    category,
    isDefault,
    things,
    isExpanded,
    onToggleExpanded,
    isEditing,
    canReorder,
    onReorder,
    onLog,
    onOpen,
    onEditThing,
    onDeleteThing,
    onAddThing,
  } = props

  const { t } = useI18n()

  // Same activation rules as before: a small movement for a mouse, a short
  // press for a finger so that ordinary scrolling still works.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    onReorder(String(active.id), String(over.id))
  }

  const tileHandlers = (thing: Thing) => ({
    onLog: () => onLog(thing),
    onOpen: () => onOpen(thing),
    onEdit: () => onEditThing(thing),
    onDelete: () => onDeleteThing(thing),
  })

  const grid = (
    <div className="grid">
      {canReorder ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={things.map((thing) => thing.id)} strategy={rectSortingStrategy}>
            {things.map((thing) => (
              <SortableThingTile key={thing.id} thing={thing} {...tileHandlers(thing)} />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        things.map((thing) => (
          <ThingTile key={thing.id} thing={thing} isEditing={isEditing} {...tileHandlers(thing)} />
        ))
      )}

      {onAddThing && (
        <button
          type="button"
          className="tile tile--add"
          onClick={onAddThing}
          aria-label={t('tile.addAria')}
        >
          +
        </button>
      )}
    </div>
  )

  return (
    <section className="category">
      {isDefault ? (
        // No fold control: this one is always open, so a chevron would be a
        // button that does nothing.
        <h2 className="category__heading category__heading--fixed">
          {category.name}
          <span className="category__count">{things.length}</span>
        </h2>
      ) : (
        <button
          type="button"
          className="category__heading"
          onClick={onToggleExpanded}
          aria-expanded={isExpanded}
        >
          <span className={`category__chevron ${isExpanded ? 'category__chevron--open' : ''}`}>
            ›
          </span>
          {category.name}
          <span className="category__count">{things.length}</span>
        </button>
      )}

      {(isDefault || isExpanded) && (
        <>
          {things.length === 0 && !onAddThing ? (
            <p className="category__empty">{t('category.empty')}</p>
          ) : (
            grid
          )}
        </>
      )}
    </section>
  )
}

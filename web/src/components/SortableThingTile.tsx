/**
 * A tile that can be dragged to a new position.
 *
 * This wraps the ordinary ThingTile rather than replacing it, so the tile
 * itself knows nothing about dragging and behaves identically everywhere else.
 *
 * Dragging is only ever switched on in Manual sort with the Reorder button
 * pressed — the same rule the iOS app used. In any other sort the order is
 * computed from the data, so dragging would be meaningless: the tile would
 * spring back the moment it was let go.
 */

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Thing } from '../domain/types'
import { ThingTile } from './ThingTile'

interface SortableThingTileProps {
  thing: Thing
  onLog: () => void
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}

export function SortableThingTile(props: SortableThingTileProps) {
  const { thing, ...handlers } = props

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: thing.id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`sortable ${isDragging ? 'sortable--dragging' : ''}`}
      style={{
        // The library reports where the tile should sit while a drag is in
        // progress; this turns that into an actual on-screen movement.
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      // Spreading these makes the whole tile the drag handle, which is far
      // easier to hit with a thumb than a small grip icon would be.
      {...attributes}
      {...listeners}
    >
      {/* isEditing is always true here: reordering only happens in edit mode,
          where tapping a tile no longer logs an event. That is what frees the
          tile up to be dragged instead. */}
      <ThingTile thing={thing} isEditing {...handlers} />
    </div>
  )
}

/**
 * Tests for categories.
 *
 * These matter more than most: these functions can move or delete a person's
 * whole tracked history, and the migration runs against data saved before
 * categories existed. Every test that deletes checks what survived.
 */

import { describe, expect, it } from 'vitest'
import type { AppData, Thing } from './types'
import {
  FIRST_CATEGORY_NAME,
  addCategory,
  deleteCategory,
  ensureCategories,
  moveCategory,
  orderedCategories,
  renameCategory,
  setDefaultCategory,
  setThingCategory,
  setThingsCategory,
  thingsInCategory,
} from './categories'

function thing(id: string, categoryId?: string): Thing {
  return {
    id,
    name: id,
    color: { red: 1, green: 0, blue: 0 },
    logs: [
      { id: `${id}-log`, date: new Date(2026, 2, 1).toISOString(), location: null, note: null },
    ],
    creationDate: new Date(2026, 0, 1).toISOString(),
    ...(categoryId ? { categoryId } : {}),
  }
}

/** A small app with two categories: "general" (default) and "garden". */
function sample(): AppData {
  return {
    categories: [
      { id: 'general', name: 'General' },
      { id: 'garden', name: 'Garden' },
    ],
    things: [thing('a', 'general'), thing('b', 'garden'), thing('c', 'garden')],
    defaultCategoryId: 'general',
  }
}

describe('ensureCategories — the migration', () => {
  it('gives data saved before categories existed a single General category', () => {
    const data = ensureCategories({ things: [thing('a'), thing('b')] })

    expect(data.categories).toHaveLength(1)
    expect(data.categories[0].name).toBe(FIRST_CATEGORY_NAME)
    expect(data.defaultCategoryId).toBe(data.categories[0].id)
  })

  it('puts every existing thing into that category — none go missing', () => {
    const data = ensureCategories({ things: [thing('a'), thing('b'), thing('c')] })

    expect(data.things).toHaveLength(3)
    expect(thingsInCategory(data.things, data.defaultCategoryId)).toHaveLength(3)
  })

  it('leaves already-categorised data alone', () => {
    const data = ensureCategories(sample())
    expect(data.categories).toHaveLength(2)
    expect(data.defaultCategoryId).toBe('general')
    expect(thingsInCategory(data.things, 'garden')).toHaveLength(2)
  })

  it('rescues a thing pointing at a category that no longer exists', () => {
    const broken = { ...sample(), things: [thing('a', 'deleted-long-ago')] }
    const data = ensureCategories(broken)
    expect(data.things[0].categoryId).toBe('general')
  })

  it('repairs a default that points at nothing', () => {
    const broken = { ...sample(), defaultCategoryId: 'nonsense' }
    expect(ensureCategories(broken).defaultCategoryId).toBe('general')
  })

  it('copes with no things at all', () => {
    const data = ensureCategories({ things: [] })
    expect(data.categories).toHaveLength(1)
    expect(data.things).toEqual([])
  })
})

describe('orderedCategories', () => {
  it('always puts the default first', () => {
    const data = { ...sample(), defaultCategoryId: 'garden' }
    expect(orderedCategories(data).map((c) => c.id)).toEqual(['garden', 'general'])
  })
})

describe('addCategory', () => {
  it('adds one without disturbing the default', () => {
    const data = addCategory(sample(), 'Health')
    expect(data.categories).toHaveLength(3)
    expect(data.defaultCategoryId).toBe('general')
  })

  it('can make the new one the default', () => {
    const data = addCategory(sample(), 'Health', true)
    expect(data.categories.find((c) => c.id === data.defaultCategoryId)?.name).toBe('Health')
  })

  it('ignores a blank name', () => {
    expect(addCategory(sample(), '   ').categories).toHaveLength(2)
  })
})

describe('renameCategory', () => {
  it('renames', () => {
    const data = renameCategory(sample(), 'garden', 'Yard')
    expect(data.categories.find((c) => c.id === 'garden')?.name).toBe('Yard')
  })

  it('refuses a blank name rather than wiping the old one', () => {
    const data = renameCategory(sample(), 'garden', '  ')
    expect(data.categories.find((c) => c.id === 'garden')?.name).toBe('Garden')
  })
})

describe('setDefaultCategory', () => {
  it('moves the default', () => {
    expect(setDefaultCategory(sample(), 'garden').defaultCategoryId).toBe('garden')
  })

  it('ignores a category that does not exist', () => {
    expect(setDefaultCategory(sample(), 'nope').defaultCategoryId).toBe('general')
  })
})

describe('moveCategory', () => {
  it('reorders', () => {
    const data = addCategory(sample(), 'Health')
    const moved = moveCategory(data, data.categories[2].id, data.categories[0].id)
    expect(moved.categories[0].name).toBe('Health')
  })

  it('never loses a category', () => {
    const data = sample()
    const moved = moveCategory(data, 'garden', 'general')
    expect(moved.categories).toHaveLength(2)
  })
})

describe('deleteCategory', () => {
  it('REFUSES to delete the default', () => {
    // The whole safety model rests on this: the default always exists, so a
    // deletion always has somewhere to move things to.
    const data = deleteCategory(sample(), 'general', 'moveThings')
    expect(data.categories).toHaveLength(2)
    expect(data.things).toHaveLength(3)
  })

  it('moves the things to the default when asked', () => {
    const data = deleteCategory(sample(), 'garden', 'moveThings')

    expect(data.categories).toHaveLength(1)
    // Nothing lost: all three things survive, now in the default.
    expect(data.things).toHaveLength(3)
    expect(thingsInCategory(data.things, 'general')).toHaveLength(3)
  })

  it('keeps every log when moving things', () => {
    const data = deleteCategory(sample(), 'garden', 'moveThings')
    expect(data.things.every((t) => t.logs.length === 1)).toBe(true)
  })

  it('deletes the things when asked, and only those things', () => {
    const data = deleteCategory(sample(), 'garden', 'deleteThings')

    expect(data.things).toHaveLength(1)
    expect(data.things[0].id).toBe('a')
  })

  it('ignores a category that does not exist', () => {
    expect(deleteCategory(sample(), 'nope', 'deleteThings').things).toHaveLength(3)
  })
})

describe('setThingCategory', () => {
  it('moves one thing', () => {
    const data = setThingCategory(sample(), 'a', 'garden')
    expect(thingsInCategory(data.things, 'garden')).toHaveLength(3)
  })

  it('ignores a category that does not exist, rather than orphaning the thing', () => {
    const data = setThingCategory(sample(), 'a', 'nope')
    expect(data.things.find((t) => t.id === 'a')?.categoryId).toBe('general')
  })
})

describe('setThingsCategory — moving several at once', () => {
  it('moves everything ticked', () => {
    const data = setThingsCategory(sample(), new Set(['b', 'c']), 'general')
    expect(thingsInCategory(data.things, 'general')).toHaveLength(3)
    expect(thingsInCategory(data.things, 'garden')).toHaveLength(0)
  })

  it('leaves the ones not ticked where they are', () => {
    const data = setThingsCategory(sample(), new Set(['b']), 'general')
    expect(data.things.find((t) => t.id === 'c')?.categoryId).toBe('garden')
  })

  it('never loses a thing or its logs', () => {
    const data = setThingsCategory(sample(), new Set(['a', 'b', 'c']), 'garden')
    expect(data.things).toHaveLength(3)
    expect(data.things.every((t) => t.logs.length === 1)).toBe(true)
  })

  it('ignores a destination that does not exist', () => {
    const data = setThingsCategory(sample(), new Set(['a']), 'nope')
    expect(data.things.find((t) => t.id === 'a')?.categoryId).toBe('general')
  })

  it('does nothing when nothing is ticked', () => {
    const before = sample()
    expect(setThingsCategory(before, new Set(), 'garden')).toBe(before)
  })
})

/**
 * Categories — grouping things on the home screen.
 *
 * Everything here is a pure calculation: data in, new data out, nothing
 * touching the screen or storage. That keeps the rules testable, which matters
 * more here than anywhere else in the app, because these functions can move or
 * delete a person's tracked history.
 *
 * THE ONE RULE EVERYTHING RESTS ON: the default category cannot be deleted.
 * Because it always exists, deleting any other category always has somewhere
 * safe to move its things.
 */

import type { AppData, Category, Thing } from './types'
import { newId } from './things'

/**
 * The name given to the category created when categories first appear.
 *
 * Stored as ordinary text rather than a translated string, because it becomes
 * a name the user owns and can rename — translating it later would silently
 * rewrite something they might have deliberately kept.
 */
export const FIRST_CATEGORY_NAME = 'General'

/** Build a new category. */
export function createCategory(name: string): Category {
  return { id: newId(), name: name.trim() }
}

/**
 * Make sense of whatever was loaded, and guarantee the app's rules hold.
 *
 * This is the migration for data saved before categories existed, and the
 * repair for data that has drifted — a thing pointing at a deleted category,
 * say. It is run on every load, so any of these problems fixes itself rather
 * than becoming a crash.
 */
export function ensureCategories(input: {
  things: Thing[]
  categories?: Category[] | null
  defaultCategoryId?: string | null
}): AppData {
  const things = input.things ?? []
  let categories = (input.categories ?? []).filter(
    (category) => category && typeof category.id === 'string' && typeof category.name === 'string',
  )

  // Nothing yet: everything joins one category, which becomes the default.
  // This is what happens to data saved before categories existed.
  if (categories.length === 0) {
    categories = [createCategory(FIRST_CATEGORY_NAME)]
  }

  const categoryIds = new Set(categories.map((category) => category.id))

  // The default must point at a category that actually exists.
  const defaultCategoryId =
    input.defaultCategoryId && categoryIds.has(input.defaultCategoryId)
      ? input.defaultCategoryId
      : categories[0].id

  // Anything homeless joins the default rather than vanishing from the screen.
  const repairedThings = things.map((thing) =>
    thing.categoryId && categoryIds.has(thing.categoryId)
      ? thing
      : { ...thing, categoryId: defaultCategoryId },
  )

  return { categories, things: repairedThings, defaultCategoryId }
}

/**
 * The order categories appear in: the default first, then the rest as arranged.
 * The default is pinned rather than sorted, so it cannot be dragged away from
 * the top.
 */
export function orderedCategories(data: AppData): Category[] {
  const defaultCategory = data.categories.find((c) => c.id === data.defaultCategoryId)
  const rest = data.categories.filter((c) => c.id !== data.defaultCategoryId)
  return defaultCategory ? [defaultCategory, ...rest] : rest
}

/** The things belonging to one category, in their stored order. */
export function thingsInCategory(things: Thing[], categoryId: string): Thing[] {
  return things.filter((thing) => thing.categoryId === categoryId)
}

/** Add a category, optionally making it the new default. */
export function addCategory(data: AppData, name: string, makeDefault = false): AppData {
  const trimmed = name.trim()
  if (trimmed === '') return data

  const category = createCategory(trimmed)
  return {
    ...data,
    categories: [...data.categories, category],
    defaultCategoryId: makeDefault ? category.id : data.defaultCategoryId,
  }
}

/** Change a category's name. Empty names are ignored rather than saved. */
export function renameCategory(data: AppData, categoryId: string, name: string): AppData {
  const trimmed = name.trim()
  if (trimmed === '') return data

  return {
    ...data,
    categories: data.categories.map((category) =>
      category.id === categoryId ? { ...category, name: trimmed } : category,
    ),
  }
}

/** Make a different category the default. New things will join it from now on. */
export function setDefaultCategory(data: AppData, categoryId: string): AppData {
  if (!data.categories.some((category) => category.id === categoryId)) return data
  return { ...data, defaultCategoryId: categoryId }
}

/** Move a category to where another one currently sits. */
export function moveCategory(data: AppData, movedId: string, targetId: string): AppData {
  const fromIndex = data.categories.findIndex((category) => category.id === movedId)
  const toIndex = data.categories.findIndex((category) => category.id === targetId)
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return data

  const categories = [...data.categories]
  const [moved] = categories.splice(fromIndex, 1)
  categories.splice(toIndex, 0, moved)
  return { ...data, categories }
}

/** What to do with the things inside a category being deleted. */
export type DeleteCategoryMode = 'moveThings' | 'deleteThings'

/**
 * Delete a category.
 *
 * Refuses to delete the default, which is the rule the rest of this file
 * depends on. The caller decides what happens to the things inside: move them
 * to the default, or delete them along with their whole history.
 */
export function deleteCategory(
  data: AppData,
  categoryId: string,
  mode: DeleteCategoryMode,
): AppData {
  if (categoryId === data.defaultCategoryId) return data
  if (!data.categories.some((category) => category.id === categoryId)) return data

  const categories = data.categories.filter((category) => category.id !== categoryId)

  const things =
    mode === 'deleteThings'
      ? data.things.filter((thing) => thing.categoryId !== categoryId)
      : data.things.map((thing) =>
          thing.categoryId === categoryId
            ? { ...thing, categoryId: data.defaultCategoryId }
            : thing,
        )

  return { ...data, categories, things }
}

/** Put one thing into a different category. */
export function setThingCategory(data: AppData, thingId: string, categoryId: string): AppData {
  if (!data.categories.some((category) => category.id === categoryId)) return data
  return {
    ...data,
    things: data.things.map((thing) =>
      thing.id === thingId ? { ...thing, categoryId } : thing,
    ),
  }
}

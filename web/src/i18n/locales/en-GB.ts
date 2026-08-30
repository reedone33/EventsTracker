/**
 * British English.
 *
 * Only the words that actually differ from the base English file are listed;
 * everything else falls back to it. Repeating all 120 strings just to change
 * "color" would create 120 things to keep in sync instead of five.
 */

import type { Translations } from './en'

export const enGB: Partial<Translations> = {
  'thing.color': 'Colour',
  'data.backupText':
    'A complete copy, colours included, for restoring this app exactly as it is. Do this before importing. For a file to open in Excel, use the CSV export below instead.',
  'data.importText2':
    'A CSV carries every log with its time, location and note, but not the colours you chose — those get assigned automatically and can be changed afterwards.',
  'warn.colorsAssigned':
    'Colours were assigned automatically — the CSV does not record them. Change any of them from the Things tab.',
  'warn.tooManyColors':
    'There are {count} things but only {limit} guaranteed-distinct colours, so some will look similar. Worth adjusting the ones you chart together.',
}

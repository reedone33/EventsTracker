/**
 * Colours assigned automatically to things imported from a CSV.
 *
 * The iPhone's CSV export carries names, times, locations and notes — but not
 * the colour you picked for each thing, because colour isn't one of its
 * columns. So imported things need colours assigning, and these are they.
 *
 * WHY THESE EIGHT: a single colour is stored per thing and shown in BOTH light
 * and dark mode, so the set has to work on a white background and a black one.
 * These eight were checked with a palette validator and pass every test in both
 * modes: distinguishable to people with colour blindness, distinguishable to
 * everyone else, bright enough not to vanish against either background.
 *
 * Picking pleasant-looking colours by eye reliably produces pairs that look
 * identical to a red-green colourblind reader, which is roughly one man in
 * twelve. That is why this list is fixed rather than improvised.
 *
 * You can change any thing's colour afterwards — these are only a starting point.
 */

import type { ColorData } from './types'

/** The validated eight, in the order they get handed out. */
export const CATEGORICAL_HEXES = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
] as const

/** Convert a hex code to the app's stored colour format (0.0–1.0 per channel). */
function hexToColorData(hex: string): ColorData {
  const clean = hex.replace('#', '')
  return {
    red: parseInt(clean.slice(0, 2), 16) / 255,
    green: parseInt(clean.slice(2, 4), 16) / 255,
    blue: parseInt(clean.slice(4, 6), 16) / 255,
  }
}

/** How many things can be given a guaranteed-distinguishable colour. */
export const DISTINCT_COLOR_COUNT = CATEGORICAL_HEXES.length

/**
 * Pick the colour for the thing at this position in the import.
 *
 * Beyond the eighth thing there are no more guaranteed-distinct colours, so
 * later ones get evenly spaced hues instead. Those are NOT guaranteed to be
 * tellable apart — the importer says so in its summary rather than quietly
 * handing out colours that look the same.
 */
export function colorForIndex(index: number): ColorData {
  if (index < CATEGORICAL_HEXES.length) {
    return hexToColorData(CATEGORICAL_HEXES[index])
  }

  // Spread the extras around the colour wheel at a fixed lightness and
  // saturation, so at least they are not all near-identical.
  const hue = ((index - CATEGORICAL_HEXES.length) * 47) % 360
  return hslToColorData(hue, 0.62, 0.52)
}

/** Standard hue/saturation/lightness to red/green/blue conversion. */
function hslToColorData(hue: number, saturation: number, lightness: number): ColorData {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1))
  const offset = lightness - chroma / 2

  let rgb: [number, number, number]
  if (hue < 60) rgb = [chroma, secondary, 0]
  else if (hue < 120) rgb = [secondary, chroma, 0]
  else if (hue < 180) rgb = [0, chroma, secondary]
  else if (hue < 240) rgb = [0, secondary, chroma]
  else if (hue < 300) rgb = [secondary, 0, chroma]
  else rgb = [chroma, 0, secondary]

  return { red: rgb[0] + offset, green: rgb[1] + offset, blue: rgb[2] + offset }
}

/**
 * Converting between the app's stored colour format and the formats the
 * browser understands.
 *
 * Stored format (from iOS): three numbers from 0.0 to 1.0.
 * Browser CSS format:       "rgb(255, 0, 0)".
 * HTML colour picker format: "#ff0000".
 */

import type { ColorData } from './types'

/** Force a number into the 0–1 range, so bad data can't produce an invalid colour. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/** 0.0–1.0 becomes 0–255, which is what CSS and hex codes use. */
function to255(value: number): number {
  return Math.round(clamp01(value) * 255)
}

/** Turn stored colour data into a CSS colour string for styling elements. */
export function colorToCss(color: ColorData): string {
  return `rgb(${to255(color.red)}, ${to255(color.green)}, ${to255(color.blue)})`
}

/** Turn stored colour data into a hex code, which <input type="color"> requires. */
export function colorToHex(color: ColorData): string {
  const hex = (value: number) => to255(value).toString(16).padStart(2, '0')
  return `#${hex(color.red)}${hex(color.green)}${hex(color.blue)}`
}

/** Turn a hex code from the colour picker back into stored colour data. */
export function hexToColor(hex: string): ColorData {
  // Accept "#ff0000" or "ff0000".
  const clean = hex.replace('#', '').trim()
  if (clean.length !== 6) {
    // Fall back to the iOS app's default new-thing colour (red) on bad input.
    return { red: 1, green: 0, blue: 0 }
  }
  return {
    red: parseInt(clean.slice(0, 2), 16) / 255,
    green: parseInt(clean.slice(2, 4), 16) / 255,
    blue: parseInt(clean.slice(4, 6), 16) / 255,
  }
}

/**
 * Decide whether text sitting on this colour should be black or white.
 *
 * Uses the standard relative-luminance formula: the human eye perceives green
 * as much brighter than blue, so the channels are weighted rather than averaged.
 * Without this, a bright yellow tile would get unreadable white text.
 */
export function readableTextColor(color: ColorData): string {
  const luminance =
    0.299 * clamp01(color.red) +
    0.587 * clamp01(color.green) +
    0.114 * clamp01(color.blue)
  return luminance > 0.6 ? '#111111' : '#ffffff'
}

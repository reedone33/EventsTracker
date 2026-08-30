/**
 * The toolbar icons, drawn as inline SVG.
 *
 * Drawn by hand rather than pulled from an icon library for two reasons: an
 * icon set would be a whole dependency for six small shapes, and inline SVG
 * inherits the surrounding text colour automatically, so the icons follow
 * light and dark mode with no extra work.
 *
 * Each is 20x20 and uses `currentColor`, which means "whatever colour the text
 * around me is".
 */

interface IconProps {
  /** Width and height in pixels. */
  size?: number
}

/** Shared setup so every icon looks like it came from the same set. */
function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    // The icon is decoration; the button around it carries the real label.
    'aria-hidden': true,
    focusable: false,
  }
}

/** Magnifying glass — search. */
export function SearchIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

/** Two arrows pointing opposite ways — sort order. */
export function SortIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M7 4v16M7 4 4 7M7 4l3 3" />
      <path d="M17 20V4M17 20l3-3M17 20l-3-3" />
    </svg>
  )
}

/**
 * A circle filled on one side — appearance.
 * The same idea as the iOS app's half-filled circle symbol.
 */
export function AppearanceIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      {/* The filled half, drawn as a solid semicircle. */}
      <path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Map pin — location tagging. */
export function LocationIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

/** Three stacked lines — the menu. */
export function MenuIcon({ size = 20 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

/** Tick — marks the chosen option inside a menu. */
export function CheckIcon({ size = 18 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  )
}

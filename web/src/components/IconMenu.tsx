/**
 * An icon that opens a small menu — the web equivalent of the iOS toolbar
 * menus, which is where sorting and appearance lived on the phone.
 *
 * One component serves the sort menu, the appearance menu and the main menu.
 * They differ only in what they're given, which keeps them behaving alike:
 * same opening, same closing, same keyboard handling.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckIcon } from './Icons'

export interface MenuItem {
  key: string
  label: string
  /** Shows a tick, for menus where one option is currently in force. */
  selected?: boolean
  onSelect: () => void
}

export interface MenuSection {
  /** Optional heading, for menus that group several kinds of thing. */
  title?: string
  items: MenuItem[]
}

interface IconMenuProps {
  icon: ReactNode
  /** Read aloud by screen readers, and shown as a tooltip. */
  label: string
  sections: MenuSection[]
  /** Highlights the icon, for a menu whose setting is currently active. */
  isActive?: boolean
  /** Which side to line the menu up with. Right by default. */
  align?: 'left' | 'right'
}

export function IconMenu({ icon, label, sections, isActive, align = 'right' }: IconMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close when clicking anywhere else, or on Escape — what every menu does,
  // and what people expect without being told.
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="icon-menu" ref={containerRef}>
      <button
        type="button"
        className={`icon-btn ${isActive ? 'icon-btn--on' : ''}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={label}
      >
        {icon}
      </button>

      {isOpen && (
        <div className={`menu menu--${align}`} role="menu">
          {sections.map((section, sectionIndex) => (
            <div key={section.title ?? sectionIndex} className="menu__section">
              {section.title && <p className="menu__heading">{section.title}</p>}

              {section.items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  className={`menu__item ${item.selected ? 'menu__item--on' : ''}`}
                  onClick={() => {
                    item.onSelect()
                    setIsOpen(false)
                  }}
                >
                  {/* The tick column is always present, so labels line up
                      whether or not an item is the chosen one. */}
                  <span className="menu__tick">{item.selected && <CheckIcon />}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

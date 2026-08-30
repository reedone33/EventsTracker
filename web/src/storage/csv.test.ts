/**
 * Tests for reading the iPhone's CSV export.
 *
 * The awkward cases are all here: notes containing commas, notes containing
 * quotes, missing locations, and headings in another language.
 */

import { describe, expect, it } from 'vitest'
import { csvToThings, parseCsvRows } from './csv'

const HEADER = 'Thing Name,Timestamp,Latitude,Longitude,Note'

describe('parseCsvRows', () => {
  it('splits plain rows', () => {
    expect(parseCsvRows('a,b,c\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('keeps commas that are inside quotes', () => {
    const rows = parseCsvRows('name,note\nCoffee,"strong, black"')
    expect(rows[1]).toEqual(['Coffee', 'strong, black'])
  })

  it('turns a doubled quote into one real quote', () => {
    const rows = parseCsvRows('name,note\nCoffee,"she said ""hello"""')
    expect(rows[1][1]).toBe('she said "hello"')
  })

  it('keeps line breaks that are inside quotes', () => {
    const rows = parseCsvRows('name,note\nCoffee,"line one\nline two"')
    expect(rows).toHaveLength(2)
    expect(rows[1][1]).toBe('line one\nline two')
  })

  it('handles Windows line endings', () => {
    expect(parseCsvRows('a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('ignores trailing blank lines', () => {
    expect(parseCsvRows('a,b\n1,2\n\n')).toHaveLength(2)
  })
})

describe('csvToThings', () => {
  it('groups rows into things by name', () => {
    const csv = [
      HEADER,
      'Coffee,2026-03-01T09:00:00Z,,,',
      'Coffee,2026-03-01T15:00:00Z,,,',
      'Workout,2026-03-02T07:00:00Z,,,',
    ].join('\n')

    const { things } = csvToThings(csv)
    expect(things).toHaveLength(2)
    expect(things.find((thing) => thing.name === 'Coffee')?.logs).toHaveLength(2)
    expect(things.find((thing) => thing.name === 'Workout')?.logs).toHaveLength(1)
  })

  it('keeps location and note data', () => {
    const csv = [HEADER, 'Coffee,2026-03-01T09:00:00Z,34.02,-84.19,"morning, strong"'].join('\n')
    const { things } = csvToThings(csv)
    expect(things[0].logs[0].location).toEqual({ latitude: 34.02, longitude: -84.19 })
    expect(things[0].logs[0].note).toBe('morning, strong')
  })

  it('leaves location empty when the columns are blank', () => {
    const csv = [HEADER, 'Coffee,2026-03-01T09:00:00Z,,,'].join('\n')
    const { things } = csvToThings(csv)
    expect(things[0].logs[0].location).toBeNull()
    expect(things[0].logs[0].note).toBeNull()
  })

  it('gives every thing a different colour', () => {
    const csv = [
      HEADER,
      'A,2026-03-01T09:00:00Z,,,',
      'B,2026-03-01T09:00:00Z,,,',
      'C,2026-03-01T09:00:00Z,,,',
    ].join('\n')

    const { things } = csvToThings(csv)
    const swatches = things.map((thing) => JSON.stringify(thing.color))
    expect(new Set(swatches).size).toBe(3)
  })

  it('dates each thing from its oldest log', () => {
    const csv = [
      HEADER,
      'Coffee,2026-03-05T09:00:00Z,,,',
      'Coffee,2026-03-01T09:00:00Z,,,',
    ].join('\n')

    const { things } = csvToThings(csv)
    expect(new Date(things[0].creationDate as string).getUTCDate()).toBe(1)
  })

  it('copes with headings in another language', () => {
    // The iOS app translates its CSV headings, so the header can't be matched
    // by its words. It is recognised by its timestamp column not being a date.
    const csv = ['Nome,Data e ora,Latitudine,Longitudine,Nota', 'Caffè,2026-03-01T09:00:00Z,,,'].join('\n')
    const { things } = csvToThings(csv)
    expect(things).toHaveLength(1)
    expect(things[0].name).toBe('Caffè')
  })

  it('reads a file that has no heading row at all', () => {
    const csv = 'Coffee,2026-03-01T09:00:00Z,,,'
    const { things } = csvToThings(csv)
    expect(things).toHaveLength(1)
  })

  it('skips unreadable rows and says how many', () => {
    const csv = [HEADER, 'Coffee,2026-03-01T09:00:00Z,,,', 'Broken,not-a-date,,,', ',2026-03-01T09:00:00Z,,,'].join('\n')
    const { things, warnings } = csvToThings(csv)
    expect(things).toHaveLength(1)
    const skipped = warnings.find((warning) => warning.key === 'warn.skippedRows')
    expect(skipped?.count).toBe(2)
  })

  it('always mentions that colours were assigned', () => {
    const { warnings } = csvToThings([HEADER, 'Coffee,2026-03-01T09:00:00Z,,,'].join('\n'))
    expect(warnings.map((warning) => warning.key)).toContain('warn.colorsAssigned')
  })

  it('warns when there are more things than distinct colours', () => {
    const rows = [HEADER]
    for (let index = 0; index < 10; index += 1) {
      rows.push(`Thing${index},2026-03-01T09:00:00Z,,,`)
    }
    const { things, warnings } = csvToThings(rows.join('\n'))
    expect(things).toHaveLength(10)
    const tooMany = warnings.find((warning) => warning.key === 'warn.tooManyColors')
    expect(tooMany?.count).toBe(10)
    expect(tooMany?.values?.limit).toBe(8)
  })

  it('reports an empty file rather than importing nothing silently', () => {
    expect(csvToThings('').warnings[0].key).toBe('warn.fileEmpty')
    expect(csvToThings(HEADER).warnings[0].key).toBe('warn.headersOnly')
  })
})

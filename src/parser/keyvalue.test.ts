import { describe, expect, it } from 'vitest'
import { parseKeyValueSheet } from './keyvalue.js'

describe('parseKeyValueSheet with stringPaths', () => {
  const rows = [
    ['Key Path', 'Value'],
    ['stats[0].label', 'Year'],
    ['stats[0].value', '2024'],
    ['stats[1].label', 'Score'],
    ['stats[1].value', '42'],
    ['title', 'Hello'],
    ['count', '10'],
  ]

  it('converts numbers by default', () => {
    const result = parseKeyValueSheet(rows)
    expect(result).toMatchObject({
      stats: [
        { label: 'Year', value: 2024 },
        { label: 'Score', value: 42 },
      ],
      title: 'Hello',
      count: 10,
    })
  })

  it('keeps values as strings for matching stringPaths', () => {
    const result = parseKeyValueSheet(rows, ['stats[*].value'])
    expect(result).toMatchObject({
      stats: [
        { label: 'Year', value: '2024' },
        { label: 'Score', value: '42' },
      ],
      title: 'Hello',
      count: 10,
    })
  })

  it('supports ** glob pattern', () => {
    const result = parseKeyValueSheet(rows, ['**.value'])
    expect(result).toMatchObject({
      stats: [
        { label: 'Year', value: '2024' },
        { label: 'Score', value: '42' },
      ],
    })
  })

  it('does not affect non-matching paths', () => {
    const result = parseKeyValueSheet(rows, ['stats[*].value'])
    expect(result.count).toBe(10)
    expect(result.title).toBe('Hello')
  })
})

import { describe, expect, it } from 'vitest'
import { diffObjects, mergeWithBlacklist } from './merger.js'

describe('mergeWithBlacklist with stringPaths', () => {
  it('does not report a change when number matches string at a stringPath', () => {
    const original = { stats: [{ value: 2024 }] }
    const updates = { stats: [{ value: '2024' }] }
    const { changes } = mergeWithBlacklist(original, updates as any, 'home', {}, ['stats[*].value'])
    expect(changes).toHaveLength(0)
  })

  it('reports a change when values actually differ at a stringPath', () => {
    const original = { stats: [{ value: 2024 }] }
    const updates = { stats: [{ value: '2025' }] }
    const { changes } = mergeWithBlacklist(original, updates as any, 'home', {}, ['stats[*].value'])
    expect(changes).toHaveLength(1)
    expect(changes[0].path).toBe('stats[0].value')
  })

  it('still reports changes for non-stringPath values', () => {
    const original = { count: 10 }
    const updates = { count: 20 }
    const { changes } = mergeWithBlacklist(original, updates, 'home', {}, ['stats[*].value'])
    expect(changes).toHaveLength(1)
  })
})

describe('diffObjects with stringPaths', () => {
  it('suppresses false diffs for number-to-string at stringPaths', () => {
    const original = { header: { tags: ['2024', 'design'] } }
    const updates = { header: { tags: ['2024', 'design'] } }
    const changes = diffObjects(original, updates, 'portfolio', {}, ['header.tags[*]'])
    expect(changes).toHaveLength(0)
  })

  it('suppresses false diffs when original has number and update has string', () => {
    const original = { details: [{ value: 100 }] }
    const updates = { details: [{ value: '100' }] }
    const changes = diffObjects(original, updates as any, 'home', {}, ['details[*].value'])
    expect(changes).toHaveLength(0)
  })

  it('detects real diffs even with stringPaths', () => {
    const original = { details: [{ value: 100 }] }
    const updates = { details: [{ value: '200' }] }
    const changes = diffObjects(original, updates as any, 'home', {}, ['details[*].value'])
    expect(changes).toHaveLength(1)
  })
})

import { describe, expect, it } from 'vitest'
import { parseValue } from './path.js'

describe('parseValue', () => {
  it('converts numeric strings to numbers by default', () => {
    expect(parseValue('2024')).toBe(2024)
    expect(parseValue('3.14')).toBe(3.14)
  })

  it('returns string when forceString is true', () => {
    expect(parseValue('2024', true)).toBe('2024')
    expect(parseValue('3.14', true)).toBe('3.14')
    expect(parseValue('true', true)).toBe('true')
    expect(parseValue('false', true)).toBe('false')
    expect(parseValue('null', true)).toBe('null')
  })

  it('returns empty string for undefined/empty regardless of forceString', () => {
    expect(parseValue(undefined, true)).toBe('')
    expect(parseValue('', true)).toBe('')
  })
})

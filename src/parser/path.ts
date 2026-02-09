import type { JsonArray, JsonObject, JsonValue } from '../types.js'

export function parsePath(path: string): (string | number)[] {
  const parts: (string | number)[] = []
  const regex = /([^.[\]]+)|\[(\d+)\]/g

  for (const match of path.matchAll(regex)) {
    if (match[1] !== undefined) {
      parts.push(match[1])
    } else if (match[2] !== undefined) {
      parts.push(Number.parseInt(match[2], 10))
    }
  }

  return parts
}

export function parseValue(value: string | undefined): JsonValue {
  if (value === undefined || value === '') return ''
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  const num = Number(value)
  if (!Number.isNaN(num) && value.trim() !== '') return num
  return value
}

export function setNestedValue(obj: JsonObject, path: string, value: JsonValue): void {
  const parts = parsePath(path)
  let current: JsonValue = obj

  for (let i = 0; i < parts.length - 1; i++) {
    current = ensureContainer(current, parts[i], typeof parts[i + 1] === 'number')
  }

  assignAtKey(current, parts[parts.length - 1], value)
}

function ensureContainer(parent: JsonValue, key: string | number, nextIsArray: boolean): JsonValue {
  const empty = nextIsArray ? [] : {}
  if (typeof key === 'number') {
    const arr = parent as JsonArray
    if (arr[key] === undefined) arr[key] = empty
    return arr[key]
  }
  const obj = parent as JsonObject
  if (obj[key] === undefined) obj[key] = empty
  return obj[key]
}

function assignAtKey(parent: JsonValue, key: string | number, value: JsonValue): void {
  if (typeof key === 'number') {
    ;(parent as JsonArray)[key] = value
  } else {
    ;(parent as JsonObject)[key] = value
  }
}

export function getNestedValue(obj: JsonObject, path: string): JsonValue {
  const parts = parsePath(path)
  let current: JsonValue = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined as unknown as JsonValue
    if (typeof part === 'number') {
      current = (current as JsonArray)[part]
    } else {
      current = (current as JsonObject)[part]
    }
  }

  return current
}

export function setNestedArray(obj: JsonObject, path: string, value: JsonArray): void {
  const parts = path.split('.')
  let current: JsonObject = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (current[part] === undefined) {
      current[part] = {}
    }
    current = current[part] as JsonObject
  }

  current[parts[parts.length - 1]] = value
}

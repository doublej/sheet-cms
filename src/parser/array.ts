import { isBlacklisted } from '../blacklist/matcher.js'
import type { BlacklistConfig, JsonArray, JsonObject, JsonValue, SheetData } from '../types.js'
import { getNestedValue, parseValue, setNestedValue } from './path.js'

export function parseArraySheet(rows: SheetData): JsonArray {
  if (rows.length < 2) return []

  const headers = rows[0]
  const result: JsonArray = []

  for (const row of rows.slice(1)) {
    if (!row.some((cell) => cell?.trim())) continue
    const item: JsonObject = {}

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const value = row[i]
      if (value !== undefined && value !== '') {
        setNestedValue(item, header, parseValue(value))
      }
    }

    result.push(item)
  }

  return result
}

export function exportToArraySheet(
  items: JsonArray,
  fileName: string,
  arrayPath: string,
  blacklist: BlacklistConfig,
): SheetData {
  if (items.length === 0) return [[]]

  const allHeaders = extractHeaders(items[0] as JsonObject)
  const headers = allHeaders.filter((h) => {
    const fullPath = `${arrayPath}[*].${h}`
    return !isBlacklisted(fullPath, fileName, blacklist)
  })

  const rows: SheetData = [headers]

  for (const item of items) {
    const row = headers.map((h) => {
      const val = getNestedValue(item as JsonObject, h)
      return val !== undefined ? String(val) : ''
    })
    rows.push(row)
  }

  return rows
}

export function extractHeaders(item: JsonObject, prefix = ''): string[] {
  const headers: string[] = []

  for (const [key, value] of Object.entries(item)) {
    const path = prefix ? `${prefix}.${key}` : key
    headers.push(...headersForValue(value, path))
  }

  return headers
}

function headersForValue(value: JsonValue, path: string): string[] {
  if (value === null || typeof value !== 'object') return [path]
  if (!Array.isArray(value)) return extractHeaders(value as JsonObject, path)
  return headersForArray(value, path)
}

function headersForArray(arr: JsonArray, path: string): string[] {
  const headers: string[] = []
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      headers.push(...extractHeaders(v as JsonObject, `${path}[${i}]`))
    } else {
      headers.push(`${path}[${i}]`)
    }
  }
  return headers
}

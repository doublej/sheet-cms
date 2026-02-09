import { isBlacklisted } from '../blacklist/matcher.js'
import type { BlacklistConfig, JsonObject, JsonValue, SheetData } from '../types.js'
import { parseValue, setNestedValue } from './path.js'

export function parseKeyValueSheet(rows: SheetData): JsonObject {
  const result: JsonObject = {}

  for (const row of rows.slice(1)) {
    const [keyPath, value] = row
    if (!keyPath || keyPath.startsWith('#')) continue
    setNestedValue(result, keyPath, parseValue(value))
  }

  return result
}

export function exportToKeyValue(
  obj: JsonObject,
  fileName: string,
  blacklist: BlacklistConfig,
): SheetData {
  const rows: SheetData = [['Key Path', 'Value']]
  flattenObject(obj, '', { rows, fileName, blacklist })
  return rows
}

type FlattenCtx = { rows: SheetData; fileName: string; blacklist: BlacklistConfig }

function flattenObject(obj: JsonValue, prefix: string, ctx: FlattenCtx): void {
  if (prefix && isBlacklisted(prefix, ctx.fileName, ctx.blacklist)) return

  if (obj === null || typeof obj !== 'object') {
    ctx.rows.push([prefix, String(obj ?? '')])
    return
  }

  if (Array.isArray(obj)) {
    flattenArray(obj, prefix, ctx)
  } else {
    flattenEntries(obj, prefix, ctx)
  }
}

function flattenArray(arr: JsonValue[], prefix: string, ctx: FlattenCtx): void {
  for (let i = 0; i < arr.length; i++) {
    flattenObject(arr[i], `${prefix}[${i}]`, ctx)
  }
}

function flattenEntries(obj: JsonObject, prefix: string, ctx: FlattenCtx): void {
  for (const [key, value] of Object.entries(obj)) {
    flattenObject(value, prefix ? `${prefix}.${key}` : key, ctx)
  }
}

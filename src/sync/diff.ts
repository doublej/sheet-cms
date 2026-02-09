import { readJsonFile } from '../io.js'
import { diffObjects } from '../merger.js'
import { parseArraySheet } from '../parser/array.js'
import { parseKeyValueSheet } from '../parser/keyvalue.js'
import { setNestedArray } from '../parser/path.js'
import type { SheetsClient } from '../sheets/client.js'
import type { JsonObject, SheetCmsConfig, SyncResult } from '../types.js'

export type DiffOptions = {
  file?: string
}

export async function diff(
  config: SheetCmsConfig,
  sheets: SheetsClient,
  options: DiffOptions = {},
): Promise<SyncResult[]> {
  const fileNames = options.file ? [options.file] : Object.keys(config.files)
  const blacklist = config.blacklist ?? {}
  const results: SyncResult[] = []

  for (const fileName of fileNames) {
    results.push(await diffFile(fileName, config, sheets, blacklist))
  }

  return results
}

async function diffFile(
  fileName: string,
  config: SheetCmsConfig,
  sheets: SheetsClient,
  blacklist: Record<string, string[]>,
): Promise<SyncResult> {
  const fileConfig = config.files[fileName]
  if (!fileConfig) return { fileName, hasChanges: false, changes: [] }

  const exists = await sheets.exists(fileName)
  if (!exists) return { fileName, hasChanges: false, changes: [] }

  const rows = await sheets.read(fileName)
  if (rows.length < 2) return { fileName, hasChanges: false, changes: [] }

  const original = await readJsonFile(config.dataDir, fileName)
  let updates: JsonObject

  if (fileConfig.type === 'array' && fileConfig.arrayPath) {
    const arrayData = parseArraySheet(rows)
    updates = structuredClone(original)
    setNestedArray(updates, fileConfig.arrayPath, arrayData)
  } else {
    updates = parseKeyValueSheet(rows)
  }

  const changes = diffObjects(original, updates, fileName, blacklist)

  return { fileName, hasChanges: changes.length > 0, changes }
}

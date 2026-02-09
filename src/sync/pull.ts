import { readJsonFile, writeJsonFile } from '../io.js'
import { mergeWithBlacklist } from '../merger.js'
import { parseArraySheet } from '../parser/array.js'
import { parseKeyValueSheet } from '../parser/keyvalue.js'
import { setNestedArray } from '../parser/path.js'
import type { SheetsClient } from '../sheets/client.js'
import type { JsonArray, JsonObject, SheetCmsConfig, SyncResult } from '../types.js'

export type PullOptions = {
  dryRun?: boolean
  file?: string
}

export async function pull(
  config: SheetCmsConfig,
  sheets: SheetsClient,
  options: PullOptions = {},
): Promise<SyncResult[]> {
  const fileNames = options.file ? [options.file] : Object.keys(config.files)
  const blacklist = config.blacklist ?? {}
  const results: SyncResult[] = []

  for (const fileName of fileNames) {
    results.push(await pullFile(fileName, config, sheets, blacklist, options.dryRun ?? false))
  }

  return results
}

async function pullFile(
  fileName: string,
  config: SheetCmsConfig,
  sheets: SheetsClient,
  blacklist: Record<string, string[]>,
  dryRun: boolean,
): Promise<SyncResult> {
  const fileConfig = config.files[fileName]
  if (!fileConfig) {
    return { fileName, hasChanges: false, changes: [] }
  }

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

  const { merged, changes } = mergeWithBlacklist(original, updates, fileName, blacklist)
  const visibleChanges = changes.filter((c) => c.oldValue !== c.newValue)

  if (visibleChanges.length > 0 && !dryRun) {
    await writeJsonFile(config.dataDir, fileName, merged)
  }

  return { fileName, hasChanges: visibleChanges.length > 0, changes: visibleChanges }
}

import { readJsonFile } from '../io.js'
import { exportToArraySheet } from '../parser/array.js'
import { exportToKeyValue } from '../parser/keyvalue.js'
import { getNestedValue } from '../parser/path.js'
import type { SheetsClient } from '../sheets/client.js'
import type { JsonArray, SheetCmsConfig, SyncResult, ValidationError } from '../types.js'
import { validateContent } from '../validator.js'

export type PushOptions = {
  file?: string
}

export type PushResult = {
  results: SyncResult[]
  validationErrors: { fileName: string; errors: ValidationError[] }[]
}

export async function push(
  config: SheetCmsConfig,
  sheets: SheetsClient,
  options: PushOptions = {},
): Promise<PushResult> {
  const fileNames = options.file ? [options.file] : Object.keys(config.files)
  const blacklist = config.blacklist ?? {}
  const rules = config.validation ?? []

  const validationErrors: PushResult['validationErrors'] = []
  for (const fileName of fileNames) {
    const json = await readJsonFile(config.dataDir, fileName)
    const errors = validateContent(json, rules)
    if (errors.length > 0) {
      validationErrors.push({ fileName, errors })
    }
  }

  if (validationErrors.length > 0) {
    return { results: [], validationErrors }
  }

  const results: SyncResult[] = []
  for (const fileName of fileNames) {
    results.push(await pushFile(fileName, config, sheets, blacklist))
  }

  return { results, validationErrors: [] }
}

async function pushFile(
  fileName: string,
  config: SheetCmsConfig,
  sheets: SheetsClient,
  blacklist: Record<string, string[]>,
): Promise<SyncResult> {
  const fileConfig = config.files[fileName]
  if (!fileConfig) {
    return { fileName, hasChanges: false, changes: [] }
  }

  const json = await readJsonFile(config.dataDir, fileName)
  let rows: string[][]

  if (fileConfig.type === 'array' && fileConfig.arrayPath) {
    const arrayData = getNestedValue(json, fileConfig.arrayPath) as JsonArray
    rows = exportToArraySheet(arrayData, fileName, fileConfig.arrayPath, blacklist)
  } else {
    rows = exportToKeyValue(json, fileName, blacklist)
  }

  const exists = await sheets.exists(fileName)
  if (!exists) await sheets.create(fileName)

  await sheets.write(fileName, rows)

  return { fileName, hasChanges: true, changes: [] }
}

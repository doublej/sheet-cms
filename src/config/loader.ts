import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SheetCmsConfig } from '../types.js'
import { sheetCmsConfigSchema } from './schema.js'

const CONFIG_FILENAMES = ['sheet-cms.config.ts', 'sheet-cms.config.js']

export async function loadConfig(configPath?: string): Promise<SheetCmsConfig> {
  const filePath = configPath ? resolve(configPath) : findConfigFile()

  if (!filePath) return loadFromEnv()

  const mod = await import(filePath)
  const raw = mod.default ?? mod

  return sheetCmsConfigSchema.parse(raw)
}

function loadFromEnv(): SheetCmsConfig {
  const spreadsheetId = process.env.SHEET_CMS_SPREADSHEET_ID
  const credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH

  if (!spreadsheetId || !credentialsPath) {
    throw new Error(`No config file found. Create ${CONFIG_FILENAMES[0]} or run 'sheet-cms setup'.`)
  }

  return sheetCmsConfigSchema.parse({ spreadsheetId, credentialsPath, files: {} })
}

function findConfigFile(): string | undefined {
  const cwd = process.cwd()
  for (const name of CONFIG_FILENAMES) {
    const full = resolve(cwd, name)
    if (existsSync(full)) return full
  }
  return undefined
}

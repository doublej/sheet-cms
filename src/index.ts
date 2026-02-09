export { defineConfig } from './config/schema.js'
export { loadConfig } from './config/loader.js'
export { createSheetsClient } from './sheets/client.js'
export { pull } from './sync/pull.js'
export { push } from './sync/push.js'
export { diff } from './sync/diff.js'
export { validateContent } from './validator.js'
export { isBlacklisted, getBlacklistPatterns } from './blacklist/matcher.js'

export type {
  BlacklistConfig,
  FieldChange,
  FileConfig,
  JsonArray,
  JsonObject,
  JsonValue,
  MergeResult,
  SheetCmsConfig,
  SheetData,
  SheetRow,
  SyncResult,
  ValidationError,
  ValidationRule,
  ValidationRuleCheck,
} from './types.js'

export type { SheetsClient } from './sheets/client.js'
export type { PullOptions } from './sync/pull.js'
export type { PushOptions, PushResult } from './sync/push.js'
export type { DiffOptions } from './sync/diff.js'

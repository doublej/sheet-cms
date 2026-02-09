export type SheetRow = string[]
export type SheetData = SheetRow[]

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray
export type JsonObject = { [key: string]: JsonValue }
export type JsonArray = JsonValue[]

export type FieldChange = {
  path: string
  oldValue: JsonValue
  newValue: JsonValue
}

export type SyncResult = {
  fileName: string
  hasChanges: boolean
  changes: FieldChange[]
}

export type ValidationError = {
  path: string
  value: string
  reason: string
}

export type ValidationRule = {
  match: string
  message: string
  rule: ValidationRuleCheck
}

export type ValidationRuleCheck =
  | { startsWith: string | string[] }
  | { pattern: string }
  | { oneOf: string[] }
  | { custom: (value: string) => boolean }

export type FileConfig = {
  type: 'keyvalue' | 'array'
  arrayPath?: string
}

export type BlacklistConfig = Record<string, string[]>

export type SheetCmsConfig = {
  spreadsheetId: string
  credentialsPath: string
  dataDir: string
  files: Record<string, FileConfig>
  blacklist?: BlacklistConfig
  validation?: ValidationRule[]
}

export type MergeResult = {
  merged: JsonObject
  changes: FieldChange[]
}

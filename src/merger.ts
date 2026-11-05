import { isBlacklisted, matchPattern } from './blacklist/matcher.js'
import type {
  BlacklistConfig,
  FieldChange,
  JsonArray,
  JsonObject,
  JsonValue,
  MergeResult,
} from './types.js'

export function mergeWithBlacklist(
  original: JsonObject,
  updates: JsonObject,
  fileName: string,
  blacklist: BlacklistConfig,
  stringPaths: string[] = [],
): MergeResult {
  const changes: FieldChange[] = []
  const merged = deepMerge(original, updates, '', fileName, blacklist, stringPaths, changes)
  return { merged: merged as JsonObject, changes }
}

function isStringPath(path: string, stringPaths: string[]): boolean {
  return stringPaths.some((p) => matchPattern(path, p))
}

function deepMerge(
  original: JsonValue,
  updates: JsonValue,
  currentPath: string,
  fileName: string,
  blacklist: BlacklistConfig,
  stringPaths: string[],
  changes: FieldChange[],
): JsonValue {
  if (currentPath && isBlacklisted(currentPath, fileName, blacklist)) return original

  if (Array.isArray(updates)) {
    return mergeArrays(original, updates, currentPath, fileName, blacklist, stringPaths, changes)
  }

  if (updates !== null && typeof updates === 'object') {
    return mergeObjects(original, updates, currentPath, fileName, blacklist, stringPaths, changes)
  }

  if (currentPath && isStringPath(currentPath, stringPaths)) {
    const coerced = String(original)
    const updStr = String(updates)
    if (coerced !== updStr) {
      changes.push({ path: currentPath, oldValue: original, newValue: updates })
    }
  } else if (original !== updates) {
    changes.push({ path: currentPath, oldValue: original, newValue: updates })
  }
  return updates
}

function mergeArrays(
  original: JsonValue,
  updates: JsonArray,
  currentPath: string,
  fileName: string,
  blacklist: BlacklistConfig,
  stringPaths: string[],
  changes: FieldChange[],
): JsonArray {
  if (!Array.isArray(original)) {
    changes.push({ path: currentPath, oldValue: original, newValue: updates })
    return updates
  }

  const result: JsonArray = []
  const maxLen = Math.max(original.length, updates.length)

  for (let i = 0; i < maxLen; i++) {
    const itemPath = `${currentPath}[${i}]`
    if (i >= updates.length) {
      result.push(original[i])
    } else if (i >= original.length) {
      changes.push({ path: itemPath, oldValue: null, newValue: updates[i] })
      result.push(updates[i])
    } else {
      result.push(
        deepMerge(original[i], updates[i], itemPath, fileName, blacklist, stringPaths, changes),
      )
    }
  }

  return result
}

function mergeObjects(
  original: JsonValue,
  updates: JsonValue,
  currentPath: string,
  fileName: string,
  blacklist: BlacklistConfig,
  stringPaths: string[],
  changes: FieldChange[],
): JsonObject {
  if (original === null || typeof original !== 'object' || Array.isArray(original)) {
    changes.push({ path: currentPath, oldValue: original, newValue: updates })
    return updates as JsonObject
  }

  const result: JsonObject = { ...original }

  for (const key of Object.keys(updates as JsonObject)) {
    const newPath = currentPath ? `${currentPath}.${key}` : key
    result[key] = deepMerge(
      (original as JsonObject)[key],
      (updates as JsonObject)[key],
      newPath,
      fileName,
      blacklist,
      stringPaths,
      changes,
    )
  }

  return result
}

export function diffObjects(
  original: JsonObject,
  updates: JsonObject,
  fileName: string,
  blacklist: BlacklistConfig,
  stringPaths: string[] = [],
): FieldChange[] {
  const changes: FieldChange[] = []
  deepMerge(original, updates, '', fileName, blacklist, stringPaths, changes)
  return changes.filter((c) => !isBlacklisted(c.path, fileName, blacklist))
}

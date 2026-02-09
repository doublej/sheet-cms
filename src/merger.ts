import { isBlacklisted } from './blacklist/matcher.js'
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
): MergeResult {
  const changes: FieldChange[] = []
  const merged = deepMerge(original, updates, '', fileName, blacklist, changes)
  return { merged: merged as JsonObject, changes }
}

function deepMerge(
  original: JsonValue,
  updates: JsonValue,
  currentPath: string,
  fileName: string,
  blacklist: BlacklistConfig,
  changes: FieldChange[],
): JsonValue {
  if (currentPath && isBlacklisted(currentPath, fileName, blacklist)) return original

  if (Array.isArray(updates)) {
    return mergeArrays(original, updates, currentPath, fileName, blacklist, changes)
  }

  if (updates !== null && typeof updates === 'object') {
    return mergeObjects(original, updates, currentPath, fileName, blacklist, changes)
  }

  if (original !== updates) {
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
      result.push(deepMerge(original[i], updates[i], itemPath, fileName, blacklist, changes))
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
): FieldChange[] {
  const changes: FieldChange[] = []
  deepMerge(original, updates, '', fileName, blacklist, changes)
  return changes.filter((c) => !isBlacklisted(c.path, fileName, blacklist))
}

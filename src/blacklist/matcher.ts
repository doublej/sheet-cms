import type { BlacklistConfig } from '../types.js'

export function isBlacklisted(path: string, fileName: string, blacklist: BlacklistConfig): boolean {
  const patterns = [...(blacklist['*'] || []), ...(blacklist[fileName] || [])]
  return patterns.some((pattern) => matchPattern(path, pattern))
}

function matchPattern(path: string, pattern: string): boolean {
  const regexStr = pattern
    .replace(/\./g, '\\.')
    .replace(/\[\*\]/g, '\\[\\d+\\]')
    .replace(/\*\*/g, '.*')

  const exactRegex = new RegExp(`^${regexStr}$`)
  const prefixRegex = new RegExp(`^${regexStr}[.\\[]`)
  return exactRegex.test(path) || prefixRegex.test(path)
}

export function getBlacklistPatterns(fileName: string, blacklist: BlacklistConfig): string[] {
  return [...(blacklist['*'] || []), ...(blacklist[fileName] || [])]
}

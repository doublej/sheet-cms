import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { JsonObject } from './types.js'

export async function readJsonFile(dataDir: string, fileName: string): Promise<JsonObject> {
  const filePath = join(dataDir, `${fileName}.json`)
  const content = await readFile(filePath, 'utf-8')
  return JSON.parse(content)
}

export async function writeJsonFile(
  dataDir: string,
  fileName: string,
  data: JsonObject,
): Promise<void> {
  const filePath = join(dataDir, `${fileName}.json`)
  const content = `${JSON.stringify(data, null, 2)}\n`
  await writeFile(filePath, content, 'utf-8')
}

export function formatChange(path: string, oldVal: unknown, newVal: unknown): string {
  const oldStr = truncate(JSON.stringify(oldVal), 40)
  const newStr = truncate(JSON.stringify(newVal), 40)
  return `  ${path}: ${oldStr} → ${newStr}`
}

function truncate(str: string | undefined, len: number): string {
  if (str === undefined) return 'undefined'
  if (str.length <= len) return str
  return `${str.slice(0, len - 3)}...`
}

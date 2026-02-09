import { z } from 'zod'
import type { SheetCmsConfig } from '../types.js'

const validationRuleCheckSchema = z.union([
  z.object({ startsWith: z.union([z.string(), z.array(z.string())]) }),
  z.object({ pattern: z.string() }),
  z.object({ oneOf: z.array(z.string()) }),
  z.object({ custom: z.function().args(z.string()).returns(z.boolean()) }),
])

const validationRuleSchema = z.object({
  match: z.string(),
  message: z.string(),
  rule: validationRuleCheckSchema,
})

const fileConfigSchema = z.object({
  type: z.enum(['keyvalue', 'array']),
  arrayPath: z.string().optional(),
})

export const sheetCmsConfigSchema = z.object({
  spreadsheetId: z.string().min(1, 'spreadsheetId is required'),
  credentialsPath: z.string().default('./google-credentials.json'),
  dataDir: z.string().default('public/data'),
  files: z.record(z.string(), fileConfigSchema),
  blacklist: z.record(z.string(), z.array(z.string())).optional(),
  validation: z.array(validationRuleSchema).optional(),
})

export function defineConfig(config: SheetCmsConfig): SheetCmsConfig {
  return config
}

import { Elysia, t } from 'elysia'
import { getBlacklistPatterns } from '../blacklist/matcher.js'
import { createSheetsClient } from '../sheets/client.js'
import { diff } from '../sync/diff.js'
import { pull } from '../sync/pull.js'
import { push } from '../sync/push.js'
import type { SheetCmsConfig } from '../types.js'

export function syncRoutes(config: SheetCmsConfig) {
  const sheets = createSheetsClient(config)

  return new Elysia({ prefix: '' })
    .post(
      '/pull',
      async ({ body }) => {
        const results = await pull(config, sheets, {
          dryRun: body?.dryRun,
          file: body?.file,
        })
        return { results }
      },
      {
        body: t.Optional(
          t.Object({
            dryRun: t.Optional(t.Boolean()),
            file: t.Optional(t.String()),
          }),
        ),
      },
    )
    .post(
      '/push',
      async ({ body }) => {
        const { results, validationErrors } = await push(config, sheets, {
          file: body?.file,
        })
        if (validationErrors.length > 0) {
          return { error: 'Validation failed', validationErrors }
        }
        return { results }
      },
      {
        body: t.Optional(
          t.Object({
            file: t.Optional(t.String()),
          }),
        ),
      },
    )
    .post(
      '/diff',
      async ({ body }) => {
        const results = await diff(config, sheets, {
          file: body?.file,
        })
        return { results }
      },
      {
        body: t.Optional(
          t.Object({
            file: t.Optional(t.String()),
          }),
        ),
      },
    )
    .get('/files', () => {
      return { files: config.files }
    })
    .get('/blacklist/:file', ({ params }) => {
      const blacklist = config.blacklist ?? {}
      const patterns = getBlacklistPatterns(params.file, blacklist)
      return { file: params.file, patterns }
    })
    .get('/blacklist', () => {
      const blacklist = config.blacklist ?? {}
      const fileNames = Object.keys(config.files)
      const result: Record<string, string[]> = {}
      for (const fileName of fileNames) {
        result[fileName] = getBlacklistPatterns(fileName, blacklist)
      }
      return { blacklist: result }
    })
}

#!/usr/bin/env bun
import { program } from 'commander'
import { getBlacklistPatterns } from './blacklist/matcher.js'
import { loadConfig } from './config/loader.js'
import { formatChange } from './io.js'
import { createSheetsClient } from './sheets/client.js'
import { diff } from './sync/diff.js'
import { pull } from './sync/pull.js'
import { push } from './sync/push.js'

program
  .name('sheet-cms')
  .description('Sync content between Google Sheets and JSON files')
  .version('0.1.0')

program
  .command('pull')
  .description('Pull content from Google Sheets and update JSON files')
  .option('--dry-run', 'Show changes without writing files')
  .option('-f, --file <name>', 'Sync only specific file')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (opts: { dryRun?: boolean; file?: string; config?: string }) => {
    const config = await loadConfig(opts.config)
    const sheets = createSheetsClient(config)

    console.log('\nPulling from Google Sheets...\n')
    const results = await pull(config, sheets, { dryRun: opts.dryRun, file: opts.file })

    for (const result of results) {
      if (!result.hasChanges) {
        console.log(`  ${result.fileName}: No changes`)
        continue
      }
      console.log(`  ${result.fileName}: ${result.changes.length} change(s)`)
      for (const change of result.changes.slice(0, 5)) {
        console.log(formatChange(change.path, change.oldValue, change.newValue))
      }
      if (result.changes.length > 5) {
        console.log(`    ... and ${result.changes.length - 5} more`)
      }
    }

    if (opts.dryRun) {
      console.log('\n(Dry run - no files written)')
    }
  })

program
  .command('push')
  .description('Push current JSON content to Google Sheets')
  .option('-f, --file <name>', 'Push only specific file')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (opts: { file?: string; config?: string }) => {
    const config = await loadConfig(opts.config)
    const sheets = createSheetsClient(config)

    console.log('\nPushing to Google Sheets...\n')
    const { results, validationErrors } = await push(config, sheets, { file: opts.file })

    if (validationErrors.length > 0) {
      printValidationErrors(validationErrors)
      process.exit(1)
    }

    for (const result of results) {
      console.log(`  ${result.fileName}: pushed`)
    }
    console.log('\nDone!')
  })

program
  .command('diff')
  .description('Show differences between Sheet and local JSON')
  .option('-f, --file <name>', 'Diff only specific file')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (opts: { file?: string; config?: string }) => {
    const config = await loadConfig(opts.config)
    const sheets = createSheetsClient(config)

    console.log('\nComparing Sheet with local JSON...\n')
    const results = await diff(config, sheets, { file: opts.file })

    for (const result of results) {
      if (!result.hasChanges) {
        console.log(`${result.fileName}: No differences`)
      } else {
        console.log(`${result.fileName}: ${result.changes.length} difference(s)`)
        for (const change of result.changes) {
          console.log(formatChange(change.path, change.oldValue, change.newValue))
        }
      }
    }
  })

program
  .command('blacklist')
  .description('Show blacklisted paths for a file')
  .argument('[file]', 'File name (shows all if omitted)')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (file: string | undefined, opts: { config?: string }) => {
    const config = await loadConfig(opts.config)
    const blacklist = config.blacklist ?? {}
    const fileNames = file ? [file] : Object.keys(config.files)

    for (const fileName of fileNames) {
      const patterns = getBlacklistPatterns(fileName, blacklist)
      console.log(`\n${fileName}:`)
      if (patterns.length === 0) {
        console.log('  (no blacklisted paths)')
      } else {
        for (const pattern of patterns) {
          console.log(`  - ${pattern}`)
        }
      }
    }
  })

program
  .command('setup')
  .description('Interactive setup wizard for Google Sheets credentials')
  .action(async () => {
    const { setup } = await import('./setup.js')
    await setup()
  })

program
  .command('serve')
  .description('Start the HTTP API server')
  .option('-c, --config <path>', 'Path to config file')
  .action(async (opts: { config?: string }) => {
    const { startServer } = await import('./server.js')
    await startServer(opts.config)
  })

function printValidationErrors(
  validationErrors: {
    fileName: string
    errors: { path: string; reason: string; value: string }[]
  }[],
) {
  for (const { fileName, errors } of validationErrors) {
    console.log(`  ${fileName}: ${errors.length} validation error(s)`)
    for (const err of errors) {
      console.log(`    ${err.path}: ${err.reason}`)
      const display = err.value.length > 80 ? `${err.value.slice(0, 80)}...` : err.value
      console.log(`      got: ${display}`)
    }
  }
  console.log('\nPush aborted due to validation errors.')
}

program.parse()

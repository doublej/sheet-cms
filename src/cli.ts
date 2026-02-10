#!/usr/bin/env bun
import { program } from 'commander'
import { getBlacklistPatterns } from './blacklist/matcher.js'
import { loadConfig } from './config/loader.js'
import { createSheetsClient } from './sheets/client.js'
import { diff } from './sync/diff.js'
import { pull } from './sync/pull.js'
import { push } from './sync/push.js'
import { type UiOptions, createUi } from './ui.js'

function getUiFromGlobalOpts(globalOpts: Record<string, unknown>) {
  return createUi({
    mode: globalOpts.json ? 'json' : globalOpts.quiet ? 'quiet' : 'normal',
    noColor: globalOpts.color === false,
    noProgress: globalOpts.progress === false,
  })
}

function displayPullResults(
  ui: ReturnType<typeof createUi>,
  results: Awaited<ReturnType<typeof pull>>,
  dryRun: boolean,
) {
  ui.header('Pull Results')
  const totalChanges = results.reduce((sum, r) => sum + r.changes.length, 0)

  for (const result of results) {
    if (!result.hasChanges) {
      ui.info(`  ${result.fileName}: No changes`)
      continue
    }

    ui.info(`  ${result.fileName}: ${result.changes.length} change(s)`)
    const displayCount = Math.min(5, result.changes.length)
    for (const change of result.changes.slice(0, displayCount)) {
      ui.info(`    ${ui.formatChange(change)}`)
    }
    if (result.changes.length > displayCount) {
      ui.status(`    ... and ${result.changes.length - displayCount} more`)
    }
  }

  if (totalChanges === 0) {
    ui.success('\nAll files up to date')
  } else if (dryRun) {
    ui.warn(`\nDry run: ${totalChanges} change(s) would be written`)
  } else {
    ui.success(`\nPulled ${totalChanges} change(s)`)
  }
}

function displayValidationErrors(
  ui: ReturnType<typeof createUi>,
  validationErrors: Awaited<ReturnType<typeof push>>['validationErrors'],
) {
  ui.error('Validation failed')
  for (const { fileName, errors } of validationErrors) {
    ui.info(`\n  ${fileName}: ${errors.length} error(s)`)
    for (const err of errors) {
      ui.info(`    ${err.path}: ${err.reason}`)
      const display = err.value.length > 80 ? `${err.value.slice(0, 80)}...` : err.value
      ui.status(`      got: ${display}`)
    }
  }
  ui.info('')
}

function displayDiffResults(
  ui: ReturnType<typeof createUi>,
  results: Awaited<ReturnType<typeof diff>>,
) {
  ui.header('Diff Results')
  const totalDiffs = results.reduce((sum, r) => sum + r.changes.length, 0)

  for (const result of results) {
    if (!result.hasChanges) {
      ui.info(`${result.fileName}: No differences`)
    } else {
      ui.info(`${result.fileName}: ${result.changes.length} difference(s)`)
      for (const change of result.changes) {
        ui.info(`  ${ui.formatChange(change)}`)
      }
    }
  }

  if (totalDiffs === 0) {
    ui.success('\nAll files in sync')
  } else {
    ui.info(`\nTotal: ${totalDiffs} difference(s)`)
  }
}

async function runPullCommand(
  opts: { dryRun?: boolean; file?: string; config?: string },
  cmd: { optsWithGlobals: () => Record<string, unknown> },
) {
  const ui = getUiFromGlobalOpts(cmd.optsWithGlobals())
  try {
    const spinner = ui.spinner('Loading config').start()
    const config = await loadConfig(opts.config)
    const sheets = createSheetsClient(config)
    spinner.succeed('Config loaded')

    const pullSpinner = ui
      .spinner(`Pulling from Google Sheets${opts.file ? ` (${opts.file})` : ''}`)
      .start()
    const results = await pull(config, sheets, { dryRun: opts.dryRun, file: opts.file })
    pullSpinner.stop()

    if (cmd.optsWithGlobals().json) {
      ui.data({ results, dryRun: opts.dryRun ?? false })
      return
    }

    displayPullResults(ui, results, opts.dryRun ?? false)
  } catch (err) {
    ui.error((err as Error).message)
    process.exit(1)
  }
}

async function runPushCommand(
  opts: { file?: string; config?: string },
  cmd: { optsWithGlobals: () => Record<string, unknown> },
) {
  const ui = getUiFromGlobalOpts(cmd.optsWithGlobals())
  try {
    const spinner = ui.spinner('Loading config').start()
    const config = await loadConfig(opts.config)
    const sheets = createSheetsClient(config)
    spinner.succeed('Config loaded')

    const validateSpinner = ui.spinner('Validating content').start()
    const { results, validationErrors } = await push(config, sheets, { file: opts.file })
    validateSpinner.stop()

    if (validationErrors.length > 0) {
      if (cmd.optsWithGlobals().json) {
        ui.data({ success: false, validationErrors })
        process.exit(1)
      }
      displayValidationErrors(ui, validationErrors)
      process.exit(1)
    }

    if (cmd.optsWithGlobals().json) {
      ui.data({ success: true, results })
      return
    }

    ui.header('Push Results')
    for (const result of results) {
      ui.success(`${result.fileName}: pushed`)
    }
    ui.info('')
  } catch (err) {
    ui.error((err as Error).message)
    process.exit(1)
  }
}

async function runDiffCommand(
  opts: { file?: string; config?: string },
  cmd: { optsWithGlobals: () => Record<string, unknown> },
) {
  const ui = getUiFromGlobalOpts(cmd.optsWithGlobals())
  try {
    const spinner = ui.spinner('Loading config').start()
    const config = await loadConfig(opts.config)
    const sheets = createSheetsClient(config)
    spinner.succeed('Config loaded')

    const diffSpinner = ui
      .spinner(`Comparing with Google Sheets${opts.file ? ` (${opts.file})` : ''}`)
      .start()
    const results = await diff(config, sheets, { file: opts.file })
    diffSpinner.stop()

    if (cmd.optsWithGlobals().json) {
      ui.data({ results })
      return
    }

    displayDiffResults(ui, results)
  } catch (err) {
    ui.error((err as Error).message)
    process.exit(1)
  }
}

function displayBlacklistResults(
  ui: ReturnType<typeof createUi>,
  fileNames: string[],
  blacklist: Record<string, string[]>,
) {
  ui.header('Blacklisted Paths')
  for (const fileName of fileNames) {
    const patterns = getBlacklistPatterns(fileName, blacklist)
    ui.info(`${fileName}:`)
    if (patterns.length === 0) {
      ui.status('  (no blacklisted paths)')
    } else {
      for (const pattern of patterns) {
        ui.info(`  - ${pattern}`)
      }
    }
    ui.info('')
  }
}

async function runBlacklistCommand(
  file: string | undefined,
  opts: { config?: string },
  cmd: { optsWithGlobals: () => Record<string, unknown> },
) {
  const ui = getUiFromGlobalOpts(cmd.optsWithGlobals())
  try {
    const config = await loadConfig(opts.config)
    const blacklist = config.blacklist ?? {}
    const fileNames = file ? [file] : Object.keys(config.files)

    if (cmd.optsWithGlobals().json) {
      const data = Object.fromEntries(
        fileNames.map((fileName) => [fileName, getBlacklistPatterns(fileName, blacklist)]),
      )
      ui.data(data)
      return
    }

    displayBlacklistResults(ui, fileNames, blacklist)
  } catch (err) {
    ui.error((err as Error).message)
    process.exit(1)
  }
}

program
  .name('sheet-cms')
  .description('Sync content between Google Sheets and JSON files')
  .version('0.1.0')
  .option('--json', 'Output results as JSON')
  .option('--quiet', 'Suppress all non-essential output')
  .option('--no-color', 'Disable color output')
  .option('--no-progress', 'Disable spinners and progress indicators')

program
  .command('pull')
  .description('Pull content from Google Sheets and update JSON files')
  .option('--dry-run', 'Show changes without writing files')
  .option('-f, --file <name>', 'Sync only specific file')
  .option('-c, --config <path>', 'Path to config file')
  .action(runPullCommand)

program
  .command('push')
  .description('Push current JSON content to Google Sheets')
  .option('-f, --file <name>', 'Push only specific file')
  .option('-c, --config <path>', 'Path to config file')
  .action(runPushCommand)

program
  .command('diff')
  .description('Show differences between Sheet and local JSON')
  .option('-f, --file <name>', 'Diff only specific file')
  .option('-c, --config <path>', 'Path to config file')
  .action(runDiffCommand)

program
  .command('blacklist')
  .description('Show blacklisted paths for a file')
  .argument('[file]', 'File name (shows all if omitted)')
  .option('-c, --config <path>', 'Path to config file')
  .action(runBlacklistCommand)

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

program.parse()

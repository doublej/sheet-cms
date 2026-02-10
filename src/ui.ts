import pc from 'picocolors'
import type { FieldChange } from './types.js'

type OutputMode = 'normal' | 'quiet' | 'json'

export type UiOptions = {
  mode: OutputMode
  noColor: boolean
  noProgress: boolean
}

export const defaultUiOptions: UiOptions = {
  mode: 'normal',
  noColor: !process.stderr.isTTY,
  noProgress: !process.stderr.isTTY,
}

class Ui {
  private opts: UiOptions

  constructor(opts: UiOptions) {
    this.opts = opts
    if (opts.noColor) {
      pc.isColorSupported = false
    }
  }

  status(msg: string) {
    if (this.opts.mode === 'quiet' || this.opts.mode === 'json') return
    process.stderr.write(`${pc.dim(msg)}\n`)
  }

  info(msg: string) {
    if (this.opts.mode === 'quiet' || this.opts.mode === 'json') return
    process.stderr.write(`${msg}\n`)
  }

  success(msg: string) {
    if (this.opts.mode === 'quiet' || this.opts.mode === 'json') return
    process.stderr.write(`${pc.green('✓')} ${msg}\n`)
  }

  error(msg: string) {
    if (this.opts.mode === 'json') return
    process.stderr.write(`${pc.red('✗')} ${msg}\n`)
  }

  warn(msg: string) {
    if (this.opts.mode === 'quiet' || this.opts.mode === 'json') return
    process.stderr.write(`${pc.yellow('⚠')} ${msg}\n`)
  }

  data(obj: unknown) {
    process.stdout.write(`${JSON.stringify(obj, null, 2)}\n`)
  }

  formatChange(change: FieldChange): string {
    const oldStr = truncate(JSON.stringify(change.oldValue), 40)
    const newStr = truncate(JSON.stringify(change.newValue), 40)
    return `${pc.dim(change.path)}: ${pc.red(oldStr)} ${pc.dim('→')} ${pc.green(newStr)}`
  }

  header(msg: string) {
    if (this.opts.mode === 'quiet' || this.opts.mode === 'json') return
    process.stderr.write(`\n${pc.bold(msg)}\n\n`)
  }

  rule() {
    if (this.opts.mode === 'quiet' || this.opts.mode === 'json') return
    process.stderr.write(`${pc.dim('─'.repeat(50))}\n`)
  }

  spinner(text: string): Spinner {
    if (this.opts.noProgress || this.opts.mode !== 'normal') {
      return new NoopSpinner()
    }
    return new TerminalSpinner(text)
  }
}

interface Spinner {
  start(): Spinner
  update(text: string): void
  succeed(text?: string): void
  fail(text?: string): void
  stop(): void
}

class NoopSpinner implements Spinner {
  start() {
    return this
  }
  update() {}
  succeed() {}
  fail() {}
  stop() {}
}

class TerminalSpinner implements Spinner {
  private text: string
  private interval?: ReturnType<typeof setInterval>
  private frame = 0
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

  constructor(text: string) {
    this.text = text
  }

  start() {
    this.render()
    this.interval = setInterval(() => {
      this.frame = (this.frame + 1) % this.frames.length
      this.render()
    }, 80)
    return this
  }

  update(text: string) {
    this.text = text
    if (this.interval) this.render()
  }

  succeed(text?: string) {
    this.stop()
    const msg = text ?? this.text
    process.stderr.write(`\r${pc.green('✓')} ${msg}\n`)
  }

  fail(text?: string) {
    this.stop()
    const msg = text ?? this.text
    process.stderr.write(`\r${pc.red('✗')} ${msg}\n`)
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = undefined
    }
    this.clearLine()
  }

  private render() {
    this.clearLine()
    const spinner = pc.cyan(this.frames[this.frame])
    process.stderr.write(`\r${spinner} ${this.text}`)
  }

  private clearLine() {
    process.stderr.write('\r\x1b[K')
  }
}

function truncate(str: string | undefined, len: number): string {
  if (str === undefined) return 'undefined'
  if (str.length <= len) return str
  return `${str.slice(0, len - 3)}...`
}

export function createUi(opts: Partial<UiOptions> = {}): Ui {
  return new Ui({ ...defaultUiOptions, ...opts })
}

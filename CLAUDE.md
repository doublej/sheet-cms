# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

sheet-cms syncs content bidirectionally between Google Sheets and local JSON files. It has two interfaces: a CLI (`src/cli.ts`) and an Elysia HTTP server (`src/server.ts`). The library API is exported from `src/index.ts`.

## Commands

Task runner: `just` (see Justfile). Package manager: `bun`.

| Command | Purpose |
|---------|---------|
| `just check` | Run all checks (loc-check + lint + typecheck + test) |
| `just test` | Run tests |
| `just lint-fix` | Auto-fix lint + format |
| `just typecheck` | `bunx tsc --noEmit` |
| `just dev` | Start dev server with watch (`tsx watch`) |
| `bun run vitest run src/foo.test.ts` | Run a single test file |

## Architecture

```
cli.ts ──────────┐
                  ├─→ sync/{pull,push,diff}.ts ──→ sheets/client.ts (Google API)
server.ts ───┐   │         │
  routes/    ─┘   │         ├─→ parser/{keyvalue,array}.ts + parser/path.ts
                  │         ├─→ merger.ts (deep merge with blacklist)
                  │         ├─→ io.ts (read/write JSON files)
                  │         └─→ validator.ts (push-time validation)
                  │
config/loader.ts ─┘  loads sheet-cms.config.{ts,js} → validates via config/schema.ts
```

**Two file types** (configured per-file in config):
- `keyvalue` — flat key-path/value pairs in sheet rows, parsed into nested JSON
- `array` — header row + data rows, parsed into a JSON array at a nested `arrayPath`

**Blacklist** (`blacklist/matcher.ts`): glob patterns (`*`, `[*]`, `**`) that protect paths from being overwritten during pull or exported during push.

**Validation** (`validator.ts`): rules checked on push — `startsWith`, `pattern`, `oneOf`, or `custom` function.

**Merger** (`merger.ts`): deep-merges sheet data into existing JSON, tracking `FieldChange[]` for reporting. Respects blacklist paths.

## Config

Loaded from `sheet-cms.config.ts` (or `.js`) in project root. Key fields: `spreadsheetId`, `credentialsPath`, `dataDir`, `files` (record of file name → `{type, arrayPath?}`), `blacklist`, `validation`.

**Config precedence**: env vars (`GOOGLE_CREDENTIALS_PATH`, `SHEET_CMS_SPREADSHEET_ID`) override config file values. If no config file exists, env vars are required. The `setup` command writes both `.env` and copies credentials to `google-credentials.json`.

## Conventions

- ES modules, strict TypeScript, Biome (not ESLint/Prettier)
- Single quotes, no semicolons, 2-space indent, 100 char line width
- Tests: `src/**/*.test.ts` (co-located), Vitest
- Env vars validated via `@t3-oss/env-core` + Zod in `src/env.ts`

See [agent.md](agent.md) for verify loop and agent boundaries.

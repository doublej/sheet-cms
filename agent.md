# sheet-cms

> Bidirectional sync between Google Sheets and local JSON files

## Stack

- TypeScript, Bun, Biome, Vitest
- CLI: Commander, HTTP server: Elysia
- Google Sheets API via `googleapis`

## Commands

Use `just` as the task runner:

- `just check` — run all checks (loc-check + lint + typecheck + test)
- `just loc-check` — check file lengths (warn >300, error >400 lines)
- `just dev` — start dev server with watch mode
- `just test` — run tests
- `just lint-fix` — auto-fix lint issues
- `just typecheck` — `bunx tsc --noEmit`

## Conventions

- ES modules (`"type": "module"`)
- Strict TypeScript config
- Biome for linting and formatting (not ESLint/Prettier)
- Single quotes, no semicolons, 2-space indent, 100 char line width

## Agent

### Verify Loop

Run after every change:

1. `just lint-fix`
2. `just typecheck`
3. `just test`

### Auto-fixable

- `bun run biome check --write src/` — auto-fix lint and format issues in one command

### Testing

- Test files: `src/**/*.test.ts` (co-located with source)
- Framework: Vitest
- Run a single test: `bun run vitest run src/foo.test.ts`

### Boundaries

- Do not run `just dev` or `just start` — never start the server
- Do not deploy or push
- Do not install ESLint or Prettier — this project uses Biome

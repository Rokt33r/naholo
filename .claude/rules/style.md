# Code Style

- Always use curly braces for if/else statements, even single-line bodies
- Always bind the error variable in catch blocks: `catch (error)`, never bare `catch {}`
- Always handle caught errors. If a specific error is expected to be skipped, narrow it with a conditional (e.g., `instanceof`, error code check) and rethrow / log everything else — never silently swallow with an empty catch or a catch-all skip
- Use explicit null checks: `== null` / `!= null`, not truthy/falsy (`!value` / `if (value)`)
- Always place Zod schemas right above their first usage, not at the top of the file
- Zod schemas are for **untrusted input** only (external data, user input, transcripts, API request bodies). Don't write schemas for data we produce ourselves — internal DTOs, accumulator types, stats shapes returned by our own code already have TS types; an extra runtime schema is just dead weight.
- Always place internal (non-exported) helpers at the **bottom** of a file, after all exported symbols. Exports lead so a reader sees the public surface first; helpers follow as implementation detail.
- Zod v4: use the namespaced `z.iso.*` / `z.email()` etc. instead of the deprecated string-method form (e.g. `z.iso.datetime()`, not `z.string().datetime()`; `z.iso.date()`, not `z.string().date()`)
- Icon size: use `size-4` for all icons. Use `size-7` for square icon buttons (`size='icon'`)
- Drizzle queries: prefer `db.query.{table}.findMany(...)` / `findFirst(...)` over `db.select().from(...)`. The relational query API supports `where`, `orderBy`, `limit`, `offset`, and `with` for relations — reach for `db.select()` only when relational queries genuinely cannot express what you need (e.g., aggregate-only selects). For counts, prefer `db.$count(table, where)` over `db.select({ count: count() })`.
- Drizzle schema IDs: indexed primary-key `id` columns use `uuidV7IdColumn()` from `src/server/db/schema-helpers.ts` (generates UUID v7 via `$defaultFn`) instead of `uuid('id').primaryKey().defaultRandom()`. Non-indexed random UUIDs (tokens, secrets, opaque codes) may stay on `defaultRandom()` or use their own generator — the v7 rule applies only to indexed primary keys.
- Identifier names must be explicit in their context — singular for items, plural for arrays, `*Map` suffix for keyed lookups (Map or Record) — but no longer than they need to be. Anti-examples: `m`, `pm`, `perModel` used as an array (no list-ness), `bySkill` (says how it's keyed but not what's inside). Preferred: `modelUsage` (item), `modelUsages` (array), `modelUsageMap` (map keyed by model), `skillModelUsagesMap` (record/map of model-usages keyed by skill).

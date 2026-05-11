# Code Style

- Always use curly braces for if/else statements, even single-line bodies
- Always bind the error variable in catch blocks: `catch (error)`, never bare `catch {}`
- Always handle caught errors. If a specific error is expected to be skipped, narrow it with a conditional (e.g., `instanceof`, error code check) and rethrow / log everything else — never silently swallow with an empty catch or a catch-all skip
- Use explicit null checks: `== null` / `!= null`, not truthy/falsy (`!value` / `if (value)`)
- Always place Zod schemas right above their first usage, not at the top of the file
- Zod v4: use the namespaced `z.iso.*` / `z.email()` etc. instead of the deprecated string-method form (e.g. `z.iso.datetime()`, not `z.string().datetime()`; `z.iso.date()`, not `z.string().date()`)
- Icon size: use `size-5` for all icons. Use `size-7` for square icon buttons (`size='icon'`)
- Drizzle queries: prefer `db.query.{table}.findMany(...)` / `findFirst(...)` over `db.select().from(...)`. The relational query API supports `where`, `orderBy`, `limit`, `offset`, and `with` for relations — reach for `db.select()` only when relational queries genuinely cannot express what you need (e.g., aggregate-only selects). For counts, prefer `db.$count(table, where)` over `db.select({ count: count() })`.
- Drizzle schema IDs: indexed primary-key `id` columns use `uuidV7IdColumn()` from `src/server/db/schema-helpers.ts` (generates UUID v7 via `$defaultFn`) instead of `uuid('id').primaryKey().defaultRandom()`. Non-indexed random UUIDs (tokens, secrets, opaque codes) may stay on `defaultRandom()` or use their own generator — the v7 rule applies only to indexed primary keys.

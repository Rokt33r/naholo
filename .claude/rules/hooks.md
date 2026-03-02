---
paths:
  - 'src/hooks/**/*.ts'
---

# Hook Conventions

- React Query for all server state
- Every mutation uses optimistic updates with rollback on error
- Stale time: 1 minute
- Temp IDs prefixed with `temp-` for optimistic creates
- Export named types alongside hooks (e.g., `export type Task = { ... }`)

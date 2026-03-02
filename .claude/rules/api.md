---
paths:
  - 'src/app/api/**/*.ts'
---

# API Route Conventions

- Validate request body with Zod
- Auth check via `getSessionFromRequest()`
- Return JSON with appropriate status codes
- Follow REST conventions: GET (list/read), POST (create), PATCH (update), DELETE

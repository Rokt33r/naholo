---
paths:
  - 'src/server/services/**/*.ts'
---

# Service Conventions

- Pure business logic, no HTTP concerns
- Accept `projectWorkerId` as first param for auth scoping
- Use Drizzle query builder, not raw SQL
- Position management: atomic SQL increment/decrement
- Return plain objects, not Drizzle row types

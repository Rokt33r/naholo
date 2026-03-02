---
paths:
  - 'src/components/**/*.tsx'
---

# Component Conventions

- One component per file, named export matching filename
- Use `cn()` from `@/lib/utils` for conditional classNames
- Keyboard event handlers: `handle[Element]KeyDown` (e.g., `handleRowKeyDown`)
- Focus management via refs + `requestAnimationFrame` after DOM changes
- Animations: CSS grid-rows transition, not JS-based
- Never use recursive component rendering for tree structures — flatten with depth

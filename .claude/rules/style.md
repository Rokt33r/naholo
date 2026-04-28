# Code Style

- Always use curly braces for if/else statements, even single-line bodies
- Always bind the error variable in catch blocks: `catch (error)`, never bare `catch {}`
- Always handle caught errors. If a specific error is expected to be skipped, narrow it with a conditional (e.g., `instanceof`, error code check) and rethrow / log everything else — never silently swallow with an empty catch or a catch-all skip
- Use explicit null checks: `== null` / `!= null`, not truthy/falsy (`!value` / `if (value)`)
- Always place Zod schemas right above their first usage, not at the top of the file
- Icon size: use `size-5` for all icons. Use `size-7` for square icon buttons (`size='icon'`)

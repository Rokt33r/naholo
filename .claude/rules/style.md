# Code Style

- Always use curly braces for if/else statements, even single-line bodies
- Always bind the error variable in catch blocks: `catch (error)`, never bare `catch {}`
- Use explicit null checks: `== null` / `!= null`, not truthy/falsy (`!value` / `if (value)`)
- Always place Zod schemas right above their first usage, not at the top of the file
- Icon size: use `size-5` for all icons. Use `size-7` for square icon buttons (`size='icon'`)

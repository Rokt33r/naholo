# Code Style

- Always use curly braces for if/else statements, even single-line bodies
- Always bind the error variable in catch blocks: `catch (error)`, never bare `catch {}`
- Use explicit null checks: `== null` / `!= null`, not truthy/falsy (`!value` / `if (value)`)

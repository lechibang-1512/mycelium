---
trigger: always_on
---

# Code Style Rules

## JavaScript/Node.js

1. Use `const` by default, `let` only when reassignment is needed
2. Use async/await instead of .then() chains
3. Use template literals for string interpolation
4. Use arrow functions for callbacks
5. Destructure objects and arrays when possible

## Mongoose Patterns

1. Always use `.lean()` for read-only queries (returns plain objects)
2. Use `findByIdAndUpdate` with `{ new: true }` to return updated doc
3. Use static methods on schemas, not instance methods for service logic
4. Always handle null results (doc not found)

## Express Routes

1. Export factory function that returns router
2. Use async handlers with try/catch/next
3. Always return `{ success: true/false, data/message }`
4. Use appropriate HTTP status codes (200, 201, 400, 404, 500)

## React

1. Use functional components with hooks
2. Use React Query for server state
3. Use AuthContext for permissions
4. Handle loading and error states in all pages

## File Naming

- Backend services: `PascalCase.js` (e.g., `InventoryService.js`)
- Backend routes: `kebab-case.js` (e.g., `customer-invoices.js`)
- React pages: `PascalCase.jsx` (e.g., `InventoryPage.jsx`)
- Test files: `*.test.js`

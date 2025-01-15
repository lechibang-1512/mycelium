---
trigger: always_on
---

# Safety: Input Validation & Error Handling

## Input Validation & Injection Prevention

- **All** user-facing API inputs must be validated before use (type, length, format).
- **Never** use string concatenation (`+`), template literals (`` ` ``), or `util.format` to build SQL queries with user input. Always use `?` parameter placeholders.
- **Never** pass raw `req.body`, `req.params`, or `req.query` values directly into SQL without validation.

### Specific Validation Patterns

| Input Source | Validation Required |
|-------------|-------------------|
| `req.params.id` | Must validate as integer or UUIDv7 before use |
| `req.query.page` / `req.query.limit` | Must parse as positive integer with upper bound |
| `req.body` (any) | Must validate required fields exist and have correct types |
| Table/column names from user input | Must pass `isValidIdentifier()` check |

- Sanitise all output through `SanitizationService.convertBigIntToNumber()` before JSON serialization.
- Use the project's custom error classes for validation failures — never return raw `Error` objects to clients.

---

## Error Class Contract

The project defines 5 error classes in `/media/lechibang/Work and play/Work/mycelium/backend/utils/errors.js`. **Always** use the correct class:

| HTTP Status | Error Class | When to Use |
|------------|-------------|-------------|
| 400 | `ValidationError` | Invalid input, malformed request body, missing required fields |
| 404 | `NotFoundError` | Resource not found by ID/key |
| 409 | `ConflictError` | Duplicate key, already-exists, state conflict |
| 422 | `CapacityError` | Warehouse zone capacity exceeded |
| 422 | `InsufficientStockError` | Not enough inventory for operation |

### Rules

- **Never** throw raw `new Error('...')` in service methods — always use a custom error class.
- **Never** create new error classes without extending `Error` and setting both `this.name` and `this.statusCode`.
- **Never** use `res.status(4xx).json(...)` directly in service code — throw the appropriate error class and let `errorHandler.js` handle the response.
- If a new HTTP status is needed, create a new class in `/media/lechibang/Work and play/Work/mycelium/backend/utils/errors.js`, add handling in `/media/lechibang/Work and play/Work/mycelium/backend/middleware/errorHandler.js`, and inform the user.

---

## Error Handler Integrity

- **Never** modify `/media/lechibang/Work and play/Work/mycelium/backend/middleware/errorHandler.js` to return stack traces unconditionally. The `process.env.NODE_ENV === 'development'` gate must remain on all `details` fields.
- **Never** remove or bypass the global error handler — it must always be the **last** middleware in `/media/lechibang/Work and play/Work/mycelium/backend/server.cjs`.
- **Never** add response fields outside the standard `{ error, message, details }` envelope.
- **Never** add empty `catch` blocks (`catch(e) {}`) — at minimum log the error with `console.error`.
- **Never** swallow promise rejections — always `await` or `.catch()` every promise.

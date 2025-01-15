---
trigger: always_on
---

# Safety: Server Entry-Point & Route Registration

## Server Entry-Point Protection

`/media/lechibang/Work and play/Work/mycelium/backend/server.cjs` has a **critical middleware ordering**. The following order must be preserved:

| # | Layer | Notes |
|---|-------|-------|
| 1 | `dotenv.config()` | Must be first |
| 2 | Global error handlers (`unhandledRejection`, `uncaughtException`) | Before any middleware |
| 3 | Request logging | File-based, skips noisy endpoints |
| 4 | `setupMiddleware(app)` → Helmet, body parsing, CORS, rate limiters | Via `/media/lechibang/Work and play/Work/mycelium/backend/middleware/setupMiddleware.js` |
| 5 | Static files (`express.static`, favicon) | Before auth |
| 6 | Cookie parser | Before auth (needed for `session_id`) |
| 7 | Pre-auth routes (audit, reports, receipts) | Intentionally unauthenticated |
| 8 | `authMiddleware` | Session validation gate via `createAuthMiddleware` |
| 9 | Main routes (`routes/index`) | All protected routes |
| 10 | React SPA fallback | Serves `dist/index.html` |
| 11 | `notFoundHandler` | |
| 12 | `errorHandler` | **Must be last** |

- **Never** mount a new route after `errorHandler` or before `setupMiddleware`.
- **Never** remove or disable `helmet()`, `cors()`, or `rateLimit()` middleware.
- When adding new routes, place them in the correct position relative to `authMiddleware`.

---

## Route Registration Safety

### asyncHandler Requirement

- **All** async route handlers must be wrapped with `asyncHandler` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/asyncHandler.js`. Bare `async (req, res) => {}` handlers will silently swallow promise rejections.

```javascript
// ✅ CORRECT
router.get('/', asyncHandler(async (req, res) => { ... }));

// ❌ WRONG — unhandled rejections
router.get('/', async (req, res) => { ... });
```

### Route File Structure

- Every route file must import `asyncHandler`:
  ```javascript
  const asyncHandler = require('../utils/asyncHandler');
  ```
- **Never** define route handlers inline in `/media/lechibang/Work and play/Work/mycelium/backend/server.cjs` — always create a dedicated route file in `/media/lechibang/Work and play/Work/mycelium/backend/routes/`.
- **Never** register routes inside `/media/lechibang/Work and play/Work/mycelium/backend/routes/index.js` without ensuring they are mounted after auth middleware (unless intentionally public).

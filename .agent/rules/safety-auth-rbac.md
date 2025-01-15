---
trigger: always_on
---

# Safety: Auth & RBAC Integrity

## Protected Files

The following files must not be weakened, bypassed, or have security logic removed without explicit user review:

| File | Purpose |
|------|---------|
| `/media/lechibang/Work and play/Work/mycelium/backend/middleware/authMiddleware.js` | Session validation, `req.user` population, `createAuthMiddleware`, `requireAuth` |
| `/media/lechibang/Work and play/Work/mycelium/backend/services/AuthService.js` | Login, session creation, password hashing, session validation |

## Auth Model

- Authentication is **session-based** with secure cookies (`session_id`).
- `createAuthMiddleware({ excludePaths })` in `/media/lechibang/Work and play/Work/mycelium/backend/middleware/authMiddleware.js` creates the middleware that validates sessions and populates `req.user`.
- `requireAuth` middleware enforces that `req.user` is present on specific routes.
- There is **no role or permission-based access control** — all authenticated users have equal access to protected routes.

## Route Guards

- **Never** add API routes that skip `authMiddleware` unless they are explicitly meant to be public (current public paths: `/api/auth/login`, `/api/auth/logout`, `/api/health`, `/api/receipts/*`, `/favicon.ico`).
- **Never** weaken `requireAuth` guards on existing routes.
- **Never** expose user password hashes, session tokens, or internal auth data in API responses.
- Pre-auth routes (audit, reports, receipts) are mounted before `authMiddleware` in `/media/lechibang/Work and play/Work/mycelium/backend/server.cjs` — do not move them after auth without user approval.
- When adding new routes that should be protected, ensure they are mounted **after** the `authMiddleware` call in `server.cjs` or registered in `/media/lechibang/Work and play/Work/mycelium/backend/routes/index.js`.

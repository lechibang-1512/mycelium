---
trigger: always_on
---

# Safety: CORS, File System, Dependencies & Build Gate

## CORS & Security Headers

- **Never** set `origin: '*'` or `origin: true` in CORS config for production.
- **Never** add `'unsafe-eval'` to CSP `scriptSrc`.
- **Never** remove or weaken any Helmet directive in `/media/lechibang/Work and play/Work/mycelium/backend/middleware/setupMiddleware.js`.

### Locked Directives (current values)

| Directive | Current Value | Notes |
|-----------|--------------|-------|
| `defaultSrc` | `'self'` | No external scripts/styles by default |
| `styleSrc` | `'self'`, `'unsafe-inline'`, Google Fonts | Inline styles needed for Bootstrap |
| `fontSrc` | `'self'`, Google Fonts, `data:` | |
| `scriptSrc` | `'self'`, `'unsafe-inline'` | **Never** add `'unsafe-eval'` |
| `imgSrc` | `'self'`, `data:`, `blob:` | |
| `connectSrc` | `'self'` | |
| `crossOriginEmbedderPolicy` | `false` | Intentional — needed for external fonts |
| `crossOriginResourcePolicy` | `same-origin` | |

- **Never** change rate-limit `max` values in `/media/lechibang/Work and play/Work/mycelium/backend/middleware/setupMiddleware.js` without user approval.
- When adding new frontend origins, add them only to the development block (the `NODE_ENV !== 'production'` check), not to the base `allowedOrigins` array.

---

## File System Safety

- **Never** run `rm -rf` on any path outside the project directory.
- **Never** write files outside the project root unless explicitly instructed by the user.
- **Never** delete `node_modules/`, `dist/`, or `package-lock.json` unless the user explicitly asks for a clean reinstall.
- **Never** modify or delete files in `/media/lechibang/Work and play/Work/mycelium/public/uploads/` without user approval — these contain user-uploaded business data.
- When creating backup files, place them in the `/media/lechibang/Work and play/Work/mycelium/backups/` directory.

---

## Dependency Safety

- **Never** run `npm install <package>` without first telling the user what package is being added and why.
- Prefer well-maintained packages with active communities. Avoid packages with no recent commits or known vulnerabilities.
- After installing any new dependency, run `npm audit` and report any new vulnerabilities.
- **Never** add `--force` or `--legacy-peer-deps` to npm commands without user approval and an explanation of why it's needed.
- Use `npm run knip` to check for unused dependencies after removing code.

---

## Production Build Gate

- After **any** code change (frontend or backend), run `npm run build` and confirm exit code 0.
- After any code change that could affect linting, run `npm run lint`.
- **Never** mark a task as complete if the build is failing.
- **Never** modify `/media/lechibang/Work and play/Work/mycelium/backend/config/vite.config.mjs` build settings without user approval.
- **Never** add `// @ts-ignore`, `/* eslint-disable */`, or similar suppression comments to hide real errors.

---

## Enforcement Summary

| Severity | Action | Examples |
|----------|--------|----------|
| 🔴 **BLOCK** | Must stop and ask user | Destructive DDL, secret exposure, auth bypass, CORS `origin: '*'`, pool config changes, permission hierarchy changes |
| 🟡 **WARN** | Inform user, await confirmation | New dependencies, middleware reordering, CSP changes, new error classes, rate-limit changes |
| 🟢 **AUTO** | Run automatically | Build check, lint check, secret scan, asyncHandler coverage scan, raw pool access scan |

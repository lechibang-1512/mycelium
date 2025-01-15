---
name: Security Hardening & Auditing
description: Instructions for checking dependencies and securing the Mycelium application against common web attacks.
---

# Skill: Security Hardening

Use this skill when tasked with improving the security posture of the application or reviewing pull requests for security vulnerabilities.

## 1. Dependency Analysis
- **Action**: Run `npm run safety` and verify its output.
- **Action**: Run `npm audit`. Identify vulnerabilities targeting backend APIs or exposed frontend libraries. Do not blindly ignore vulnerabilities.
- If upgrading a dependency to fix a vulnerability, verify downstream compatibility with the `mycelium` stack (Express, MariaDB, Sequelize).

## 2. Header and Setup Verification
- Use `view_file` to scrutinize `/media/lechibang/Work and play/Work/mycelium/backend/middleware/setupMiddleware.js`.
- Check if `helmet()` is applied globally.
- Ensure the `Content-Security-Policy` limits script sources to `'self'` and `'unsafe-inline'` without resorting to `'unsafe-eval'`.

## 3. Route Guard Validation
- Cross-reference the application routes `/media/lechibang/Work and play/Work/mycelium/backend/routes/index.js` against the exclusion paths in `createAuthMiddleware()`. 
- Ensure high-privilege endpoints (like user creation, inventory mutation) are absolutely guarded by `authMiddleware`.
- Verify that `authMiddleware` correctly populates `req.user` and that its session handling validates existing sessions.

## 4. Injection Checks (SQL & XSS)
- Run `grep_search` for `.query(` inside `backend/services/` to verify all dynamic parameters are passed as array bindings (e.g., `[var1, var2]`) and not string concatenated.
- Search for dynamic identifiers (e.g., `ORDER BY ${column}`) and ensure they are parsed against `isValidIdentifier()`.
- Run a search across frontend `/media/lechibang/Work and play/Work/mycelium/frontend/` for `dangerouslySetInnerHTML`. If found, ensure data passed to it is tightly controlled and not derived from unverified DB rows.

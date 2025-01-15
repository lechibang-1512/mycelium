# Security Hardening Rules

These rules enforce advanced security best practices for Mycelium ERP. They heavily reinforce existing infrastructure safety rules but focus on proactive hardening against common attack vectors.

## 1. Helmet & Headers
- **Never** disable Helmet middleware inside `/media/lechibang/Work and play/Work/mycelium/backend/middleware/setupMiddleware.js`.
- **Never** weaken HTTP response headers, especially `Strict-Transport-Security`, `X-Content-Type-Options`, or `X-Frame-Options`.
- Content Security Policy (CSP): Do not add `'unsafe-eval'` to `scriptSrc`, and limit `imgSrc` and `connectSrc` strictly to authorized domains. If the frontend connects to new APIs, explicitly whitelist them.

## 2. SQL Injection Prevention
- **Always** validate incoming identifiers (table names, column names) via `isValidIdentifier()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js`.
- **Never** concatenate or append user inputs directly into SQL queries. Always use explicit `?` parameterized bindings provided by `withConnection()` or `withTransaction()`.

## 3. Cross-Site Scripting (XSS) Prevention
- In the React frontend, **never** use `dangerouslySetInnerHTML` unless rendering explicitly sanitized HTML (e.g., using `DOMPurify`).
- Ensure all unstructured string data retrieved from the backend is rendered as standard text (`{data.field}`), letting React perform automatic escaping.

## 4. Dependencies and Automation
- Always review additions to the `package.json`. Avoid installing generic or unmaintained dependencies.
- **Always** run `npm audit` after installing a new package. If high or critical vulnerabilities exist, they must be resolved before proceeding.
- Validate `package-lock.json` modifications and never force-resolve dependencies with `--force` or `--legacy-peer-deps` unless absolutely required.

## 5. Broken Access Control and Session Integrity
- **Never** expose raw unhashed passwords, user configuration tokens, or internal session details (like `session_id` cookies) in JSON API responses.
- Ensure that the path exclusion definitions in `createAuthMiddleware()` do not inadvertently expose protected administrative routes. Unauthenticated routes (`/api/auth/login`, `/api/health`, `/api/receipts/*`) must be explicitly white-listed, not dynamically calculated based on weak URL substring matches.

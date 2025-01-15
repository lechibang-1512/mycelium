---
description: Pre-commit safety gatecheck — run before completing any task to verify build, lint, and security invariants
---

# Pre-Commit Safety Gatecheck

Run this workflow as the **final step** of any task that modifies code. All gates must pass before marking the task as complete.

---

## Gate 1: Build Verification

// turbo
Run the production build and verify it exits cleanly:

```bash
npm run build
```

- **PASS**: Exit code 0, no errors in output.
- **FAIL**: Fix all build errors before proceeding. Do not suppress with `--force` or ignore flags.

---

## Gate 2: Lint Check

// turbo
Run the linter and verify no new violations:

```bash
npm run lint
```

- **PASS**: Exit code 0, or only pre-existing warnings (no new errors).
- **FAIL**: Run `npm run lint:fix` first, then manually fix remaining issues.

---

## Gate 3: Secret Scan

// turbo
Scan tracked files for accidentally hardcoded secrets:

```bash
grep -rn --include='*.js' --include='*.jsx' --include='*.cjs' --include='*.mjs' --include='*.json' -E "(password|secret|token|api_key|apikey|api-key)\s*[:=]\s*['\"][^'\"]{8,}" /media/lechibang/Work\ and\ play/Work/mycelium/backend/ /media/lechibang/Work\ and\ play/Work/mycelium/frontend/ --color=never | grep -vi "example\|placeholder\|your_\|process\.env\|\.env\." || echo "✅ No hardcoded secrets found"
```

- **PASS**: Only `✅ No hardcoded secrets found` or only hits inside `.env.example`, test fixtures, or comments explaining the pattern.
- **FAIL**: Remove any real credentials immediately and rotate them.

---

## Gate 4: Dangerous SQL Scan

// turbo
Scan for potentially destructive SQL patterns:

```bash
grep -rn --include='*.js' --include='*.cjs' --include='*.mjs' -i -E "(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+|DELETE\s+FROM\s+\w+\s*$|DELETE\s+FROM\s+\w+\s*;)" /media/lechibang/Work\ and\ play/Work/mycelium/backend/ --color=never || echo "✅ No dangerous SQL patterns found"
```

- **PASS**: No matches, or matches are inside comments / safely guarded migration scripts.
- **FAIL**: Ensure all destructive operations have explicit `WHERE` clauses and user approval.

---

## Gate 5: Auth Bypass Scan

// turbo
Scan for patterns that might bypass authentication:

```bash
grep -rn --include='*.js' --include='*.cjs' --include='*.mjs' -E "(auth.*skip|bypass.*auth|middleware.*disable|requireAuth.*false|excludePaths.*\*)" /media/lechibang/Work\ and\ play/Work/mycelium/backend/ --color=never | grep -vi "test\|spec\|mock\|comment\|// " || echo "✅ No auth bypass patterns found"
```

- **PASS**: No unexpected matches. Known exclusions (`/api/auth/*`, `/api/health`) are acceptable.
- **FAIL**: Review any new auth exclusions with the user before proceeding.

---

## Gate 6: Error Swallowing Scan

// turbo
Scan for empty catch blocks that silently swallow errors:

```bash
grep -rn --include='*.js' --include='*.cjs' --include='*.mjs' -P "catch\s*\([^)]*\)\s*\{\s*\}" /media/lechibang/Work\ and\ play/Work/mycelium/backend/ /media/lechibang/Work\ and\ play/Work/mycelium/frontend/ --color=never || echo "✅ No empty catch blocks found"
```

- **PASS**: No empty catch blocks.
- **FAIL**: Add at minimum `console.error(err)` inside each catch block.

---

## Gate 7: asyncHandler Coverage

// turbo
Scan for async route handlers not wrapped in `asyncHandler`:

```bash
grep -rn --include='*.js' --include='*.cjs' -E "router\.(get|post|put|delete|patch)\(" /media/lechibang/Work\ and\ play/Work/mycelium/backend/routes/ --color=never | grep -v "asyncHandler" | grep -v "^Binary" || echo "✅ All async route handlers use asyncHandler"
```

- **PASS**: Only `✅ All async route handlers use asyncHandler` or only non-async handlers (rare).
- **FAIL**: Wrap each bare `async (req, res) => {}` handler with `asyncHandler()`.

---

## Gate 8: Raw Pool Access Scan

// turbo
Scan for direct `pool.query()` or `pool.getConnection()` calls outside the permitted file:

```bash
grep -rn --include='*.js' --include='*.cjs' --include='*.mjs' -E "pool\.(query|getConnection)\(" /media/lechibang/Work\ and\ play/Work/mycelium/backend/ --color=never | grep -v "queryHelper\.js" | grep -v "database\.js" | grep -v "node_modules" || echo "✅ No raw pool access found"
```

- **PASS**: Only `✅ No raw pool access found`.
- **FAIL**: Replace raw `pool.query()` with `withConnection()` / `withTransaction()` from the query helper.

---

## Summary Report

After running all gates, report results to the user:

```
🔒 Pre-Commit Safety Report
─────────────────────────────
Gate 1 — Build:              ✅ / ❌
Gate 2 — Lint:               ✅ / ❌
Gate 3 — Secret Scan:        ✅ / ❌
Gate 4 — SQL Safety:         ✅ / ❌
Gate 5 — Auth Bypass:        ✅ / ❌
Gate 6 — Error Handling:     ✅ / ❌
Gate 7 — asyncHandler:       ✅ / ❌
Gate 8 — Raw Pool Access:    ✅ / ❌
─────────────────────────────
Overall: PASS / FAIL
```

**If any gate fails, the task is NOT complete.** Fix the issues and re-run the failing gates.

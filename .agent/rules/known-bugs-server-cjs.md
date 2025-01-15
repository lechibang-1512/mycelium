
# Known Bugs & Gotchas: backend/server.cjs

## 1. Favicon 404

**Symptom:** `GET /favicon.ico → 404 Not Found` in browser console.

**Cause:** The explicit `GET /favicon.ico` route was pointing to `'../public/favicon.ico'` but the `/public/` directory does not exist.

**Fix:** Serve the favicon from the Vite build output directory (`dist/favicon.ico`), with a graceful 204 fallback:

```javascript
const distPath = path.join(__dirname, '../dist');
app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(distPath, 'favicon.ico');
    if (fs.existsSync(faviconPath)) {
        res.sendFile(faviconPath);
    } else {
        res.status(204).end();
    }
});
```

> The favicon asset lives in `frontend/assets/` and is copied to `dist/` by Vite during build.
> Do NOT create a `/public/favicon.ico` to "fix" this — static middleware for `/public/` exists but the directory contains only `style.css`.

---

## 2. Duplicate Pre-Auth Route Registration

**Symptom:** Audit and reports endpoints run their handlers twice per request, producing duplicate log entries.

**Cause:** `auditRoutes` and `reportRoutes` were registered twice in the original code:

```javascript
// ❌ Bug — both lines were duplicated
app.use('/api/audit', auditRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);    // duplicate
app.use('/api/reports', reportRoutes); // duplicate
```

**Fix:** Register each route exactly once.

---

## 3. CSS Bad Selector Warning (Firefox)

**File:** `backend/public/style.css`

**Symptom:** Browser console shows:
```
Ruleset ignored due to bad selector. style.css:715:27
```

**Cause:** Firefox does not support `::-webkit-scrollbar-*` pseudo-elements and emits a warning for any ruleset using them.

**Fix:** Wrap all `::-webkit-scrollbar` rules in an `@supports selector()` block so Firefox silently skips them:

```css
@supports selector(::-webkit-scrollbar) {
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #f1f1f1; }
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
    }
}
```

---

## 4. Double `/api/auth/me` 401 (Not a Bug)

**Symptom:** Console shows two `GET /api/auth/me → 401 Unauthorized` on initial page load.

**Cause:** React Query calls `/api/auth/me` to check session state on mount. The 401 is correct when no session exists. The double call is React StrictMode double-invoking effects in development.

**Action:** Do not suppress or work around this — it is expected behavior. The 401 simply means the user is not yet authenticated.

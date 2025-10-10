# Test scripts and how to run them

This document documents the test scripts in this repository, how to run them locally and in CI, and common troubleshooting steps. The project's npm scripts are defined in `package.json` and are the recommended entry points.

Notes:
- All documented scripts live in the `scripts/` directory.
- Most scripts use `scripts/utils-project-root.js` to detect the project root and load environment variables so they can be executed from any subdirectory. Running from the project root is still recommended.

## How to run tests (quick)

1. Verify environment variables:

```bash
npm run verify-env
```

2. (Optional) Set up databases and create an admin user (required for DB-dependent tests):

```bash
npm run setup
```

3. Start the server if you plan to run server-dependent tests:

```bash
npm run dev
```

4. Run the full test suite or the quick mode:

```bash
npm test
npm run test:quick
```

## Common npm test scripts

- `npm test` — runs `node scripts/run-all-tests.js` (full suite)
- `npm run test:quick` — runs `run-all-tests.js --quick` (essential tests)
- `npm run test:no-server` — skip server-dependent tests (CI-friendly)
- `npm run test:independence` — verify directory independence
- `npm run test-admin` — run `scripts/test-admin-login.js`
- `npm run test-csrf` — run `scripts/test-csrf.js`
- `npm run test-user-creation` — run `scripts/test-user-creation.js`
- `npm run test-warehouse` — run `scripts/test-warehouse.js`
- `npm run test-db-schema` — run `scripts/test-db-schema-issues.js`

Use `npm run` to see all available scripts.

## Server-dependent tests

The following tests require the app server to be running (default localhost:3000 unless overridden in env):

- `test-csrf.js`
- `test-admin-login.js`
- `test-inactive-login.js`
- `test-user-creation.js`

Tip: If running in CI, prefer `npm run test:no-server` or start the server in the background and ensure it is healthy before running server tests.

## Database-dependent tests

These tests require the test databases to be created and reachable using credentials from your environment configuration:

- `test-warehouse.js`
- `setup-databases.js`
- `create-admin-user.js`

If in CI, create a throwaway database user and run `npm run setup` before tests.

## Key scripts (what they do)

- `scripts/utils-verify-env.js` — verifies required env variables, types, and placeholders
- `scripts/setup-databases.js` — creates databases, loads schema files from `sql/`, inserts seed data
- `scripts/create-admin-user.js` — creates an initial admin account using secure prompts or environment-provided credentials
- `scripts/run-all-tests.js` — orchestrates and runs the selected set of test scripts. Supports `--quick`, `--no-server`, `--verbose` flags
- `scripts/test-directory-independence.js` — runs a subset of scripts from multiple directories to ensure root detection works

## Example workflows

Run essential tests locally (fast):

```bash
npm run verify-env
npm run dev               # start server in another terminal
npm run test:quick
```

Run full tests locally (may require DB and server):

```bash
npm run verify-env
npm run setup
npm run create-admin      # optional interactive creation
npm run dev &             # start server in background (or in another terminal)
npm test
```

CI example (skip server tests):

```bash
# in CI pipeline
npm ci
npm run verify-env
npm run test:no-server
```

## Troubleshooting

- "Cannot find module": Ensure the script invokes `utils-project-root.js` or run from project root.
- Environment variable errors: Confirm required variables with `npm run verify-env` and set required `.env` files.
- Server tests failing: Start server with `npm run dev` and verify it is accepting connections on the configured port.
- Database errors: Ensure credentials are correct and run `npm run setup` to create schemas.

## Adding new tests

1. Put new test script under `scripts/`.
2. Use `utils-project-root.js` to load env and detect project root.
3. Add an npm script in `package.json`.
4. Add the script to `scripts/run-all-tests.js` orchestration.
5. Update this document with usage and dependencies.

---

Last updated: 2025-10-10


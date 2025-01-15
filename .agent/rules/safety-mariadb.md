---
trigger: always_on
---

# Safety: MariaDB — Mutations, Pool & Transactions

## Mutation Guards

- **Destructive DDL** (`DROP TABLE`, `DROP DATABASE`, `TRUNCATE`, `ALTER TABLE DROP COLUMN`) requires **explicit user approval** before execution. State exactly what will be lost.
- **Bulk DML** (`DELETE FROM` without `WHERE`, `UPDATE` without `WHERE`) is **forbidden** — always include a `WHERE` clause.
- Before running any schema change, show the exact SQL to the user and wait for approval.
- Always verify the target database (`master_db` vs `security_db`) before executing.
- Per project rules: use the MariaDB CLI (`lechibang / 1212`) to check schema — never create `.sql` files.

### Query Construction

- **Always** use `?` parameter placeholders via `withConnection()` / `withTransaction()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js`. Never concatenate or template-literal user input into SQL strings.
- **Always** validate dynamic table/column names with `isValidIdentifier()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js` before interpolation. Raw string interpolation of identifiers is forbidden without this check.
- **Never** call `pool.query()` or `pool.getConnection()` directly in service or route files — always go through `withConnection()` or `withTransaction()`.
- The only file permitted to call `pool.getConnection()` directly is:
  - `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js`

---

## Connection & Pool Safety

- **Never** change `connectionLimit`, `acquireTimeout`, `connectTimeout`, `timeout`, `idleTimeout`, `minimumIdle`, or `leakDetectionTimeout` in `/media/lechibang/Work and play/Work/mycelium/backend/config/database.js` without explicit user approval. State the current value and proposed value.
- **Never** create a second connection pool. The single pool exported from `/media/lechibang/Work and play/Work/mycelium/backend/config/database.js` is the only pool.
- **Never** modify `bigIntAsNumber: true` — removing this silently breaks JSON serialization across the entire API.

---

## Transaction Integrity

- For **multi-step write operations** (insert + update, cross-table writes, inventory movements), always use `withTransaction()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js`.
- **Never** remove or weaken the `finally { conn.release() }` pattern in the transaction helper.
- **Never** hold a transaction open while performing external I/O (HTTP calls, file reads). Complete the I/O first, then transact.

# Memory Leakage Prevention Rules

These rules enforce strict memory management practices across both the frontend React application and the backend Express.js/MariaDB services to prevent memory leaks, connection exhaustion, and degradation of performance.

## 1. Database Connections & Pools
- **Never** leave a database connection unreleased.
- **Always** use `withConnection()` or `withTransaction()` from `/media/lechibang/Work and play/Work/mycelium/backend/utils/queryHelper.js`. These wrappers guarantee that `conn.release()` is called in a `finally` block.
- **Never** create ad-hoc database pools or connections. Only use the exported single pool from `/media/lechibang/Work and play/Work/mycelium/backend/config/database.js`.
- If a method requires interacting with multiple tables, use the `withTransaction` wrapper, but **Never** hold a transaction open while performing long-running external I/O operations (e.g., waiting for an HTTP API response or reading a large local file). Complete I/O first, then begin the transaction.

## 2. Event Listeners
- **Frontend (React)**: If you attach an event listener to the `window`, `document`, or a DOM node within a `useEffect`, you **must** return a cleanup function that calls `removeEventListener`.
- **Backend (Node.js)**: Avoid attaching excessive `.on()` listeners to long-lived objects like `process` or standard global emitters without a corresponding `.off()` or `.removeListener()`. Prefer `.once()` if an event only needs to be handled a single time.

## 3. Closures and Scope
- Be wary of unintended closures over large datasets. E.g., capturing a massive array inside a callback function that is passed to a long-lived object will prevent the array from being garbage collected.
- Avoid storing temporary business data indefinitely in global variables (`global`, `window`) or module-level variables unless strictly necessary for caching. 
- If implementing an in-memory cache, **always** include a mechanism for bounding its size (e.g., an LRU cache) and a TTL (Time-To-Live).

## 4. Promises and Async Generators
- Ensure all promises resolve or reject. A completely stalled promise chain can sometimes lead to context leaks if it holds references to broad scopes.
- Ensure that async generators are properly exited using `break` or `return` when iterating using `for await...of`, so their internal state can be garbage collected.

## 5. React Specifics
- Always clear intervals (`setInterval`) and timeouts (`setTimeout`) in `useEffect` cleanup functions.
- If making an API request in a `useEffect` and the component unmounts before it resolves, ensure you use an `AbortController` or a boolean flag (`isMounted`) to prevent calling state setter functions on unmounted components (which causes memory leak warnings in React).

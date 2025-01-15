---
name: Memory Leakage Diagnostics
description: Instructions for identifying, preventing, and fixing memory leaks in Node.js and React applications.
---

# Skill: Identifying & Fixing Memory Leaks

When a user reports a memory leak or when memory usage profiles show uncontrolled growth, use this skill to diagnose and fix the issue.

## 1. Node.js Backend Analysis
- Examine long-lived objects (`global`, `process`) for accumulated data or event listeners.
- **MariaDB Pool Check**: Search for `pool.getConnection()` usages without a corresponding `conn.release()`, or transaction usages outside `withTransaction()` block.
- Search for extensive closure captures in loops or timeouts.

## 2. Profiling Memory 
- Request the user to start the Node.js application with `--inspect`.
- Instruct the user to open Chrome DevTools, navigate to `chrome://inspect`, take a Heap Snapshot, wait 5 minutes while performing actions, and take another Heap Snapshot.
- Analyze the "Retained Size" of objects to identify growth patterns (often seen as arrays, objects, or event emitters that do not decrease).

## 3. React Frontend Analysis
- Search for components making API calls in `useEffect` and verify they handle component unmounts using `AbortController` or boolean flags (e.g., `let isMounted = true; return () => { isMounted = false; }`).
- Search for `addEventListener` calls inside `useEffect`. If found, ensure a cleanup function is returned containing `removeEventListener`.
- Ensure interval and timeout IDs are stored in `useRef` and properly cleared on component unmount.

## 4. Immediate Remediation
- Wrap database connections in the `withConnection` or `withTransaction` helpers.
- Implement LRU strategies for any in-memory caching solutions replacing unbounded Maps or Objects.  
- Switch `.on()` event listeners to `.once()` where appropriate.

---
name: JavaScript Reference Management
description: Instructions for managing references, avoiding mutations, and handling cyclic data in Node.js and React.
---

# Skill: JavaScript Reference Management

Use this skill to diagnose bugs related to accidental reference mutation, reference sharing, object cyclicity, or React state mutation issues.

## 1. Reference Validation
- When debugging issues where data structures unexpectedly change across the asynchronous lifecycle, seek out areas where global/cached objects are directly mutated by route handlers.
- Suggest implementation of `const localCopy = structuredClone(globalData)` to isolate mutations.
- Review array methods that mutate in-place (e.g., `.sort()`, `.splice()`, `.push()`) vs methods that return a new reference (e.g., `.toSorted()`, `.slice()`, `.concat()`). Refactor toward immutability when data boundary crossing occurs.
- In React, explicitly look for direct mutations of state variables (e.g., `state.items.push(newItem)`), and replace them with immutable updates (e.g., `setItems([...state.items, newItem])`).

## 2. Cyclic Reference Diagnostics
- To debug `TypeError: Converting circular structure to JSON`, analyze the Sequelize/MariaDB retrieved data.
- Often, Sequelize models retain references to their configuration objects or parent connections. Ensure you explicitly map the values using `.get({ plain: true })` or explicitly construct a new return object `{ field1: row.field1 }` before piping to `res.json()`.
- Identify two-way object bindings (e.g., User has array of Sessions, Session refers back to User) and break the binding before serialization.

## 3. Deep Reference Guarding
- Use extensive `grep_search` or `view_file` to review complex nested property access.
- Implement optional chaining `?.` heavily when parsing external inputs or lightly structured JSON columns to prevent null pointer exceptions in JS (`Cannot read properties of undefined`).

## 4. WeakMap Cache Auditing
- When debugging long-running memory usage in Node.js resulting from custom caching, verify if the application is using standard `Map` or `Object` instances to hold large references. 
- Suggest refactoring to `WeakMap` if the keys are objects managed elsewhere in the application lifecycle, allowing v8 garbage collection to correctly reclaim them.

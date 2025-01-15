# JavaScript Reference and Memory Safety Rules

This project functions entirely in an asynchronous, reference-managed ecosystem (JavaScript/Node.js). JavaScript relies on reference tracing and garbage collection. These rules ensure memory and reference flow integrity to prevent unintended state mutations and hard-to-track bugs.

## 1. Reference Immutability 
- **Always** treat arguments passed to functions as immutable. Do not reassign or modify object properties of an array or object argument directly unless the function is explicitly named or designed to mutate state in-place (e.g., `mutateStockLevels`).
- When returning cached data or global state, return a deep or shallow clone (`structuredClone`, or `{...data}`) to prevent external modules from accidentally mutating the internal reference.

## 2. Cyclic Dependencies & References
- Avoid cyclic structures when serializing objects. E.g., attaching a parent object reference to its child object will cause a `TypeError: Converting circular structure to JSON` when passed up through an Express response.
- Use mapping functions to extract only the needed scalar or string fields from Sequelize/MariaDB row instances before piping them over the network. 

## 3. Null and Undefined Checks (Safe Dereferencing)
- **Always** assume multi-depth object references could be null. Ensure proper optional chaining (`obj?.property?.subProperty`) to prevent `TypeError: Cannot read properties of undefined` crashes in Node.js, which heavily affect backend stability.
- If an entity is expected to exist (e.g., fetching a Warehouse Zone), explicitly verify and optionally throw a `NotFoundError` rather than passing `null` downstream.

## 4. BigInt and Memory Alignment
- JavaScript limits safe integers. MariaDB uses `bigIntAsNumber`. Although `bigIntAsNumber` handles standard DB values, **always** sanitize raw numbers through `convertBigIntToNumber()` (from `SanitizationService`) before performing strict equality checks (`===`) or serializing data.

## 5. Weak references for caching
- If caching DOM elements or contextual metadata where the lifecycle of the object is managed elsewhere, prefer `WeakMap` or `WeakSet`. This ensures that caching the reference does not prevent the JavaScript garbage collector from clearing it when it is no longer used.

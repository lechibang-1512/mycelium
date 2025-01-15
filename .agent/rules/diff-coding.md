---
trigger: always_on
---

# Diff-Like Coding Rules — Anti-Hallucination & Precision Editing

These rules enforce surgical, diff-style code modifications to prevent AI hallucination, blind mass-replace, and unintended side-effects.

## 1. Read Before Write

- **Always** read the target file, function, or class (`view_file`, `view_file_outline`, `view_code_item`) **before** editing it.
- Never assume file contents, import order, variable names, or line numbers from memory.
- If a file has not been viewed in the current session, it must be viewed again before any edit.

## 2. Surgical Edits Only

- Target the **smallest possible region** that accomplishes the change — individual lines or small contiguous blocks.
- Never replace an entire file when only a few lines change.
- Never use `write_to_file` with `Overwrite: true` on existing code files as a shortcut for editing. Use `replace_file_content` or `multi_replace_file_content` instead.
- If edits span multiple non-adjacent regions, use `multi_replace_file_content` with separate `ReplacementChunks` — do **not** lump them into one giant replacement.

## 3. No Blind Mass-Replace

- Never set `AllowMultiple: true` on generic/common patterns (e.g., `import`, `return`, `};`, blank lines, single-word identifiers).
- `TargetContent` must be **unique** within the file — include enough surrounding context (leading whitespace, adjacent lines, comments) to disambiguate.
- Before submitting a replacement, mentally verify that the `TargetContent` string could only match one location in the file.

## 4. Exact-Match Anchoring

- `TargetContent` must be copied **character-for-character** from the file, including:
  - Leading whitespace / indentation
  - Trailing semicolons, commas, brackets
  - Blank lines between statements
- Use `StartLine` / `EndLine` ranges that were **observed** from a prior `view_file` call — never guess line numbers.

## 5. Preserve What Exists

- Do not reformat, re-indent, or reorder code that is outside the targeted change.
- Do not reorganize imports, add/remove blank lines, or change coding style as a side-effect.
- If the existing code uses a specific pattern (e.g., `const` vs `let`, single vs double quotes), match it.

## 6. Verify After Edit

- After modifying a file, re-read the changed region (`view_file` with the relevant line range) to confirm:
  - The replacement landed in the correct location.
  - Neighboring code was not clobbered or duplicated.
  - Syntax is valid (matching brackets, no orphaned statements).

## 7. No Hallucinated References

- Only reference file paths, function names, class names, database tables, and variables that have been **confirmed to exist** via tooling (`view_file`, `grep_search`, `list_dir`, `find_by_name`, MariaDB CLI).
- If unsure whether a symbol exists, search for it first — never invent paths like `/media/lechibang/Work and play/Work/mycelium/backend/services/FooService.js` without confirming.
- When adding imports, verify the export exists in the source module.

## 8. Commit-Sized Changes

- Group related edits into a logical unit (one feature, one bugfix, one refactor).
- Do not mix unrelated changes (e.g., fixing a bug + reformatting + adding a new feature) in the same editing pass.
- State the **intent** of each edit in the `Description` field so the change is reviewable.

---
trigger: always_on
---

# Safety: Environment & Secrets

- **Never** read, log, print, or embed the contents of `.env` in chat, artifacts, or code output.
- **Never** hardcode credentials, API keys, tokens, `SESSION_SECRET`, or database passwords in source files.
- **Never** commit `.env` — verify it is in `.gitignore` before any git operation.
- If a task requires knowing an env var's *name*, read `.env.example` — never `.env` itself.
- When creating new env vars, add them to `.env.example` with a placeholder value only.

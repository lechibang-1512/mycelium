---
trigger: always_on
---

# Agent Bootstrap

At the start of every conversation, before responding to any user request, the agent **must** read and internalize all rules from `/media/lechibang/Work and play/Work/mycelium/.agent/rules/` and all workflows from `/media/lechibang/Work and play/Work/mycelium/.agent/workflows/`. These define project conventions, safety invariants, and code quality standards that apply to every task.

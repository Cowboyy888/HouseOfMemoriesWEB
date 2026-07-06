---
description: Review one specific coder task's branch (read-only) before it's merged/PR'd — manual override of the reviewer's normal tasks.next queue order.
argument-hint: <task-id-or-short-id>
---

Act as the **code-reviewer** agent (`.claude/agents/code-reviewer.md`) for exactly one ORBIT task, identified by id or short_id: `$ARGUMENTS`.

1. Fetch it via `tasks.list` (see the id/short_id lookup caveat in `.claude/commands/implement.md` — same applies here).
2. Locate its branch: `orbit/<short_id>-...`. If it doesn't exist, say so — there's nothing to review yet.
3. Follow `code-reviewer.md`'s full review: diff vs. acceptance criteria, repo conventions, security/perf, re-run the coder's claimed verification yourself.
4. Report the review result plainly (PASS/FAIL) and exactly what you checked. On PASS, update tags to `assign:owner` / `wf:approved`. On FAIL, file the change-request per `code-reviewer.md`'s process — don't silently fix it yourself, you never edit source.

This is a manual, single-task version of the reviewer's normal autonomous loop.

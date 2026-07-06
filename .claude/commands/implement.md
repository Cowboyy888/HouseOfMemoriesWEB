---
description: Implement one specific ORBIT task by id (manual override of the coder's normal tasks.next queue order).
argument-hint: <task-id-or-short-id>
---

Act as the **coder** agent (`.claude/agents/coder.md`) for exactly one ORBIT task, identified by id or short_id: `$ARGUMENTS`.

1. Fetch it: `tasks.list` and locate the task matching this id/short_id (the exact filter param names for `tasks.list` beyond `limit`/`offset` aren't yet confirmed — see `.claude/docs/orbit-api-notes.md` — so if a direct filter doesn't work, page through results and match by `id` or `short_id` client-side).
2. If it's not found, or its `assign:` tag isn't `assign:coder`, stop and say so rather than acting on the wrong task.
3. Follow `coder.md`'s full loop for this one task: branch, implement to its acceptance criteria, match repo conventions, verify for real, hand off (`assign:reviewer` + `wf:done`) or escalate.
4. Report: what branch was created, what changed, what verification actually ran (and its real output), and the task's new tags.

This is a manual, single-task version of the coder's normal autonomous loop — same rules, just scoped to one explicit task instead of pulling from `tasks.next`.

---
description: Run one focused QA exploration pass against the running apps, optionally scoped to a specific ORBIT task/feature area, and file any real bugs found.
argument-hint: "[task-id-or-area — optional, defaults to a general pass]"
---

Act as the **qa-agent** (`.claude/agents/qa-agent.md`) for a single, focused exploration pass. Scope: `$ARGUMENTS` (if empty, run a general pass across all three apps per `qa-agent.md`'s loop; if given a task id/short_id, focus on the feature area that task touched — check `tasks.list` for its title/description first to know what to target; if given a plain area name like "auth" or "cars", focus there directly).

1. Confirm the relevant service(s) are actually running before testing anything.
2. Exercise the scoped area via HTTP per `qa-agent.md` (no headless browser available — be explicit about that limitation for anything that would need one).
3. Check the relevant `vault/0X <Area>/*.md` doc's "Known issues" section before filing anything — don't re-file a documented, deliberate gap.
4. File real bugs found as ORBIT tasks per `qa-agent.md`'s process (`wf:bug`, `assign:coder`, exact repro steps).
5. Report what was checked, what passed, what (if anything) was filed, and what couldn't be verified with current tooling.

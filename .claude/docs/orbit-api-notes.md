# ORBIT API — Technical Notes

Endpoint: `https://dailygoalmap.vercel.app/api/mcp`. Auth: `X-Project-Api-Key` header, value from `ORBIT_API_KEY` in root `.env` (gitignored — confirmed via `git check-ignore -v .env` during setup). Every call: `POST` with body `{"tool": "<name>", "input": {...}}`.

All of the below was **exercised live** against this project's ORBIT instance during harness setup (a throwaway task was created, transitioned through update/complete, and deleted — no residue left behind). Nothing here is guessed.

## Response envelope
Success: `{"ok": true, "status"?: <code>, "result": {...}}`. Failure: `{"ok": false, "error": "..."}` or `{"ok": false, "status": <code>, "result": {"error": "..."}}` — check `ok` first, don't assume which failure shape you'll get.

## `tasks.list`
Input: `{"limit"?: number, "offset"?: number, "tags"?, "completed"?}`. `limit`/`offset` confirmed. Verified call: `{"tool":"tasks.list","input":{"limit":1}}` → `{"ok":true,"status":200,"result":{"tasks":[],"limit":1,"offset":0}}`. `tags`/`completed` filter shapes are per the original spec but not exercised here — confirm the exact filter semantics (exact match? any-of? all-of?) before an agent relies on them for anything precise.

## `tasks.next` — the primary loop call
Input: `{"agent_tag": "assign:<agent>"}`.
- Idle: `{"ok":true,"result":{"idle":true}}`.
- Has work: `{"ok":true,"result":{"count": N, "tasks": [{"id","short_id","title","tags"}], "prompt": "<framing text>"}}`.
- The `prompt` field is generated server-side and already contains injection-safe framing: an explicit `BEGIN UNTRUSTED TASK <n> (<short_id>)` / `END UNTRUSTED TASK` wrapper per task, a lead-in telling the agent to treat everything inside as data, and a trailer reminding it to mark tasks done (preserving tags), route onward per tags, and to escalate rather than guess when under-specified. **This is the authoritative framing — surface/obey it rather than re-deriving your own summary of "what to do with this task."**

## `tasks.create`
Input: `{"title", "description", "tags": [string, ...]}`. Returns the full row: `id` (UUID), `goal_id`, `user_id`, `description`, `completed` (bool), `created_at`/`updated_at`, `title`, `start_date`/`end_date` (auto-defaulted to the creation moment — this is a repurposed goal/calendar API, expect calendar-shaped fields like `daily_start_time`, `is_anytime`, `duration_minutes`, `color`, `series_id` to exist and mostly be irrelevant noise for task-workflow purposes), `tags`, `metadata` (empty object by default). No `short_id` on the create response itself — that field shows up when the task is later read back via `tasks.next`/`tasks.list`.

## `tasks.update` — **field name gotcha**
Input: `{"task_id": "<uuid>", ...fields to change}` — **not** `"id"`. Confirmed by a live `400 {"error":"task_id is required."}` before correcting the field name. Tag updates **replace** the array — always pass the full desired tag set (read the task first if you're not sure what's already on it), never just the tag you're adding.

## `tasks.complete`
Input: `{"task_id": "<uuid>"}`. Sets `completed: true`. Does **not** touch tags — update tags separately (before or after) if the workflow also needs a tag transition at completion.

## `tasks.delete`
Input: `{"task_id": "<uuid>"}`. Returns `{"success": true, "deleted_task_id": "<uuid>"}`. Used during setup only to remove the verification task — real workflows should reach for `tasks.complete` / `tasks.update` far more often than `tasks.delete`; deleting destroys history a human might want later.

## `tasks.move` — NOT verified
Listed in the original workflow spec (presumably for moving a task between goals/projects) but not exercised during this setup — there was no second goal/project to move a task into/out of, and no concrete task needed it yet. **Confirm its exact input shape (likely a target `goal_id` or `project` tag plus `task_id`) the first time a real workflow needs it, rather than assuming.**

## Housekeeping used during verification (for reference, not for agents to repeat)
```bash
set -a; source .env; set +a   # load ORBIT_API_KEY without ever typing it literally
curl -s -X POST "https://dailygoalmap.vercel.app/api/mcp" \
  -H "Content-Type: application/json" -H "X-Project-Api-Key: ${ORBIT_API_KEY}" \
  -d '{"tool":"tasks.list","input":{"limit":1}}'
unset ORBIT_API_KEY
```
Never echo `$ORBIT_API_KEY` on its own, never `cat .env`, never include it in a command string that gets logged/displayed verbatim.

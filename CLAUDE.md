# CLAUDE.md

Guidance for Claude Code working in this repo.

## Project
Enterprise Car Rental & Car Sales platform (Turborepo monorepo: `apps/web`, `apps/admin`, `apps/api`, `packages/database`, `packages/contracts`). Full architecture, decisions, and conventions live in the Obsidian vault at `/vault` — start at `vault/01 Vision/Vision.md` and `vault/01 Vision/Decisions.md` (the running ADR log). See root `README.md` for the stack summary and quick start.

## Multi-Agent Workflow (ORBIT)
This repo has a task-driven multi-agent harness under `.claude/` wired to the DailyGoalMap ORBIT task API:

- **`coder`** (mandatory, the only agent that edits source), **`code-reviewer`** (read-only review gate), **`qa-agent`** (read-only, exercises the live apps) — see `.claude/agents/*.md` for each agent's exact rules.
- **`.claude/docs/workflow.md`** — the full tag-based state machine, the branch-per-task model, security/escalation rules, and the hard stops (push/merge/deploy/secrets/destructive-git/prod-schema are always human-only).
- **`.claude/docs/project-context.md`** — condensed, evidence-based repo facts (stack, conventions, what's built vs. not) agents should read instead of rediscovering the repo every cycle.
- **`.claude/docs/orbit-api-notes.md`** — verified ORBIT API call shapes (endpoint, auth, exact tool inputs — including a real gotcha: `task_id`, not `id`).
- **`.claude/skills/orbit-task-manager.md`** — how to actually call `tasks.next`/`tasks.list`/`tasks.create`/`tasks.update`/`tasks.complete`, and the poll/execute/route loop every agent runs for its own tag.
- Manual single-task commands: `/implement <task-id>`, `/review-before-pr <task-id>`, `/qa-task [task-id-or-area]`, `/sync-agent-task <task-id>`.

`ORBIT_API_KEY` lives in root `.env` (gitignored) — never printed, logged, or committed.

## General conventions (see `vault/` and `.claude/docs/project-context.md` for full detail)
- Backend: Clean Architecture per feature module (`domain/application/infrastructure`), NestJS, Repository Pattern via DI tokens — never bypass the domain interface to call Prisma directly from a controller/use-case.
- Frontend: `features/<name>/{api.ts, hooks.ts, components/}`, Zod contracts shared via `packages/contracts` — one schema validates both sides of the wire.
- Near-zero comments; only for non-obvious *why*, never restating *what*.
- No hardcoded secrets — every app/package reads its own `.env`.

# Operations Runbook

## Health checks
- API: GET /health or /api/health if available
- Web/admin: GET /

## Rollback
1. Revert to the previous image tag or commit.
2. Rebuild and redeploy the affected services.
3. Verify health checks and logs.

## Backup verification
- Confirm PostgreSQL dump files exist in the configured storage bucket.
- Restore to a temporary environment to validate integrity.

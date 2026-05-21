# Operations Runbook

## Health Checks

- `GET /api/health` returns `200` when the app can reach the database.
- The endpoint is uncached and intentionally exposes only coarse status.
- Treat any `503` as a deploy or database incident until proven otherwise.

## Deployment

Production deploys run from GitHub Actions on published releases or manual dispatch.

1. Build and validate in CI.
2. Copy build artifacts to `/home/prod/chatlyzer-web-update`.
3. Write `.env` on the target host with mode `600`.
4. Run `npx prisma migrate deploy`.
5. Generate Prisma client and prune dev dependencies.
6. Swap staged release into `/home/prod/chatlyzer-web`.
7. Restart PM2 with updated environment.

## Rollback

Use rollback when a release causes user-facing errors, failed health checks, or migration-related incidents.

1. SSH to the production host.
2. Confirm `/home/prod/chatlyzer-web-backup` exists.
3. Move the failed release aside:
   `mv /home/prod/chatlyzer-web /home/prod/chatlyzer-web-failed-$(date +%Y%m%d%H%M%S)`.
4. Restore the previous app:
   `mv /home/prod/chatlyzer-web-backup /home/prod/chatlyzer-web`.
5. Restart PM2:
   `cd /home/prod/chatlyzer-web && pm2 restart 0 --update-env`.
6. Verify `GET /api/health`.

Database migrations are not automatically rolled back. If the failed release included a destructive or incompatible migration, stop and create a forward-fix migration after inspecting production state.

## Database Backup And Restore

Minimum production policy:

- Take automated Postgres backups at least daily.
- Keep at least 7 daily restore points and one monthly restore point.
- Store backups outside the application host.
- Run a restore drill before major releases and at least quarterly.
- Record backup location, retention, encryption, and restore owner in the production secrets/runbook system.

Restore drill:

1. Restore the latest backup into a non-production database.
2. Run `npx prisma migrate status` against the restored database.
3. Run a smoke test for login, chat listing, analysis listing, credits, and orders.
4. Document restore time and any manual steps.

## Incident Response

For suspected security or privacy incidents:

1. Preserve logs and deployment metadata.
2. Disable affected endpoints or roll back if needed.
3. Rotate exposed credentials or webhook secrets.
4. Identify affected users/data classes.
5. Record timeline, root cause, containment, and follow-up tasks.

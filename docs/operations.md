# Operations Runbook

## Health Checks

- `GET /api/health` returns `200` when the app can reach the database.
- The endpoint is uncached and intentionally exposes only coarse status.
- Treat any `503` as a deploy or database incident until proven otherwise.

## Deployment

Render manages the Node service and PostgreSQL defined in `render.yaml`. See [cloud deployment](cloud-deployment.md) for first-time setup and required external credentials.

1. GitHub CI validates the change against a disposable database.
2. Render builds the linked branch only after checks pass.
3. `prisma migrate deploy` runs before the release takes traffic.
4. The app starts on Render's `PORT` with production environment validation.
5. Render gates the deployment on `GET /api/health`.

## Rollback

Use Render's service dashboard to roll back to a previously successful deployment. Verify `/api/health`, sign-in, chat listing and credit balance after rollback. Do not use the former VPS directories or PM2 commands.

Database migrations are forward-only; rolling back application code does not reverse database changes. For incompatible schema changes, inspect the production database and apply a forward fix. Ensure current backups exist before applying destructive migrations.

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
3. Run a smoke test for login, chat listing, analysis listing, credits, and RevenueCat purchase sync.
4. Document restore time and any manual steps.

## Incident Response

For suspected security or privacy incidents:

1. Preserve logs and deployment metadata.
2. Disable affected endpoints or roll back if needed.
3. Rotate exposed credentials or webhook secrets.
4. Identify affected users/data classes.
5. Record timeline, root cause, containment, and follow-up tasks.

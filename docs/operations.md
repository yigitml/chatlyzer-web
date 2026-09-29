# Operations Runbook

## Health Checks

- `GET /api/health` returns `200` when the app can reach the database.
- The endpoint is uncached and intentionally exposes only coarse status.
- Treat any `503` as a deploy or database incident until proven otherwise.

## Deployment

Deno Deploy runs the standalone Next.js service; Neon stores PostgreSQL data. See [cloud deployment](cloud-deployment.md) for setup and free-plan limits.

1. Check GitHub CI against its disposable database before deploying.
2. Deno builds the selected revision with the Next.js preset.
3. The pre-deploy command validates configuration and runs `prisma migrate deploy`.
4. Verify `/api/health`, sign-in and persistence on the deployed URL. The Deno preview warmup does not replace these production checks.
5. Monitor both providers' free quotas and cold-start behavior. Never upgrade or attach a payment method automatically.

## Rollback

Redeploy a previously verified revision through Deno Deploy. Verify health, sign-in, chat listing and credit balance. Keep production and development databases separate.

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

# Operations Runbook

## Health Checks

- `GET /api/health` returns `200` when the app can reach the database.
- The endpoint is uncached and intentionally exposes only coarse status.
- Treat any `503` as a deploy or database incident until proven otherwise.

## Deployment

Deno Deploy runs the standalone Next.js service; Neon stores PostgreSQL data. See [cloud deployment](cloud-deployment.md) for setup and free-plan limits.

1. Check GitHub CI against its disposable database before deploying.
2. Deno builds the selected revision with the Next.js preset.
3. Validate production configuration, back up the database, and apply `prisma migrate deploy` from the release checkout before publishing.
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

## Analysis recovery and erasure

Every analysis mode first reserves a unique `(userId, requestKey)` job and records its exact charged billing pool. Provider work has a 60-second deadline; reservations have a 120-second lease. Terminal results and terminal job state commit together. Failure state and credit compensation also commit together; an interrupted/failed compensation remains PROCESSING until reconciliation succeeds.

Deno Deploy runs the `Recover interrupted analyses` job once per minute. For other hosts or manual recovery, run `npm run jobs:reconcile` from a release checkout with the intended environment. It only reconciles expired non-content reservations; it never resends conversations. The command exits on a DB failure so a scheduler can alert/retry. Monitor expired PROCESSING count, oldest lease, FAILED/refundedAt outcomes, 503 webhook responses and legacy purchase count. Analysis reads/new requests also reconcile the current account. Verify scheduled executions in the Deno Cron dashboard after each release.

Deletion and completion share the account row lock. Deletion cancels pending jobs, advances account generation, erases all content including previously deleted rows, zeroes balances, revokes login generations and clears cookies. Retained rows contain only narrowly scoped transaction/security identifiers. File uploads remain unavailable, so there are no newly created remote storage objects to erase; implement provider object deletion before enabling uploads.

## Credit and consumable policy

A refund removes the full purchase grant from its original environment once. Spent credits create debt in that pool; later grants repay that debt and conditional debits prohibit overspending. Refund reversals restore the grant once. Event IDs deduplicate delivery; provider event timestamps prevent an older refund from undoing a later reversal. Sandbox and production balances never merge in storage, and production mode cannot spend sandbox credits. Monetary events for a disabled environment return 503 for later retry rather than being acknowledged permanently.

Consumable grants keep their original local owner. A RevenueCat TRANSFER is recorded with `consumable_owner_unchanged`; it does not move previously spent credit or re-grant a transaction. All transfer identities must resolve to active local accounts or the event returns 409 for explicit resolution. This application policy requires provider-dashboard/live restore acceptance before merchant launch.

The v1 customer purchase `id` is not assumed to be the store transaction ID. ID-only sync records pending verification; authenticated NON_RENEWING_PURCHASE delivery with a store transaction ID fulfills atomically. Ensure webhook delivery/retries are operational and exercise purchase-to-refund mapping on the actual configured store.

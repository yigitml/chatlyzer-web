# Cloud deployment

Production runs at [chatlyzerai.com](https://chatlyzerai.com) on Deno Deploy with Neon PostgreSQL. The provider hostname is [chatlyzer-web.yigitml.deno.net](https://chatlyzer-web.yigitml.deno.net). The local-source release starts the prepared standalone server from `.next/standalone`. The dashboard and `deno.json` use a dynamic runtime with `server.js` as its entrypoint.

## Configuration

Use Node 22 and TLS-enabled PostgreSQL. Keep signing secrets stable across releases and out of Git. Configure the production environment using `.env.example`; JWT, refresh, and webhook secrets must be independent random values of at least 32 bytes.

- Set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin and authorize that origin in Google Identity Services.
- Set `GOOGLE_ALLOWED_CLIENT_IDS` to approved web/mobile client IDs. By default, only `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is accepted.
- Set `REVENUECAT_FULFILLMENT_MODE=production` on public production; only isolated test environments may use sandbox credits.
- Keep `TRUSTED_CLIENT_IP_HEADER=none` unless ingress is verified to overwrite the selected header. Untrusted anonymous requests share a bounded rate-limit bucket.
- Set public `NEXT_PUBLIC_` values in Build and Production. Rebuild when they change.
- Give previews a separate test database and provider credentials; never connect previews to production data.

Set `PORT=8000` in the Deno runtime contexts so the standalone server binds to the service port used during warmup and cron discovery.

The health endpoint validates production configuration and database connectivity. Apply migrations from the release checkout before publishing.

## Release

1. Require passing GitHub CI and review the migration impact.
2. Back up production and verify restoration into an isolated local database.
3. Load protected production credentials, run `npm run check:env:production`, then `npx prisma migrate deploy`.
4. Publish the clean checkout with `deno deploy /absolute/path/to/clean-checkout --prod`.
5. Verify health, public pages, static assets, authentication, chat persistence, analysis, and purchase synchronization on the production origin.
6. Check the Deno Cron dashboard for `Recover interrupted analyses`. It runs every minute and refunds expired analysis reservations without retaining or replaying conversations.

The September 30 migrations add account/session generations, durable analysis jobs, purchase event ordering, isolated sandbox balances, and preservation of historical spent balances. Existing sessions require a fresh login. Duplicate Google subjects abort migration. Unmapped historical grants remain quarantined until their provider identities are reconciled.

## Limits

Sandbox checkout is disabled in production builds. A live RevenueCat Web Billing key is required to enable purchases. Binary `/api/file` uploads are unavailable; conversation text imports use `/api/chat`. Legacy `/api/checkout` returns 410; current checkout uses the RevenueCat browser SDK.

Hosting and database free plans have quotas and cold starts. Monitor usage in both provider dashboards. Optional PostHog delivery and native app acceptance require their own live checks.

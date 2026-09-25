# Cloud deployment (Render)

## Status

The repository is prepared for Render, but **a live deployment and live provider verification are still pending**. No cloud account, original database backup, or Google/OpenAI/RevenueCat credentials were available during the migration. Tests use a fresh PostgreSQL database and simulated external responses; they do not establish that real provider accounts, billing, or OAuth are configured.

## Architecture

`render.yaml` creates an always-on Node 22 web service and PostgreSQL 17 in Frankfurt. Database access is private to Render; no public database IPs are allowed. Prisma runs all migrations before traffic switches to the new release. `/api/health` checks the database. Render handles TLS, process supervision, logs, deploys and rollbacks, replacing SSH, Nginx and PM2.

The app preserves PostgreSQL transactions/advisory locks, shared database rate limits, HTTP-only cookie authentication, mobile bearer-token APIs, eight analysis types, privacy/ghost modes and RevenueCat credit purchases. Browser requests are same-origin, so the Render hostname works without owning the former domain.

The Blueprint selects paid compute, not expiring free database storage. Review the estimate shown by Render before creating resources; [current pricing](https://render.com/pricing) applies, plus external AI/payment usage. Nothing has been purchased by this migration.

## First deployment

1. Create/sign in to [Render](https://dashboard.render.com), connect this GitHub repository, and create a **Blueprint** from the branch containing `render.yaml`. Use the main branch after merging the migration PR.
2. Render prompts for four external settings. Obtain them from the accounts below and enter them directly in Render:

   | Variable | Source |
   | --- | --- |
   | `OPENAI_API_KEY` | OpenAI API project with billing and access to the model configured in `src/backend/lib/openai.ts` |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Cloud OAuth client of type **Web application** |
   | `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` | RevenueCat Web Billing app public key |
   | `REVENUECAT_SECRET_API_KEY` | RevenueCat secret key permitted to read subscriber purchases |

3. Render supplies the private `DATABASE_URL` and generates `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `REVENUECAT_WEBHOOK_SECRET`. Do not replace these with the example/test values. Keep the signing secrets stable across deployments.
4. Review the resources and cost before deploying. A first run applies all ten database migrations. With no backup, this creates a new, empty app; it cannot recover old users, chats, credits, or purchase identity mappings.
5. Copy the exact successful Render app origin into Google Cloud's **Authorized JavaScript origins**. Configure the OAuth consent screen, allowed test users while testing, and production publication as appropriate. The app uses the Google popup token flow with `openid email profile` scopes.
6. Configure RevenueCat Web Billing and its payment processor. Create the `credits_24` product and include it in an offering available to web customers. If your product identifier differs, update both the server and `NEXT_PUBLIC_` product variables together.
7. Configure a RevenueCat webhook to `https://YOUR-APP.onrender.com/api/webhook/revenuecat`. Its Authorization header must exactly match the generated `REVENUECAT_WEBHOOK_SECRET`. Start with a sandbox/test purchase; do not use a real charge to test the flow.
8. Optionally set `NEXT_PUBLIC_POSTHOG_KEY` and the PostHog host. Public variables are compiled into the browser bundle: rebuild after changing any `NEXT_PUBLIC_` value. The current ingestion proxy targets PostHog's US region.
9. If adding an extra web/mobile origin, add its exact origin to comma-separated `CORS_ALLOWED_ORIGINS`. Same-origin web requests need no CORS setting. Configure an optional custom domain through Render and add that origin to Google too. Native apps built with the old API URL need a separately released URL configuration update or the old custom domain pointed at Render.

[Render Next.js guide](https://render.com/docs/deploy-nextjs-app) · [Blueprint reference](https://render.com/docs/blueprint-spec) · [Health checks](https://render.com/docs/health-checks)

## Local and CI verification

Use Node 22 and a dedicated PostgreSQL database named with the suffix `_test` (the integration runner refuses other database names). Never run the integration suite against production.

```sh
npm ci
# Configure .env from .env.example, using local/test credentials.
npx prisma migrate deploy
npm run typecheck
npm run lint
npm test
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/chatlyzer_test npm run test:integration
npm run check:env:production
npm run build
npm run start:cloud
node scripts/smoke-test.mjs http://localhost:3000
```

`npm run check:contracts` separately compares the mobile repository. Clone `yigitml/chatlyzer-mobile` next to this repository, or set `CHATLYZER_MOBILE_ROOT` to its checkout path. This check does not require mobile dependencies.

GitHub CI uses a disposable PostgreSQL service and test-only values. It runs schema validation, migration, types, lint, unit and integration tests, the production build and HTTP smoke tests. It never injects production secrets. Render auto-deploys only when CI checks pass.

## Required live acceptance checks

Run these on the actual deployed origin before claiming full restoration. Use synthetic conversations and test payment data.

- Verify `/api/health` returns 200 and all public pages load, including on a mobile viewport.
- Complete real Google sign-in; reload; verify profile, logout, re-login and refresh behavior.
- Import a synthetic WhatsApp export, rename the chat, and verify messages remain after reload.
- Complete one real AI request and inspect **all eight** result types, persistence and the eight-credit deduction.
- Complete privacy mode: results persist but raw messages do not. Complete ghost mode: neither messages nor results persist; inspect the database as well as the UI.
- Complete a RevenueCat sandbox purchase; verify exactly 24 credits, webhook delivery and replay without duplicate grants. Verify purchase cancellation leaves credits unchanged.
- Check insufficient credits and provider-failure refund handling.
- Test profile editing, chat deletion and account deletion with disposable test accounts.
- For native-client compatibility, test its Google ID token, refresh-token rotation and logout against the new URL.
- Restart/redeploy and confirm persistence, health and the first authenticated request after startup.

## Existing limitations and remaining risks

- The existing `/api/file` binary-upload endpoint intentionally returns 501; chat text imports run through `/api/chat` and work without a file storage service. The old `/api/checkout` endpoint intentionally returns 410 because checkout uses RevenueCat's browser SDK. These are existing API limitations, not functional upload/legacy-checkout features.
- Live Google, OpenAI, RevenueCat checkout/webhooks and PostHog delivery remain unverified without accounts and credentials. No native client binary has been rebuilt or tested on a device.
- AI analysis currently runs within a request. Graceful shutdown is increased to five minutes, but a crashed process during analysis can still need manual reconciliation of a stuck analysis and credits. Moving jobs to a durable queue is a separate change.
- `npm audit` after compatible updates reports four high-severity findings in Prisma tooling's transitive `deepmerge-ts`/`mysql2` chain. This app uses PostgreSQL, not MySQL, and does not accept user-supplied Prisma configuration. The suggested automatic fix downgrades Prisma across a major version; it was not applied. Review upstream fixes before launch.

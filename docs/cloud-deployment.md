# Cloud deployment (Deno Deploy + Neon)

## Status

The target is Deno Deploy Free and Neon Free PostgreSQL. The paid Render Blueprint has been removed. **Live deployment and real-provider verification are pending account setup.** Local builds and HTTP/database smoke tests passed under Deno 2.9.5; this does not prove the hosted environment or third-party accounts work.

Neon explicitly offers no-card signup. Deno advertises a $0 Free plan; confirm the account can create a Free app without card verification during signup. Do not select a paid plan or enter payment information. If signup requires a card, stop that provider setup and select another provider.

## Architecture and limits

`deno.json` uses Deno Deploy's Next.js preset, with standalone output and PostgreSQL through Prisma. The database lives in Neon; retain TLS options from its connection string. Never disable certificate validation. Deno's Next.js build artifact does not include repository maintenance scripts, so validate the production environment and apply migrations from the release checkout before publishing a revision.

The app retains cookie and mobile authentication, eight analysis types, privacy/ghost modes, database-backed rate limits, credit purchases and webhooks. Same-origin browser requests work on the provider hostname.

Deno Free currently includes 1M monthly requests, 10 CPU hours and 150 GiB-hours of memory time. Neon Free also has storage/compute quotas and suspends idle compute. Expect cold starts and service interruption when quotas are exhausted; these plans do not promise unlimited traffic. AI and payment services are separate from hosting: the current OpenAI integration still needs a usable API account. No old database backup is available, so this creates an empty app rather than recovering old data.

## First deployment

1. Sign in to [Deno Deploy](https://console.deno.com) and [Neon](https://console.neon.tech). Choose Free plans. Create a Neon PostgreSQL project and copy its TLS-enabled connection string into the Deno app's `DATABASE_URL` secret.
2. Create a local-source Deno app using `deno deploy create --org yigitml --app chatlyzer-web --source local --framework-preset nextjs --region eu`. Authorize the CLI in your signed-in browser when prompted. The repository's `deno.json` identifies this app and its build configuration. Publish the tested checkout with `deno deploy --prod`; do not include ignored local files or secrets in uploads. GitHub-connected app creation uses the default branch, so do not use it before the migration is merged.
3. Set the following in the **Production** environment, and separately in **Development** only with a different non-production database and test provider credentials. Never connect preview deployments to production data:

   | Variable | Source |
   | --- | --- |
   | `DATABASE_URL` | Neon connection string, including TLS settings |
   | `JWT_SECRET`, `REFRESH_TOKEN_SECRET` | Two independently generated random secrets, at least 32 bytes each |
   | `REVENUECAT_WEBHOOK_SECRET` | Another independent random secret |
   | `OPENAI_API_KEY` | Usable OpenAI API project |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web application client |
   | `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` | RevenueCat Web Billing app public key |
   | `REVENUECAT_SECRET_API_KEY` | RevenueCat key permitted to read subscriber purchases |

4. Add the public `NEXT_PUBLIC_` values to the **Build** context as well; Next.js compiles these into browser bundles. Rebuild after changing them. Keep secrets out of Git and never deploy local test values. Keep signing secrets stable across releases.
5. Check GitHub CI before deploying. From the release checkout, load the production environment, run `npm run check:env:production`, and run `npx prisma migrate deploy` against the Neon production database. Only then run `deno deploy --prod`. Verify the deployed `/api/health` returns 200.
6. Add the exact deployed HTTPS origin to Google Cloud's **Authorized JavaScript origins**, configure the consent screen and allow test users. The popup flow uses `openid email profile`.
7. Configure RevenueCat Web Billing and its payment processor. Create `credits_24` in an available web offering. If using another product ID, update both server and public product settings. Set the webhook to `https://YOUR-APP-HOST/api/webhook/revenuecat` with an Authorization header exactly matching `REVENUECAT_WEBHOOK_SECRET`. Use sandbox purchases for verification.
8. Optional PostHog public settings must also exist in Build; the ingestion proxy targets the US region. Add extra exact origins to `CORS_ALLOWED_ORIGINS` only when needed. Native apps pointing at the old domain need an API URL update or the old domain routed to the new host.

[Deno pricing](https://deno.com/deploy/pricing) · [Deno build configuration](https://docs.deno.com/deploy/reference/builds/) · [Neon no-card signup](https://neon.com/faster)

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

GitHub CI uses a disposable PostgreSQL service and test-only values. It runs schema validation, migration, types, lint, unit and integration tests, the production build and HTTP smoke tests. It never injects production secrets. Check that CI passes before manually deploying a revision; Deno GitHub auto-deploys are not gated by this workflow.

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
- AI analysis currently runs within a request. A stopped or crashed process during analysis can still need manual reconciliation of a stuck analysis and credits. Moving jobs to a durable queue is a separate change.
- `npm audit` after compatible updates reports four high-severity findings in Prisma tooling's transitive `deepmerge-ts`/`mysql2` chain. This app uses PostgreSQL, not MySQL, and does not accept user-supplied Prisma configuration. The suggested automatic fix downgrades Prisma across a major version; it was not applied. Review upstream fixes before launch.

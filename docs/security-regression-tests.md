# Regression checks

Use Node 22 with a dedicated local PostgreSQL database ending in `_test`. Integration tests exercise real handlers and database transactions while mocking external providers. Never run them against production.

```sh
npm ci
npx prisma validate
npx prisma migrate deploy
npm run check:schema
npm run test:migrations
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run check:env:production
npm run build
npm run start:cloud
node scripts/smoke-test.mjs http://localhost:3000
```

`npm run check:contracts` also requires the public mobile checkout, either beside this repository or at `CHATLYZER_MOBILE_ROOT`.

Maintained coverage includes authentication and refresh races, resource ownership and erasure, transactional imports, analysis retries and compensation, privacy/ghost lifecycles, purchase identifiers/refunds, billing isolation, cursor traversal, parsing, provider schemas, and browser identity changes.

The optional browser harness uses the built UI with synthetic API fixtures. It checks desktop/mobile layouts, keyboard controls, pagination, retries, account deletion, and session expiry. Setup and invocation are documented in [the frontend test guide](../src/frontend/__tests__/README.md). Fixtures do not establish real Google, AI, payment, telemetry, or native-client acceptance.

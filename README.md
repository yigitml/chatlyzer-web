<div align="center">

# Chatlyzer Web

**A production full-stack application for importing conversations and turning them into structured AI-assisted analysis.**

[Cloud deployment](docs/cloud-deployment.md) · [Operations runbook](docs/operations.md) · [Security regression tests](docs/security-regression-tests.md)

`Next.js 16` &nbsp; `React 19` &nbsp; `TypeScript` &nbsp; `PostgreSQL` &nbsp; `Prisma` &nbsp; `OpenAI`

</div>

---

## Overview

Chatlyzer is more than a frontend around an AI endpoint. This repository contains the web client, authenticated API, persistence layer, credit and purchase flows, analytics integration, and production operations tooling in one typed Next.js codebase.

Users can import conversations, manage chats and messages, request multiple forms of analysis, and revisit persisted results. The same API also serves the native mobile client, so public request and response contracts are kept explicit and checked for drift.

## Engineering highlights

- **End-to-end type safety** — shared TypeScript DTOs and Zod schemas define the boundary between clients, route handlers, and persisted data.
- **Transaction-safe analysis flow** — credit consumption and analysis placeholders are created in a database transaction, with account locks and durable reservations preventing duplicate concurrent work.
- **Idempotent requests** — request keys let clients safely retry analysis creation without paying twice or duplicating results.
- **Layered request security** — JWT authentication, ownership checks, rate limiting, request context, environment validation, and deliberately coarse health responses.
- **Multi-client authentication** — separate web and mobile refresh flows, device/session records, token-version invalidation, and Google identity verification.
- **Production commerce** — RevenueCat purchase synchronization and webhook handling with persisted transaction identifiers and credit grants.
- **Operational readiness** — release validation, Prisma migrations, managed cloud deployment, health checks, rollback instructions, and security regression documentation.

## Architecture

```text
Browser / mobile client
        │
        ▼
Next.js route handlers ── authentication · validation · rate limiting
        │
        ├── application services ── analysis · credits · purchases
        │          │
        │          ├── OpenAI API
        │          └── RevenueCat
        │
        ▼
Prisma ORM ── PostgreSQL
```

The repository uses a pragmatic layered architecture:

| Layer          | Responsibility                                                           |
| -------------- | ------------------------------------------------------------------------ |
| `src/app`      | App Router pages, layouts, and HTTP route handlers                       |
| `src/frontend` | React components, hooks, providers, and Zustand stores                   |
| `src/backend`  | Infrastructure clients, middleware, logging, auth, and domain operations |
| `src/shared`   | Cross-layer schemas, DTOs, types, configuration, and utilities           |
| `prisma`       | Relational schema and forward-only database migrations                   |

Route handlers stay focused on transport concerns while shared schemas validate untrusted input. Backend modules own external integrations and transactional behavior. Soft deletion is used throughout the relational model to retain operational control over user data lifecycle.

## Technology

| Area           | Implementation                                                      |
| -------------- | ------------------------------------------------------------------- |
| Application    | Next.js 16 App Router, React 19, TypeScript 5.9                     |
| UI             | Tailwind CSS, Radix UI primitives, class-variance-authority, Lucide |
| State          | Zustand stores with focused domain hooks                            |
| API contracts  | Zod schemas, typed DTOs, consistent response wrappers               |
| Data           | PostgreSQL, Prisma 7, `@prisma/adapter-pg`                          |
| Authentication | Google OAuth / ID tokens, JWT access and refresh tokens             |
| AI             | OpenAI API with structured analysis schemas                         |
| Commerce       | RevenueCat purchases, webhooks, and credit accounting               |
| Observability  | PostHog, structured server logging, health endpoint                 |
| Quality        | Vitest, TypeScript, ESLint, contract-drift and environment checks   |

## Local development

### Requirements

- Node.js 22.12 or newer within the Node 22 LTS line
- PostgreSQL
- Google OAuth credentials
- An OpenAI API key

```bash
git clone https://github.com/yigitml/chatlyzer-web.git
cd chatlyzer-web
npm install
```

Create `.env` with the required server values:

```dotenv
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/chatlyzer
JWT_SECRET=replace-me
REFRESH_TOKEN_SECRET=replace-me
OPENAI_API_KEY=replace-me

# Optional for local development
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
REVENUECAT_SECRET_API_KEY=
REVENUECAT_WEBHOOK_SECRET=
```

Apply the schema and start the development server:

```bash
npx prisma migrate dev
npm run dev
```

The application is available at `http://localhost:3000`.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run check:contracts
npm run check:schema
npm run test:migrations
npm run test:integration
npm run check:env:production
npm run build
```

`check:contracts` guards the shared web/mobile API surface. The production environment check fails early when deployment-only secrets are missing.

## Data model

The core model connects users to devices, sessions, chats, messages, analyses, credits, subscriptions, orders, and RevenueCat purchases. Notable constraints include unique device/session identities, unique external purchase IDs, indexed idempotency keys, and explicit analysis lifecycle states (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`).

## Deployment

Production runs at [chatlyzerai.com](https://chatlyzerai.com) on Deno Deploy with Neon PostgreSQL. `deno.json` configures the Next.js build; releases validate the production environment and apply Prisma migrations from the release checkout before publishing. No VPS, SSH, Nginx, or PM2 is required. See the [cloud deployment guide](docs/cloud-deployment.md) for setup, service limits, and the live acceptance record.

Public production excludes sandbox credits. Checkout stays unavailable until merchant onboarding provides a live Web Billing key. Interrupted analysis reservations recover through the Deno scheduled job or the maintenance CLI.

## License

Licensed under the [MIT License](LICENSE).

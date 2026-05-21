# Security Regression Test Plan

Add or maintain coverage for these cases before major releases.

## Authentication

- Unauthenticated requests to protected APIs return `401`.
- Revoked web sessions and mobile devices cannot use existing access tokens.
- Mobile refresh-token replay fails after refresh-token rotation.
- Web auth responses do not include JWTs in JSON bodies.

## Authorization

- User A cannot read, update, or delete User B's chats.
- User A cannot read messages, analyses, files, credits, orders, or subscriptions belonging to User B.
- Admin-only endpoints reject non-admin users server-side.

## Abuse Controls

- Auth endpoints return `429` after configured threshold.
- General authenticated endpoints return `429` after configured threshold.
- Analysis endpoints return `429` under rapid repeated requests.

## Webhooks And Payments

- Polar webhook requests with bad signatures return `403`.
- Duplicate Polar order webhooks do not grant duplicate credits.
- RevenueCat webhooks with missing or wrong authorization return `401`.
- Duplicate RevenueCat transactions do not grant duplicate credits.

## Privacy Modes

- Normal analysis can persist chat messages.
- Privacy analysis persists chat metadata and analysis results but no raw messages.
- Ghost analysis persists no chat, messages, or analysis rows.

## Input Validation

- Oversized chat imports are rejected.
- Invalid IDs and malformed request bodies return `400`.
- File/share inputs reject unsupported MIME types and oversized ZIP files.

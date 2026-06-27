# Leaderboard Feature Plan (Simple Mode Only)

Hackathon: Vercel + AWS Databases — Track 4 (Open Innovation).

## Scope

Build a **Simple-mode leaderboard** only. Race mode submissions are out of scope for now.

## Decisions (locked)

- **Backend:** Astro + `@astrojs/vercel` adapter (same repo). Homepage stays static/prerendered; only API routes + leaderboard page render on-demand.
- **Database:** Amazon DynamoDB (AWS serverless, no connection management, easiest Vercel serverless fit).
- **Identity:** Anonymous nickname + device fingerprint. The fingerprint is reused from the existing `src/lib/crypto.ts` `getDeviceFingerprint()` logic.
- **Trust:** Signed single-use submission token + server-side sanity validation + rate limiting. NOT server-side re-run.

## On the "tamper-proof POST" check (honest reality)

The benchmark runs entirely in the user's browser with their own API keys, so the user fully controls the client. That means:

- **HTTPS already prevents** third parties from tampering with the request in transit.
- A server-signed token (HMAC) **can** stop: spoofed `curl` submissions, replay of old results, and submissions that didn't come through the real app flow.
- It **cannot** stop a determined user from faking their *own* numbers, because they can edit the value in their own browser before it ever gets signed. The only way to fully prevent that is a server-side re-run (declined — correct call for a hackathon).

So we build a pragmatic **tamper-resistance layer** (signed single-use tokens + server-side sanity validation + rate limiting) and add an honest "self-reported" disclaimer.

## On reusing the API-key fingerprint for the leaderboard

The existing fingerprint in `src/lib/crypto.ts` is derived from `userAgent + screen + timezone`. It is **not secret or unique** — many users can share the same fingerprint. We can still use it for:

1. **Soft anonymous identity:** A `deviceHash` column in the leaderboard so the same browser/device sees the same set of past submissions (weak deduplication).
2. **Rate limiting:** The server recomputes the same hash from the request and applies per-device rate limits, layered on top of per-IP limits.
3. **Anti-replay / anti-scraping:** The client sends the fingerprint hash along with the signed token; the server can reject tokens whose payload doesn't match the request fingerprint.

Important caveat: a fingerprint is **not** a cryptographic proof. It can be spoofed or collide across real users. It should supplement, not replace, the HMAC token + rate limiting.

## 1. Backend infrastructure

- Add `@astrojs/vercel` adapter; keep `output: 'static'` and opt API/leaderboard routes into on-demand rendering via `export const prerender = false`. Homepage stays fast & prerendered.
- DB access via **DynamoDB** (`@aws-sdk/client-dynamodb` + `@aws-sdk/lib-dynamodb`). HTTP-based, no connection pools, no RDS, no VPC.

## 2. Database schema (DynamoDB)

Two tables:

### `simple_leaderboard`
- **PK:** `id` (UUID)
- **Attributes:**
  - `nickname` (String)
  - `deviceHash` (String) — hash of `userAgent|screen|timezone`
  - `provider` (String)
  - `model` (String)
  - `tps` (Number)
  - `ttft` (Number)
  - `ttlt` (Number)
  - `inputTokens` (Number, nullable)
  - `outputTokens` (Number, nullable)
  - `promptLength` (Number)
  - `createdAt` (String ISO timestamp)
- **GSI `by-tps`:** `gsi1pk` = `"SIMPLE"`, `gsi1sk` = `tps` (Number, descending) → global top-N.
- **GSI `by-provider`:** `gsi2pk` = `<provider>`, `gsi2sk` = `tps` (Number, descending) → filter top-N by provider.
- **GSI `by-device`:** `gsi3pk` = `<deviceHash>`, `gsi3sk` = `createdAt` (descending) → show a user's own submissions.

### `leaderboard_nonces`
- **PK:** `nonce` (random string)
- **TTL attribute:** `expiresAt` (Unix timestamp) → auto-cleanup.

Infrastructure-as-code (optional but recommended): `db/dynamodb.json` or a short Terraform/CloudFormation snippet for table + GSI definitions.

## 3. API routes (`src/pages/api/leaderboard/`)

- `POST /api/leaderboard/token` → issues HMAC-signed, short-lived, single-use submission token. Token binds `nonce + issuedAt + deviceHash`.
- `POST /api/leaderboard/submit` → verify token + nonce, check `deviceHash` matches request, run sanity validation, insert into `simple_leaderboard`.
- `GET /api/leaderboard` → query top-N (default 50) with optional `provider` filter and `sort` (`tps` | `ttft` | `createdAt`).
- `GET /api/leaderboard/mine` → submissions for the current `deviceHash`.

## 4. Trust / tamper layer (`src/lib/server/`)

- `signing.ts`: HMAC sign/verify using `LEADERBOARD_SECRET` env var; token binds `nonce + issuedAt + deviceHash`.
- Single-use enforcement via `leaderboard_nonces` table with TTL + conditional write (fails if nonce already exists).
- `validation.ts`: bounds checks (plausible tps/ttft ranges), provider+model must exist in the registry (`src/lib/config.ts`), and `deviceHash` must match the token payload.
- Simple per-IP rate limiting + per-`deviceHash` rate limiting.

## 5. Fingerprint helpers

- Add a small shared helper in `src/lib/fingerprint.ts` that computes the same `userAgent|screen|timezone` string used by `crypto.ts` and returns a stable SHA-256 hash (`deviceHash`).
- Import this helper from both `crypto.ts` and the new leaderboard client code so the fingerprint stays consistent.
- Server-side: the token verification also checks `deviceHash` from the request body against the signed payload.

## 6. Frontend

- `src/lib/leaderboard.ts`: client helpers (`getToken`, `submit`, `fetchLeaderboard`, `fetchMySubmissions`).
- `src/components/LeaderboardSubmit.tsx`: nickname input + "Submit to Leaderboard" button shown in Simple mode after a run completes.
- Wire it into `BenchmarkPanel` next to the existing `ShareBar` (around line 366).
- `src/pages/leaderboard.astro`: new page with a Preact component that fetches and renders the Simple leaderboard table; add a nav link in `TopBar`.
- CSP: leaderboard calls are **same-origin**, so no `connect-src` change needed (client never talks to AWS directly).

## 7. Config & secrets

- Env vars (Vercel project + local `.env`):
  - `AWS_REGION`
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (or use Vercel's AWS IAM role integration if available)
  - `DYNAMODB_TABLE_PREFIX` (e.g., `iamspeed-prod`)
  - `LEADERBOARD_SECRET`

## 8. Tests & verification (per global rules)

- Vitest unit tests:
  - HMAC sign/verify, including deviceHash binding.
  - Nonce single-use enforcement.
  - Validation bounds.
  - Fingerprint hash consistency with `crypto.ts`.
- Run `npm run lint && npm run build && npx vitest run` before any push.

## Tradeoffs to flag

- **v0/Next.js:** the hackathon mentions v0 + Next.js, but we're staying in the existing Astro/Preact stack (Track 4 "anything goes" allows this). We keep Vercel + DynamoDB, just not v0-scaffolded. If we'd rather show v0, we'd split into a separate Next.js app.
- **Vercel Postgres / KV:** Even simpler than DynamoDB, but they are **not** AWS databases and won't satisfy the hackathon requirement. DynamoDB is the lightest AWS option that still counts.
- **Fingerprint identity:** It's a soft signal, not a secret. It can collide and be spoofed. It helps with rate limiting and UX but does not prove uniqueness.
- **Scope:** Only Simple mode is covered. Race leaderboard can be added later using the same table + token pattern.

## Open questions before starting

1. Is a **DynamoDB table already provisioned**, or should the plan include AWS provisioning steps/instructions?
2. Confirm staying on **Astro (not v0/Next.js)** for the frontend.
3. Should we allow users to edit their nickname after submission, or is it write-once?

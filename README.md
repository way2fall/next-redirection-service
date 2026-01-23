# Next Redirection Service

High-performance URL redirection service built with **Next.js App Router** and a **single-admin auth model** (each deployed instance serves exactly one user).

## Architecture (why this shape)

- **Redirect path is isolated and minimal**: `GET /{slug}` is an **Edge Route Handler** that does **1 KV read** (slug config) and, when multiple destinations are enabled, **1 KV counter increment** (round-robin cursor) before returning a native **HTTP 302** (no UI, no middleware, no client JS).
- **Admin UI is separate**: all admin pages live under `/admin` and are protected by a server-side session cookie. Admin code never runs on the public redirect route.
- **Storage is swappable**: all persistence goes through a `KvStore` interface. The default provider uses **Upstash Redis REST** (fetch-based, compatible with both Edge and Node runtimes).

## Folder structure

```
app/
  [slug]/route.ts                 # CRITICAL PATH: Edge 302 redirect
  fallback/route.ts               # Public fallback HTML (no auth)
  admin/
    login/                        # Unprotected login
    (protected)/                  # Protected admin area
      links/                      # Slug list + create
      links/[slug]/               # Per-slug destination editor
      fallback/                   # Fallback HTML editor
lib/
  auth/                           # Single-admin auth + signed sessions
  redirect/                       # Redirect resolution logic
  storage/                        # KV abstraction + providers
```

## Key code

- Redirect route: `app/[slug]/route.ts`
- Redirect selection: `lib/redirect/resolve.ts`
- Fallback route (raw HTML): `app/fallback/route.ts`
- Storage abstraction: `lib/storage/kv.ts`, `lib/storage/providers/upstashRest.ts`
- Admin auth/session: `lib/auth/session.ts`, `lib/auth/password.ts`
- Protected admin routes: `app/admin/(protected)/layout.tsx`

## Data model (KV)

**Slug config** is stored as JSON at `nrs:link:{slug}` (prefix configurable via `KV_PREFIX`):

```json
{
  "version": 3,
  "slug": "abc",
  "enabled": true,
  "createdAt": "2026-01-20T00:00:00.000Z",
  "destinations": [
    {
      "id": "uuid",
      "urls": ["https://example.com", "https://example.com/alt"],
      "enabled": true,
      "createdAt": "..."
    }
  ]
}
```

**Analytics + round-robin** are stored as counters/keys (so redirects don’t rewrite the slug JSON):

- Slug raw hits (all incoming requests): `nrs:rawHits:{slug}`
- Slug valid clicks (human-likely): `nrs:clicks:{slug}` (backward compatible with v1)
- Destination valid clicks: `nrs:destClicks:{slug}:{destinationId}`
- Round-robin cursor: `nrs:rr:{slug}` (monotonic; selection uses `INCR - 1`)

**Fallback HTML** is stored at `nrs:fallback:html` (empty means “use built-in default”).

## Redirect behavior

- If slug not found: `404`
- If slug disabled OR all destinations disabled: `302` → `/fallback?slug=...`
- Otherwise: pick the next **enabled** destination URL via deterministic round-robin (one global cursor per slug) and `302` to it.
- Analytics increments are **fire-and-forget** and do not delay the redirect response:
  - `rawHits` increments for every resolved slug request (including bots/prefetch/HEAD).
  - `valid clicks` increment only when the request looks like a real browser navigation (see `lib/redirect/clickClassifier.ts`).

## Backward compatibility

- Existing v1 records shaped like `{ slug, destination, createdAt }` are read as a v3 slug with a single destination `{ id: "legacy", ... }`.
- Existing v2 records (`destinations[].url`) are read as v3 (`destinations[].urls`).
- Existing slug click counters remain valid (`nrs:clicks:{slug}`).

## Environment variables

See `.env.example`.

- `ADMIN_USERNAME`: single admin username
- `ADMIN_PASSWORD_HASH`: bcrypt hash (never plaintext)
- `SESSION_SECRET`: HMAC secret for signed HttpOnly session cookie
- `PUBLIC_BASE_URL`: optional base URL used by the admin “Copy” button
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: KV backend (Upstash Redis REST)
- `KV_PREFIX`: optional namespace for keys (handy per-instance)
- `CLICK_DEDUPE_WINDOW_SECONDS`: dedupe window for `valid clicks` counting (default `3`)

## Running locally

1. Install deps: `npm install`
2. Create `.env` from `.env.example`
3. Generate a bcrypt hash (example): `npm run hash-admin-password -- "your password"`
4. Start: `npm run dev`

If login fails locally, ensure:

- You’re typing the exact `ADMIN_USERNAME` value (not the placeholder).
- `ADMIN_PASSWORD_HASH` includes the full bcrypt hash and `$` is escaped as `\$` in `.env`.
- You restarted `npm run dev` after editing `.env`.

## Deployment notes (Vercel-style)

- Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` as **server-side env vars** (never `NEXT_PUBLIC_*`).
- For KV, configure Upstash Redis REST env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- Redirect handler runs at the **Edge**, admin runs on **Node.js** (server actions + server components).
- If admin env vars are missing, the build can still succeed, but `/admin` login will show a misconfiguration message.

## Security notes

- Admin routes are protected server-side in `app/admin/(protected)/layout.tsx` and server actions.
- Session is a signed, expiring, HttpOnly cookie (no client-side password checks).
- Destination URLs are validated to `http(s)` on create, and re-validated on redirect resolution.
- If Upstash env vars are not set, the app falls back to an in-memory KV for local dev only (not compatible with Edge+Node separation in production)...

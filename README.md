# Next Redirection Service

High-performance URL redirection service built with **Next.js App Router** and a **single-admin auth model** (each deployed instance serves exactly one user).

## Architecture (why this shape)

- **Redirect path is isolated and minimal**: `GET /{slug}` is implemented as an **Edge Route Handler** that does a single KV lookup and returns a native **HTTP 302** (no UI, no middleware, no client JS).
- **Admin UI is separate**: all admin pages live under `/admin` and are protected by a server-side session cookie. Admin code never runs on the public redirect route.
- **Storage is swappable**: all persistence goes through a `KvStore` interface. The default provider uses **Upstash Redis REST** (fetch-based, compatible with both Edge and Node runtimes).

## Folder structure

```
app/
  [slug]/route.ts                 # CRITICAL PATH: Edge 302 redirect
  admin/
    login/                        # Unprotected login
    (protected)/                  # Protected admin area
lib/
  auth/                           # Single-admin auth + signed sessions
  redirect/                       # Redirect resolution logic
  storage/                        # KV abstraction + providers
```

## Key code

- Redirect route: `app/[slug]/route.ts`
- Storage abstraction: `lib/storage/kv.ts`, `lib/storage/providers/upstashRest.ts`
- Admin auth/session: `lib/auth/session.ts`, `lib/auth/password.ts`
- Protected admin routes: `app/admin/(protected)/layout.tsx`

## Environment variables

See `.env.example`.

- `ADMIN_USERNAME`: single admin username
- `ADMIN_PASSWORD_HASH`: bcrypt hash (never plaintext)
- `SESSION_SECRET`: HMAC secret for signed HttpOnly session cookie
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: KV backend (Upstash Redis REST)
- `KV_PREFIX`: optional namespace for keys (handy per-instance)

## Running locally

1) Install deps: `npm install`
2) Create `.env` from `.env.example`
3) Generate a bcrypt hash (example): `npm run hash-admin-password -- "your password"`
4) Start: `npm run dev`

## Deployment notes (Vercel-style)

- Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` as **server-side env vars** (never `NEXT_PUBLIC_*`).
- For KV, configure Upstash Redis REST env vars (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`).
- Redirect handler runs at the **Edge**, admin runs on **Node.js** (server actions + server components).

## Security notes

- Admin routes are protected server-side in `app/admin/(protected)/layout.tsx` and server actions.
- Session is a signed, expiring, HttpOnly cookie (no client-side password checks).
- Destination URLs are validated to `http(s)` on create, and re-validated on redirect resolution.
- If Upstash env vars are not set, the app falls back to an in-memory KV for local dev only.

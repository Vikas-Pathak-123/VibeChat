# VIB-24: Refresh Tokens + Google OAuth — Design

**Ticket:** [VIB-24](https://vibecode.atlassian.net/browse/VIB-24) · **Branch:** `VIB-24-refresh-tokens-google-auth`

## Goal

Replace the single 30-day JWT (persisted in localStorage) with a short-lived access token held only in memory plus a long-lived, rotating refresh token in an `httpOnly` cookie, and add "Continue with Google" login that ends in the same session as email login.

## Constraints discovered in the codebase

| Fact | Consequence |
|---|---|
| Frontend uses Zustand + TanStack Query + axios (`store/api/apiClient.ts`), no Redux / RTK Query | Ticket's `baseQueryWithReauth` in `vibechatApi.ts` → axios response interceptor in `apiClient.ts`; "Redux memory" → non-persisted Zustand `authStore` (same mapping VIB-23 used) |
| Frontend on Vercel (`https://vibe-chat.vercel.app`), API on Render (`vibechat-177v.onrender.com`) — different sites | Production cookie must be `SameSite=None; Secure`; CORS must whitelist the frontend origin with `credentials: true` (today it is `*`) |
| The guest account (`guest@example.com`) is shared by many people at once | One refresh token per user would log every other guest out on each login → store a capped list of hashed tokens (one per device/session) |
| React 18 `StrictMode` double-runs effects; several queries fire at once on load | Refresh must be single-flight on the client, or two parallel refreshes race the rotation and log the user out |
| Firefox Total Cookie Protection partitions third-party cookies by top-level site | A cookie set on the Google callback (top-level = Render) would be invisible to XHRs from Vercel → the callback hands the frontend a one-time code, and the frontend exchanges it by XHR so the cookie is set in the same context as email login |

## Backend

### Tokens (`services/tokenService.ts`)
- **Access token:** JWT `{ id, type: "access" }`, secret `JWT_SECRET`, TTL `ACCESS_TOKEN_TTL` env (default `15m`). Returned in the JSON body as `token` (existing clients read `user.token`).
- **Refresh token:** JWT `{ id, type: "refresh", jti }`, secret `REFRESH_TOKEN_SECRET` (falls back to `JWT_SECRET`; the `type` claim keeps the two apart), TTL 30 days.
- **Storage:** `IUser.refreshTokens: { tokenHash, expiresAt }[]` — SHA-256 of the raw token, `select: false` so it never appears in API responses or populates. Expired entries are pruned on every write; at most 10 are kept (oldest dropped).
- **Rotation:** `POST /api/user/refresh` verifies the cookie JWT, requires its hash to be stored and unexpired, shortens the old entry to a 30-second grace window (so two tabs refreshing at the same moment both succeed), stores a new token, sets the new cookie, and returns `{ _id, name, email, picture, token }`. Anything else → `401` and the cookie is cleared.
- **Cookie:** name `vibe_rt`, `httpOnly`, `path=/api/user`, `maxAge` 30 days. Production: `SameSite=None; Secure`. Otherwise: `SameSite=Lax`.

### Endpoints
| Route | Behaviour |
|---|---|
| `POST /api/user/login`, `POST /api/user` (register) | As before, plus the refresh cookie; `token` is now the 15-minute access token |
| `POST /api/user/refresh` | Rotation as above |
| `POST /api/user/logout` | Removes the cookie's token from the user and clears the cookie. Always `200` (idempotent, works with an expired access token) |
| `GET /api/user/auth/google?nonce=` | Redirects to Google (`profile email`) with a random OAuth `state`; `state` + the frontend's `nonce` are kept in the `vibe_oauth` cookie (httpOnly, `SameSite=Lax`, path `/api/user/auth/google`, 10 min). Missing/invalid nonce → `<client>/?authError=google_failed`. If `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` are unset → `<client>/?authError=google_unavailable` |
| `GET /api/user/auth/google/callback` | Requires the `vibe_oauth` cookie and a matching `state` (else `google_failed`, Google is never asked). On success: create a one-time code (32 random bytes, SHA-256 stored on the user, 60 s TTL) and redirect to `<client>/?oauthCode=<code>&nonce=<nonce>`. On failure → `<client>/?authError=google_failed` |
| `POST /api/user/auth/google/exchange` `{ code }` | Atomically consumes the code and issues a session exactly like login. Unknown / expired / reused → `401` |

### Google account linking (`services/googleAuthService.ts`)
1. Existing user with that `googleId` → sign in.
2. Else a user with the same email **and Google says the email is verified** → link (`googleId` set) and sign in. Registration never proved who owns that address, so linking also replaces the password with a random one and revokes all existing sessions (pre-account-takeover protection): the verified owner signs in with Google from then on.
3. Else if the email is taken but unverified → fail (no silent takeover).
4. Else create a user (name, email, Google photo, random unusable password).

### `authMiddleware.protect`
Accepts only `type: "access"` tokens. Refresh tokens, legacy 30-day tokens (no `type`), expired tokens, and tokens for deleted users → `401`. Token verification is separated from `next()` so downstream errors are no longer reported as "token failed".

### CORS
`cors({ origin: <allow-list>, credentials: true })`. Allow-list = `CLIENT_URL` (comma-separated) or, when unset, `https://vibe-chat.vercel.app` in production and `http://localhost:3000` otherwise. The first entry is the redirect target for Google. Reflecting arbitrary origins with credentials is never allowed (any site could read `/refresh`).

## Frontend

- **`apiClient`**: `withCredentials: true`. Response interceptor: on `401` from anything except `/api/user/{login,refresh,logout}` and `/api/user/auth/*`, call a single-flight `refreshSession()`, retry the original request once with the new token. If the refresh itself returns `401`, call the registered session-expired handler (ends the session) and reject.
- **`authStore`**: no `persist`; the access token lives only in memory. `isAuthLoading` starts `true` until session restore finishes.
- **`session.ts`**: `restoreSession()` (removes the legacy `vibe-auth` localStorage key, registers the session-expired handler, calls `refreshSession()`; failure → signed out), `endSession()` (disconnect socket, clear user, clear chat + query cache), `logoutSession()` (`POST /logout`, then `endSession()` even if the call fails), `completeGoogleLogin(code)`.
- **App start:** `App` runs `restoreSession()` once. `Chatpage` redirects to `/` once auth has resolved with no user (session expired or logged out elsewhere).
- **Homepage:** "Continue with Google" below the tabs (both Login and Sign Up). Clicking stores a fresh nonce in localStorage (`startGoogleLogin`) and navigates to `/api/user/auth/google?nonce=…`. On return, `?oauthCode&nonce` → `completeGoogleLogin(code, nonce)` exchanges only if the nonce matches the stored one (login-CSRF protection), then `/chats`; `?authError` → error toast. Query params are stripped after reading.

### Privacy
`googleId`, `refreshTokens` and `oauthCode` are `select: false`; user search also excludes `password`.

## Out of scope / known limits

- Safari (and Chrome incognito) block third-party cookies, so with the Vercel → Render split, their sessions will not survive a reload and will end when the first access token expires (≤ 15 min). Fix: serve the API same-site with the frontend (e.g. a Vercel rewrite of `/api/*` to Render and a relative `API_BASE_URL`), a deploy change to make separately.
- Socket.IO stays unauthenticated (unchanged).
- Revoking all sessions on refresh-token reuse, per-device session UI: backlog (VIB-8).

## Deploy configuration

`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, optional `GOOGLE_CALLBACK_URL` (default `/api/user/auth/google/callback` resolved behind Render's proxy), optional `CLIENT_URL`, optional `REFRESH_TOKEN_SECRET`. Google Cloud Console must list `https://vibechat-177v.onrender.com/api/user/auth/google/callback` as an authorized redirect URI.

# VIB-24: Refresh Tokens + Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 15-minute in-memory access tokens + rotating 30-day `httpOnly` refresh cookie, transparent client-side refresh, and Google OAuth login that lands in the same session model.

**Architecture:** A `tokenService` owns token creation, hashing, cookie options and rotation against `IUser.refreshTokens`. Login/register/refresh/Google-exchange all end in `issueSession`. The axios `apiClient` retries 401s once after a single-flight refresh; the Zustand auth store is no longer persisted and is restored from the cookie on app start.

**Tech Stack:** Express 4, Mongoose 7, jsonwebtoken, cookie-parser, passport + passport-google-oauth20 (backend); React 18, Zustand, TanStack Query, axios, Chakra UI (frontend); Jest + Supertest + mongodb-memory-server (backend), CRA Jest (frontend).

**Spec:** [docs/superpowers/specs/2026-09-30-refresh-tokens-google-auth-design.md](../specs/2026-09-30-refresh-tokens-google-auth-design.md)

## Global Constraints

- No Redux. Ticket's `vibechatApi.ts`/Redux items map to `apiClient.ts` + `authStore.ts` (spec table).
- Access token stays in the JSON body as `token` (15m, `type: "access"`); refresh token only ever in the `vibe_rt` cookie (`httpOnly`, `path=/api/user`).
- `refreshTokens` and `oauthCode` are `select: false`; no API response may contain them.
- Refresh tokens are stored hashed (SHA-256), never raw; max 10 per user.
- CORS never reflects arbitrary origins with credentials.
- Backend tests: `npm test` at repo root. Frontend tests: `CI=true npx react-scripts test --watchAll=false` in `frontend/`; type-check `npx tsc --noEmit -p .`; lint `npm run lint`.
- Do not commit `frontend/build`, `backend/dist`, or the local `API_BASE_URL` override.

## Review Focus

- Two refreshes with the same cookie at the same moment (StrictMode, two tabs) → both succeed (client single-flight + 30 s server grace); a third use after the grace → 401.
- A refresh token presented as a Bearer access token, and a legacy 30-day token without `type` → 401.
- Account takeover via Google: an existing email account is linked only when Google marks the email verified.
- OAuth code is single-use and expires in 60 s; a replay → 401.
- `GET /api/user?search=` and populated chat users never include `refreshTokens` / `oauthCode`.
- A 401 from `/api/user/login` (or any auth endpoint) must not trigger a refresh loop.
- Logout when the access token has already expired still clears the cookie server-side.

---

## Task 1: Token service + session cookie on login/register + credentialed CORS

**Files:**
- Create: `backend/services/tokenService.ts`
- Delete: `backend/config/generateToken.ts`
- Modify: `backend/models/userModel.ts` (`refreshTokens`, select false)
- Modify: `backend/controllers/userController.ts` (login/register use `issueSession`)
- Modify: `backend/app.ts` (cookie-parser, CORS allow-list)
- Modify: `backend/__tests__/helpers.ts` (`tokenFor` uses `generateAccessToken`)
- Modify: `package.json` (add `cookie-parser`, `@types/cookie-parser`)
- Test: `backend/__tests__/authSession.test.ts`

**Interfaces:**
- Produces: `generateAccessToken(id)`, `verifyAccessToken(token): { id: string }`, `hashToken(raw)`, `issueSession(res, user): Promise<string>` (returns access token, sets cookie, stores hash), `rotateSession(res, raw): Promise<IUser | null>`, `revokeSession(raw): Promise<void>`, `clearRefreshCookie(res)`, `REFRESH_COOKIE = "vibe_rt"`, `sendAuthResponse(res, user, status?)` in `userController.ts`; `allowedOrigins(): string[]` in `backend/config/cors.ts`.

- [ ] **Step 1: Write the failing test** — `authSession.test.ts`:
  - login sets `vibe_rt` cookie with `HttpOnly`, `Path=/api/user`, `SameSite=Lax`, Max-Age ≈ 30 days
  - login body `token` decodes to `{ type: "access" }` with `exp - iat === 900`
  - DB stores exactly one `refreshTokens` entry whose `tokenHash` = SHA-256(cookie value) and ≠ raw value
  - register (`POST /api/user`) also sets the cookie
  - neither the login body nor `GET /api/user?search=` contains `refreshTokens`
  - 11 logins keep at most 10 stored entries
  - CORS: `Origin: http://localhost:3000` → `Access-Control-Allow-Origin: http://localhost:3000` + `Access-Control-Allow-Credentials: true`; `Origin: https://evil.example` → no `Access-Control-Allow-Origin`
- [ ] **Step 2: Run** `npm test -- authSession` — Expected: FAIL (no cookie set).
- [ ] **Step 3: Implement** token service, model field, controller changes, CORS, cookie-parser, helper update.
- [ ] **Step 4: Run** `npm test` — Expected: all suites PASS (existing suites keep passing with the new `tokenFor`).
- [ ] **Step 5: Commit** `VIB-24: Issue 15m access token + httpOnly refresh cookie on login/register`

## Task 2: `POST /api/user/refresh` (rotation) and `POST /api/user/logout`

**Files:**
- Create: `backend/controllers/authController.ts`
- Modify: `backend/routes/userRoutes.ts`, `backend/services/tokenService.ts`
- Test: `backend/__tests__/authRefresh.test.ts`

**Interfaces:**
- Consumes: Task 1 `issueSession`, `rotateSession`, `revokeSession`, `clearRefreshCookie`, `sendAuthResponse`.
- Produces: `refreshSession`, `logoutUser` handlers.

- [ ] **Step 1: Write the failing test** — `authRefresh.test.ts`:
  - valid cookie → 200, body has user fields + new access `token`, new `vibe_rt` cookie ≠ old
  - after rotation, the new cookie refreshes again (200)
  - the old cookie within the grace window → 200; after the grace (entry `expiresAt` set to the past) → 401 and cookie cleared
  - no cookie → 401; garbage cookie → 401; an access token used as the cookie → 401; a valid-signature refresh token never stored → 401
  - logout → 200, `Set-Cookie` clears `vibe_rt`, entry removed, the old cookie then refreshes → 401
  - logout with no cookie → 200
  - logout of one session leaves another session of the same user working
- [ ] **Step 2: Run** `npm test -- authRefresh` — Expected: FAIL (404 on `/refresh`).
- [ ] **Step 3: Implement** handlers + routes; rotation uses atomic updates (`$min` on the matched entry's `expiresAt`, then prune + `$push` with `$slice: -10`).
- [ ] **Step 4: Run** `npm test` — Expected: all PASS.
- [ ] **Step 5: Commit** `VIB-24: Refresh-token rotation and logout endpoints`

## Task 3: `protect` accepts only short-lived access tokens

**Files:**
- Modify: `backend/Middleware/authMiddleware.ts`
- Test: `backend/__tests__/authMiddleware.test.ts`

**Interfaces:**
- Consumes: Task 1 `verifyAccessToken`.

- [ ] **Step 1: Write the failing test** — against `GET /api/chat`:
  - valid access token → 200
  - refresh token as Bearer → 401
  - legacy token `jwt.sign({ id }, JWT_SECRET, { expiresIn: "30d" })` → 401
  - expired access token → 401
  - access token for a deleted user → 401
  - no header → 401
- [ ] **Step 2: Run** `npm test -- authMiddleware` — Expected: FAIL on refresh/legacy/deleted-user cases.
- [ ] **Step 3: Implement**: verify via `verifyAccessToken`, load user, 401 if missing, call `next()` outside the try.
- [ ] **Step 4: Run** `npm test` — Expected: all PASS.
- [ ] **Step 5: Commit** `VIB-24: authMiddleware rejects refresh, legacy and orphaned tokens`

## Task 4: Google OAuth (backend)

**Files:**
- Create: `backend/config/passport.ts`, `backend/services/googleAuthService.ts`
- Modify: `backend/models/userModel.ts` (`googleId` sparse unique, `oauthCode` select false), `backend/controllers/authController.ts`, `backend/routes/userRoutes.ts`, `backend/app.ts` (`passport.initialize()`)
- Modify: `package.json` (`passport`, `passport-google-oauth20`, `@types/passport`, `@types/passport-google-oauth20`)
- Test: `backend/__tests__/googleAuth.test.ts`, `backend/__tests__/googleAuthRoutes.test.ts`

**Interfaces:**
- Consumes: Task 1 `issueSession`, `sendAuthResponse`, `allowedOrigins`.
- Produces: `isGoogleAuthConfigured()`, `configurePassport()`, `findOrCreateGoogleUser(input: { googleId, email, emailVerified, name, picture? })`, `createOAuthCode(userId): Promise<string>`, `consumeOAuthCode(code): Promise<IUser | null>`; handlers `googleAuthStart`, `googleAuthCallback`, `googleExchange`.

- [ ] **Step 1: Write the failing tests**
  - `googleAuth.test.ts` (service): new user created with googleId/picture and a password that is not empty; existing googleId → same user; existing email + verified → linked; existing email + unverified → throws; code consumed once (second → null); expired code → null; exchange route with valid code → 200 + cookie + token, replay → 401, missing code → 400.
  - `googleAuthRoutes.test.ts`: without env → `/auth/google` 302 to `http://localhost:3000/?authError=google_unavailable`; with `GOOGLE_CLIENT_ID/SECRET` set before importing the app → 302 to `accounts.google.com` with `client_id` and `scope=profile%20email`; callback with `passport.authenticate` stubbed to yield a user → 302 to `http://localhost:3000/?oauthCode=<code>` and that code exchanges; stubbed failure → `?authError=google_failed`.
- [ ] **Step 2: Run** `npm test -- google` — Expected: FAIL (modules missing).
- [ ] **Step 3: Install deps and implement.**
- [ ] **Step 4: Run** `npm test` and `npx tsc -p backend --noEmit` — Expected: all PASS, no type errors.
- [ ] **Step 5: Commit** `VIB-24: Google OAuth login with one-time code exchange`

## Task 5: Frontend `apiClient` — credentials, single-flight refresh, retry on 401

**Files:**
- Modify: `frontend/package.json` (`jest.transformIgnorePatterns` so CRA Jest transforms axios)
- Modify: `frontend/src/store/api/apiClient.ts`
- Test: `frontend/src/store/api/apiClient.test.ts`

**Interfaces:**
- Produces: `refreshSession(): Promise<User>` (single-flight, sets `authStore.user`), `setSessionExpiredHandler(fn)`, `apiClient.defaults.withCredentials === true`.

- [ ] **Step 1: Write the failing test** (axios `adapter` stub, no network):
  - attaches `Authorization: Bearer <token>` from the store
  - 401 → one `POST /api/user/refresh` → original retried with the new token; store updated
  - three concurrent 401s → exactly one refresh
  - refresh answers 401 → session-expired handler called once; original request rejects
  - 401 from `/api/user/login` → no refresh
  - retried request answering 401 again → no second refresh
- [ ] **Step 2: Run** `CI=true npx react-scripts test --watchAll=false src/store/api/apiClient.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the full frontend suite + `npx tsc --noEmit -p .` + `npm run lint` — Expected: PASS / clean.
- [ ] **Step 5: Commit** `VIB-24: apiClient refreshes the access token once and retries on 401`

## Task 6: Frontend in-memory auth + session restore/logout

**Files:**
- Modify: `frontend/src/store/authStore.ts` (drop `persist`), `frontend/src/store/session.ts`, `frontend/src/store/api/userApi.ts` (`logoutUser`, `exchangeGoogleCode`), `frontend/src/App.tsx` (restore once), `frontend/src/Pages/Chatpage.tsx` (redirect when signed out), `frontend/src/components/miscellaneous/SideDrawer.tsx` (`logoutSession`), `frontend/src/hooks/useAuthMutations.ts` (comments)
- Test: `frontend/src/store/session.test.ts`, `frontend/src/store/authStore.test.ts`

**Interfaces:**
- Consumes: Task 5 `refreshSession`, `setSessionExpiredHandler`.
- Produces: `restoreSession()`, `endSession()`, `logoutSession()`, `completeGoogleLogin(code): Promise<User>`.

- [ ] **Step 1: Write the failing tests**
  - `authStore`: `setUser` writes nothing to localStorage
  - `restoreSession`: success → user set, `isAuthLoading` false; failure → user null, `isAuthLoading` false; legacy `vibe-auth` key removed; registers the expired handler
  - `endSession`: socket disconnected, user null, selected chat + query cache cleared
  - `logoutSession`: calls `logoutUser`, then ends the session — also when `logoutUser` rejects
  - `completeGoogleLogin`: exchanges the code and sets the user
- [ ] **Step 2: Run** frontend tests — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** full frontend suite + tsc + lint — Expected: PASS / clean.
- [ ] **Step 5: Commit** `VIB-24: Keep the access token in memory and restore the session from the refresh cookie`

## Task 7: Google button + OAuth return handling on Homepage

**Files:**
- Modify: `frontend/src/Pages/Homepage.tsx`
- Test: `frontend/src/Pages/Homepage.test.tsx`

**Interfaces:**
- Consumes: Task 6 `completeGoogleLogin`.

- [ ] **Step 1: Write the failing test** (ChakraProvider + MemoryRouter, `session` mocked):
  - renders a "Continue with Google" link to `${API_BASE_URL}/api/user/auth/google`
  - `/?oauthCode=abc` → `completeGoogleLogin("abc")` called once
  - `/?authError=google_unavailable` → toast text mentions Google sign-in not being available
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** full frontend suite + tsc + lint + `npm run build` — Expected: PASS / clean / build succeeds.
- [ ] **Step 5: Commit** `VIB-24: Continue with Google on the homepage`

## Task 8: End-to-end verification (no commit)

Real backend (port 4001, throwaway DB, `ACCESS_TOKEN_TTL=10s`) + CRA dev server with a temporary local `API_BASE_URL`, driven by Playwright MCP plus a node second-user script:
1. Login → localStorage holds no token; `vibe_rt` cookie is `httpOnly`.
2. Reload → still signed in (restored from cookie).
3. Wait past 10 s → send a message: network shows `401` → `/refresh` → retry `200`; message delivered to user 2 in real time; user 2's reply arrives.
4. Logout → cookie gone; reload stays on `/`; `POST /refresh` → 401.
5. Google, unconfigured → back on `/` with the error toast. Configured with a dummy client id → browser lands on `accounts.google.com` with the right `client_id`/`redirect_uri`. Code exchange: code created in DB → `/?oauthCode=…` → `/chats` signed in.
6. Revert the `API_BASE_URL` override, drop the DB, delete `.playwright-mcp/`.

import request from "supertest";
import passport from "passport";
import app from "../app";
import { findOrCreateGoogleUser } from "../services/googleAuthService";

// Google credentials are read per request, so each block just sets the env.
const setGoogleEnv = (configured: boolean) => {
  if (configured) {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  } else {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  }
};

afterAll(() => setGoogleEnv(false));

const NONCE = "browser-nonce-0123456789";

const stateCookieOf = (res: request.Response): string => {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const cookie = cookies.find((c) => c.startsWith("vibe_oauth="));
  if (!cookie) throw new Error("no vibe_oauth cookie");
  return cookie;
};

/** Starts the flow like a browser would; returns the state Google will echo back and the cookie. */
const startFlow = async () => {
  const res = await request(app).get(`/api/user/auth/google?nonce=${NONCE}`);
  const state = new URL(res.headers.location).searchParams.get("state")!;
  return { res, state, cookie: stateCookieOf(res).split(";")[0] };
};

const stubGoogleResult = (err: unknown, user: unknown) =>
  jest.spyOn(passport, "authenticate").mockImplementation(
    ((_strategy: string, _options: unknown, callback: (err: unknown, user: unknown) => void) =>
      () => callback(err, user)) as unknown as typeof passport.authenticate
  );

describe("Google OAuth when not configured", () => {
  it("sends the browser back to the frontend with an error", async () => {
    setGoogleEnv(false);
    const res = await request(app).get("/api/user/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000/?authError=google_unavailable");
  });
});

describe("Google OAuth when configured", () => {
  afterEach(() => jest.restoreAllMocks());

  it("redirects to Google's consent screen with a state bound to this browser", async () => {
    setGoogleEnv(true);
    const { res, state } = await startFlow();

    expect(state).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    const cookie = stateCookieOf(res);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/api\/user\/auth\/google/);
    expect(cookie).toMatch(/SameSite=Lax/);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.hostname).toBe("accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("scope")).toBe("profile email");
    expect(location.searchParams.get("redirect_uri")).toMatch(/\/api\/user\/auth\/google\/callback$/);
  });

  it("refuses to start without a browser nonce", async () => {
    setGoogleEnv(true);
    const res = await request(app).get("/api/user/auth/google");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000/?authError=google_failed");
  });

  it("hands the starting browser a one-time code plus its nonce", async () => {
    setGoogleEnv(true);
    const { state, cookie } = await startFlow();
    const user = await findOrCreateGoogleUser({
      googleId: "g-1", email: "gina@gmail.com", emailVerified: true, name: "Gina",
    });
    stubGoogleResult(null, user);

    const res = await request(app)
      .get(`/api/user/auth/google/callback?code=from-google&state=${state}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin).toBe("http://localhost:3000");
    expect(location.searchParams.get("nonce")).toBe(NONCE);
    const code = location.searchParams.get("oauthCode");
    expect(code).toBeTruthy();

    const exchange = await request(app).post("/api/user/auth/google/exchange").send({ code });
    expect(exchange.status).toBe(200);
    expect(exchange.body.email).toBe("gina@gmail.com");
  });

  it("rejects a callback opened in a browser that did not start the flow (login CSRF)", async () => {
    setGoogleEnv(true);
    const { state } = await startFlow(); // attacker's browser
    const user = await findOrCreateGoogleUser({
      googleId: "g-1", email: "attacker@gmail.com", emailVerified: true, name: "Mallory",
    });
    const authenticate = stubGoogleResult(null, user);

    // victim opens the attacker's callback link: no state cookie
    const res = await request(app).get(`/api/user/auth/google/callback?code=from-google&state=${state}`);

    expect(res.headers.location).toBe("http://localhost:3000/?authError=google_failed");
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("rejects a callback whose state does not match the cookie", async () => {
    setGoogleEnv(true);
    const { cookie } = await startFlow();
    const authenticate = stubGoogleResult(null, {});

    const res = await request(app)
      .get("/api/user/auth/google/callback?code=from-google&state=someone-elses-state")
      .set("Cookie", cookie);

    expect(res.headers.location).toBe("http://localhost:3000/?authError=google_failed");
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("reports a failed Google sign-in to the frontend", async () => {
    setGoogleEnv(true);
    const { state, cookie } = await startFlow();
    stubGoogleResult(new Error("denied"), false);

    const res = await request(app)
      .get(`/api/user/auth/google/callback?error=access_denied&state=${state}`)
      .set("Cookie", cookie);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000/?authError=google_failed");
  });
});

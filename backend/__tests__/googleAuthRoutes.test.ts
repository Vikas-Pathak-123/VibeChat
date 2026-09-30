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

  it("redirects to Google's consent screen", async () => {
    setGoogleEnv(true);
    const res = await request(app).get("/api/user/auth/google");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.hostname).toBe("accounts.google.com");
    expect(location.searchParams.get("client_id")).toBe("test-client-id");
    expect(location.searchParams.get("scope")).toBe("profile email");
    expect(location.searchParams.get("redirect_uri")).toMatch(/\/api\/user\/auth\/google\/callback$/);
  });

  it("hands the frontend a one-time code that exchanges for a session", async () => {
    setGoogleEnv(true);
    const user = await findOrCreateGoogleUser({
      googleId: "g-1", email: "gina@gmail.com", emailVerified: true, name: "Gina",
    });
    jest.spyOn(passport, "authenticate").mockImplementation(
      ((_strategy: string, _options: unknown, callback: (err: unknown, user: unknown) => void) =>
        () => callback(null, user)) as unknown as typeof passport.authenticate
    );

    const res = await request(app).get("/api/user/auth/google/callback?code=from-google");

    expect(res.status).toBe(302);
    const location = new URL(res.headers.location);
    expect(location.origin).toBe("http://localhost:3000");
    const code = location.searchParams.get("oauthCode");
    expect(code).toBeTruthy();

    const exchange = await request(app).post("/api/user/auth/google/exchange").send({ code });
    expect(exchange.status).toBe(200);
    expect(exchange.body.email).toBe("gina@gmail.com");
  });

  it("reports a failed Google sign-in to the frontend", async () => {
    setGoogleEnv(true);
    jest.spyOn(passport, "authenticate").mockImplementation(
      ((_strategy: string, _options: unknown, callback: (err: unknown, user: unknown) => void) =>
        () => callback(new Error("denied"), false)) as unknown as typeof passport.authenticate
    );

    const res = await request(app).get("/api/user/auth/google/callback?error=access_denied");

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000/?authError=google_failed");
  });
});

import crypto from "crypto";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app";
import User from "../models/userModel";
import { createUser, tokenFor } from "./helpers";

const getRefreshCookie = (res: request.Response): string | undefined => {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  return cookies.find((c) => c.startsWith("vibe_rt="));
};

const cookieValue = (setCookie: string): string =>
  decodeURIComponent(setCookie.split(";")[0].slice("vibe_rt=".length));

const sha256 = (value: string): string =>
  crypto.createHash("sha256").update(value).digest("hex");

const login = (email: string) =>
  request(app).post("/api/user/login").send({ email, password: "password123" });

describe("session issued on login/register", () => {
  it("sets an httpOnly refresh cookie scoped to /api/user for 30 days", async () => {
    await createUser("alice@test.com", "Alice");
    const res = await login("alice@test.com");

    expect(res.status).toBe(200);
    const cookie = getRefreshCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Path=\/api\/user/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const maxAge = Number(/Max-Age=(\d+)/.exec(cookie!)![1]);
    expect(maxAge).toBe(30 * 24 * 60 * 60);
  });

  it("returns a 15-minute access token in the body", async () => {
    await createUser("alice@test.com", "Alice");
    const res = await login("alice@test.com");

    const payload = jwt.decode(res.body.token) as jwt.JwtPayload;
    expect(payload.type).toBe("access");
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
  });

  it("stores only the SHA-256 hash of the refresh token", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const res = await login("alice@test.com");
    const raw = cookieValue(getRefreshCookie(res)!);

    const stored = await User.findById(alice._id).select("+refreshTokens");
    expect(stored!.refreshTokens).toHaveLength(1);
    expect(stored!.refreshTokens[0].tokenHash).toBe(sha256(raw));
    expect(stored!.refreshTokens[0].tokenHash).not.toBe(raw);
  });

  it("sets the refresh cookie on register too", async () => {
    const res = await request(app)
      .post("/api/user")
      .send({ name: "Bob", email: "bob@test.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(getRefreshCookie(res)).toBeDefined();
    expect((jwt.decode(res.body.token) as jwt.JwtPayload).type).toBe("access");
  });

  it("never exposes stored refresh tokens in responses", async () => {
    await createUser("alice@test.com", "Alice");
    const bob = await createUser("bob@test.com", "Bob");
    const res = await login("alice@test.com");
    await login("bob@test.com");

    expect(res.body.refreshTokens).toBeUndefined();
    const search = await request(app)
      .get("/api/user?search=bob")
      .set("Authorization", `Bearer ${tokenFor(await createUser("carol@test.com"))}`);
    expect(search.status).toBe(200);
    const found = search.body.find((u: { _id: string }) => u._id === bob._id.toString());
    expect(found).toBeDefined();
    expect(found.refreshTokens).toBeUndefined();
  });

  it("keeps at most 10 sessions per user", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    for (let i = 0; i < 11; i++) await login("alice@test.com");

    const stored = await User.findById(alice._id).select("+refreshTokens");
    expect(stored!.refreshTokens).toHaveLength(10);
  });
});

describe("CORS", () => {
  it("allows the configured frontend origin with credentials", async () => {
    const res = await request(app).get("/").set("Origin", "http://localhost:3000");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("does not allow unknown origins", async () => {
    const res = await request(app).get("/").set("Origin", "https://evil.example");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

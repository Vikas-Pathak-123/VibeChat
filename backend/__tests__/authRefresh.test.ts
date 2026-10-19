import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app";
import User from "../models/userModel";
import { hashToken, generateAccessToken } from "../services/tokenService";
import { createUser } from "./helpers";

const refreshCookieOf = (res: request.Response): string | undefined => {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const cookie = cookies.find((c) => c.startsWith("vibe_rt="));
  return cookie?.split(";")[0];
};

const rawOf = (cookiePair: string): string => decodeURIComponent(cookiePair.slice("vibe_rt=".length));

const loginCookie = async (email: string): Promise<string> => {
  const res = await request(app).post("/api/user/login").send({ email, password: "password123" });
  return refreshCookieOf(res)!;
};

const refresh = (cookie?: string) => {
  const req = request(app).post("/api/user/refresh");
  return cookie ? req.set("Cookie", cookie) : req;
};

const expectCleared = (res: request.Response) => {
  const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
  const cleared = cookies.find((c) => c.startsWith("vibe_rt="));
  expect(cleared).toMatch(/^vibe_rt=;/);
  expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970/);
};

describe("POST /api/user/refresh", () => {
  it("issues a new access token and rotates the refresh cookie", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const cookie = await loginCookie("alice@test.com");

    const res = await refresh(cookie);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: alice._id.toString(), name: "Alice", email: "alice@test.com" });
    expect((jwt.decode(res.body.token) as jwt.JwtPayload).type).toBe("access");
    const rotated = refreshCookieOf(res);
    expect(rotated).toBeDefined();
    expect(rotated).not.toBe(cookie);
    expect((await refresh(rotated)).status).toBe(200);
  });

  it("accepts the previous token during the grace window, then rejects it", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const cookie = await loginCookie("alice@test.com");
    await refresh(cookie); // rotates

    expect((await refresh(cookie)).status).toBe(200);

    await User.updateOne(
      { _id: alice._id, "refreshTokens.tokenHash": hashToken(rawOf(cookie)) },
      { $set: { "refreshTokens.$.expiresAt": new Date(Date.now() - 1000) } }
    );
    const res = await refresh(cookie);
    expect(res.status).toBe(401);
    expectCleared(res);
  });

  it("rejects a missing cookie", async () => {
    expect((await refresh()).status).toBe(401);
  });

  it("rejects a garbage cookie and clears it", async () => {
    const res = await refresh("vibe_rt=not-a-jwt");
    expect(res.status).toBe(401);
    expectCleared(res);
  });

  it("rejects an access token presented as the refresh cookie", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    expect((await refresh(`vibe_rt=${generateAccessToken(alice._id)}`)).status).toBe(401);
  });

  it("rejects a validly signed refresh token that was never issued", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const forged = jwt.sign({ id: alice._id.toString(), type: "refresh", jti: "x" }, process.env.JWT_SECRET as string, {
      expiresIn: "30d",
    });
    expect((await refresh(`vibe_rt=${forged}`)).status).toBe(401);
  });
});

describe("POST /api/user/logout", () => {
  it("revokes the session and clears the cookie", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const cookie = await loginCookie("alice@test.com");

    const res = await request(app).post("/api/user/logout").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expectCleared(res);
    const stored = await User.findById(alice._id).select("+refreshTokens");
    expect(stored!.refreshTokens).toHaveLength(0);
    expect((await refresh(cookie)).status).toBe(401);
  });

  it("succeeds without a cookie", async () => {
    expect((await request(app).post("/api/user/logout")).status).toBe(200);
  });

  it("leaves the user's other sessions working", async () => {
    await createUser("alice@test.com", "Alice");
    const laptop = await loginCookie("alice@test.com");
    const phone = await loginCookie("alice@test.com");

    await request(app).post("/api/user/logout").set("Cookie", laptop);

    expect((await refresh(phone)).status).toBe(200);
  });
});

import request from "supertest";
import app from "../app";
import User from "../models/userModel";
import {
  findOrCreateGoogleUser,
  createOAuthCode,
  consumeOAuthCode,
} from "../services/googleAuthService";
import { createUser, tokenFor } from "./helpers";

const googleProfile = {
  googleId: "google-123",
  email: "gina@gmail.com",
  emailVerified: true,
  name: "Gina",
  picture: "https://lh3.googleusercontent.com/gina.png",
};

describe("findOrCreateGoogleUser", () => {
  it("creates a new user with the Google id, photo and an unusable password", async () => {
    const user = await findOrCreateGoogleUser(googleProfile);

    const stored = await User.findById(user._id).select("+googleId");
    expect(stored!.googleId).toBe("google-123");
    expect(stored!.email).toBe("gina@gmail.com");
    expect(stored!.name).toBe("Gina");
    expect(stored!.picture).toBe(googleProfile.picture);
    expect(stored!.password).toBeTruthy();
    expect(await stored!.matchPassword("")).toBe(false);
  });

  it("returns the same user on a later Google sign-in", async () => {
    const first = await findOrCreateGoogleUser(googleProfile);
    const second = await findOrCreateGoogleUser({ ...googleProfile, name: "Gina Renamed" });

    expect(second._id.toString()).toBe(first._id.toString());
    expect(await User.countDocuments()).toBe(1);
  });

  it("links an existing email account when Google verified the email", async () => {
    const existing = await createUser("gina@gmail.com", "Gina Email");

    const user = await findOrCreateGoogleUser(googleProfile);

    expect(user._id.toString()).toBe(existing._id.toString());
    expect((await User.findById(existing._id).select("+googleId"))!.googleId).toBe("google-123");
  });

  it("locks out whoever pre-registered the address when the verified owner links it", async () => {
    // Registration never proves email ownership: the password (and any sessions)
    // may belong to someone else, so linking resets both.
    await createUser("gina@gmail.com", "Squatter");
    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "gina@gmail.com", password: "password123" });
    const squatterCookie = ([] as string[])
      .concat(login.headers["set-cookie"])
      .find((c) => c.startsWith("vibe_rt="))!
      .split(";")[0];

    await findOrCreateGoogleUser(googleProfile);

    const relogin = await request(app)
      .post("/api/user/login")
      .send({ email: "gina@gmail.com", password: "password123" });
    expect(relogin.status).toBe(400);
    expect((await request(app).post("/api/user/refresh").set("Cookie", squatterCookie)).status).toBe(401);
  });

  it("refuses to link an existing email account when the email is unverified", async () => {
    const existing = await createUser("gina@gmail.com", "Gina Email");

    await expect(findOrCreateGoogleUser({ ...googleProfile, emailVerified: false })).rejects.toThrow();
    expect((await User.findById(existing._id).select("+googleId"))!.googleId).toBeUndefined();
  });
});

describe("one-time OAuth codes", () => {
  it("can be consumed exactly once", async () => {
    const user = await findOrCreateGoogleUser(googleProfile);
    const code = await createOAuthCode(user._id);

    expect((await consumeOAuthCode(code))!._id.toString()).toBe(user._id.toString());
    expect(await consumeOAuthCode(code)).toBeNull();
  });

  it("expire after 60 seconds", async () => {
    const user = await findOrCreateGoogleUser(googleProfile);
    const code = await createOAuthCode(user._id);
    await User.updateOne({ _id: user._id }, { $set: { "oauthCode.expiresAt": new Date(Date.now() - 1) } });

    expect(await consumeOAuthCode(code)).toBeNull();
  });

  it("are never exposed with the user", async () => {
    const user = await findOrCreateGoogleUser(googleProfile);
    await createOAuthCode(user._id);

    const plain = await User.findById(user._id).lean();
    expect(plain).not.toHaveProperty("oauthCode");
  });
});

describe("user privacy", () => {
  it("never exposes googleId or password hashes to other users", async () => {
    const gina = await findOrCreateGoogleUser(googleProfile);
    const alice = await createUser("alice@test.com", "Alice");
    const auth = { Authorization: `Bearer ${tokenFor(alice)}` };

    const search = await request(app).get("/api/user?search=gina").set(auth);
    expect(search.status).toBe(200);
    expect(search.body).toHaveLength(1);
    expect(search.body[0]).not.toHaveProperty("googleId");
    expect(search.body[0]).not.toHaveProperty("password");

    const chat = await request(app).post("/api/chat").set(auth).send({ userId: gina._id });
    expect(chat.status).toBe(200);
    for (const u of chat.body.users) expect(u).not.toHaveProperty("googleId");
  });
});

describe("POST /api/user/auth/google/exchange", () => {
  it("turns a valid code into a session, once", async () => {
    const user = await findOrCreateGoogleUser(googleProfile);
    const code = await createOAuthCode(user._id);

    const res = await request(app).post("/api/user/auth/google/exchange").send({ code });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ _id: user._id.toString(), email: "gina@gmail.com" });
    expect(res.body.token).toBeTruthy();
    const cookies = ([] as string[]).concat(res.headers["set-cookie"] ?? []);
    expect(cookies.some((c) => c.startsWith("vibe_rt=") && /HttpOnly/.test(c))).toBe(true);

    const replay = await request(app).post("/api/user/auth/google/exchange").send({ code });
    expect(replay.status).toBe(401);
  });

  it("rejects a missing code", async () => {
    const res = await request(app).post("/api/user/auth/google/exchange").send({});
    expect(res.status).toBe(400);
  });
});

import request from "supertest";
import app from "../app";
import User from "../models/userModel";
import {
  findOrCreateGoogleUser,
  createOAuthCode,
  consumeOAuthCode,
} from "../services/googleAuthService";
import { createUser } from "./helpers";

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

    const stored = await User.findById(user._id);
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
    expect((await User.findById(existing._id))!.googleId).toBe("google-123");
    // email/password login keeps working
    expect(await (await User.findById(existing._id))!.matchPassword("password123")).toBe(true);
  });

  it("refuses to link an existing email account when the email is unverified", async () => {
    const existing = await createUser("gina@gmail.com", "Gina Email");

    await expect(findOrCreateGoogleUser({ ...googleProfile, emailVerified: false })).rejects.toThrow();
    expect((await User.findById(existing._id))!.googleId).toBeUndefined();
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

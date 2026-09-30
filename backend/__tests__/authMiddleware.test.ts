import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../app";
import User from "../models/userModel";
import { createUser, tokenFor } from "./helpers";

const getChats = (token?: string) => {
  const req = request(app).get("/api/chat");
  return token ? req.set("Authorization", `Bearer ${token}`) : req;
};

describe("protect middleware", () => {
  it("accepts a valid access token", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    expect((await getChats(tokenFor(alice))).status).toBe(200);
  });

  it("rejects a refresh token used as a bearer token", async () => {
    await createUser("alice@test.com", "Alice");
    const login = await request(app)
      .post("/api/user/login")
      .send({ email: "alice@test.com", password: "password123" });
    const cookie = ([] as string[]).concat(login.headers["set-cookie"]).find((c) => c.startsWith("vibe_rt="))!;
    const refreshToken = decodeURIComponent(cookie.split(";")[0].slice("vibe_rt=".length));

    expect((await getChats(refreshToken)).status).toBe(401);
  });

  it("rejects a legacy 30-day token without a type claim", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const legacy = jwt.sign({ id: alice._id }, process.env.JWT_SECRET as string, { expiresIn: "30d" });
    expect((await getChats(legacy)).status).toBe(401);
  });

  it("rejects an expired access token", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const expired = jwt.sign(
      { id: alice._id.toString(), type: "access", exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET as string
    );
    expect((await getChats(expired)).status).toBe(401);
  });

  it("rejects a token for a user that no longer exists", async () => {
    const alice = await createUser("alice@test.com", "Alice");
    const token = tokenFor(alice);
    await User.deleteOne({ _id: alice._id });
    expect((await getChats(token)).status).toBe(401);
  });

  it("rejects a request without a token", async () => {
    expect((await getChats()).status).toBe(401);
  });
});
